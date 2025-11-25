const dgram = require('dgram');
const fs = require('fs');
const path = require('path');

// Protocol Constants
const DATA_SIZE = 1024;
const HEADER_SIZE = 20;
const PACKET_SIZE = HEADER_SIZE + DATA_SIZE;

const FLAG_SYN  = 0x01;
const FLAG_ACK  = 0x02;
const FLAG_FIN  = 0x04;
const FLAG_DATA = 0x08;

// CRC32 Table
const crcTable = new Int32Array(256);
(function() {
  let c;
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[n] = c;
  }
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

class UdpClientWin {
  constructor(host, port, logCb) {
    this.host = host;
    this.port = port;
    this.sock = dgram.createSocket('udp4');
    this.log = logCb || (() => {});
    this.metricsCb = null;
  }

  close() {
    try { this.sock.close(); } catch (_) {}
  }

  createPacket(seqNum, ackNum, flags, dataBuf) {
    const pkt = Buffer.alloc(PACKET_SIZE);
    pkt.writeUInt32LE(seqNum, 0);
    pkt.writeUInt32LE(ackNum, 4);
    pkt.writeUInt16LE(10, 8); // Window Size
    const dataLen = dataBuf ? dataBuf.length : 0;
    pkt.writeUInt16LE(dataLen, 10);
    pkt.writeUInt8(flags, 16);
    // Reserved 3 bytes at 17, 18, 19 are 0
    
    if (dataBuf) {
      dataBuf.copy(pkt, HEADER_SIZE);
    }

    // Calculate CRC32 (header + data)
    // We need to calculate CRC over the whole packet with checksum field = 0
    pkt.writeUInt32LE(0, 12);
    const checksum = crc32(pkt.subarray(0, HEADER_SIZE + dataLen));
    pkt.writeUInt32LE(checksum, 12);
    
    return pkt.subarray(0, HEADER_SIZE + dataLen);
  }

  parsePacket(buf) {
    if (buf.length < HEADER_SIZE) return null;
    
    const seqNum = buf.readUInt32LE(0);
    const ackNum = buf.readUInt32LE(4);
    const winSize = buf.readUInt16LE(8);
    const dataLen = buf.readUInt16LE(10);
    const checksum = buf.readUInt32LE(12);
    const flags = buf.readUInt8(16);
    
    // Verify CRC
    const tempBuf = Buffer.from(buf);
    tempBuf.writeUInt32LE(0, 12);
    const calcCrc = crc32(tempBuf.subarray(0, HEADER_SIZE + dataLen));
    
    if (calcCrc !== checksum) {
      this.log(`CRC Error: expected ${checksum.toString(16)}, got ${calcCrc.toString(16)}`);
      return null;
    }

    return {
      seqNum, ackNum, winSize, dataLen, flags,
      data: buf.subarray(HEADER_SIZE, HEADER_SIZE + dataLen)
    };
  }

  sendPacket(pkt) {
    return new Promise((resolve, reject) => {
      this.sock.send(pkt, this.port, this.host, (err) => {
        if (err) reject(err); else resolve();
      });
    });
  }

  recvOnce(timeoutMs = 2000) {
    return new Promise((resolve, reject) => {
      const onMsg = (msg) => {
        cleanup();
        const parsed = this.parsePacket(msg);
        if (parsed) resolve(parsed);
        else reject(new Error('Invalid Packet')); // Or ignore?
      };
      const onErr = (err) => { cleanup(); reject(err); };
      const cleanup = () => {
        clearTimeout(timer);
        this.sock.removeListener('message', onMsg);
        this.sock.removeListener('error', onErr);
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout'));
      }, timeoutMs);
      this.sock.once('message', onMsg);
      this.sock.once('error', onErr);
    });
  }

  async list() {
    const cmd = Buffer.from('ls');
    const pkt = this.createPacket(0, 0, FLAG_SYN, cmd);
    await this.sendPacket(pkt);
    
    try {
      const res = await this.recvOnce();
      if (res.flags & FLAG_DATA) {
        const text = res.data.toString('utf8');
        return { ok: true, entries: text.split(/\r?\n/).filter(Boolean) };
      }
    } catch (e) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: 'No response' };
  }

  async delete(filename) {
    const cmd = Buffer.from(`delete ${filename}`);
    const pkt = this.createPacket(0, 0, FLAG_SYN, cmd);
    await this.sendPacket(pkt);
    
    try {
      const res = await this.recvOnce();
      if (res.flags & FLAG_ACK) {
        const code = res.data.readInt32LE(0);
        if (code === 1) return { ok: true };
        return { ok: false, error: 'Delete failed' };
      }
    } catch (e) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: 'No response' };
  }

  async get(filename, saveToPath) {
    const cmd = Buffer.from(`get ${filename}`);
    const pkt = this.createPacket(0, 0, FLAG_SYN, cmd);
    await this.sendPacket(pkt);

    const fd = fs.openSync(saveToPath, 'w');
    let expectedSeq = 1;
    let bytes = 0;
    let done = false;

    try {
      while (!done) {
        try {
          const res = await this.recvOnce(5000);
          if (res.flags & FLAG_DATA) {
            if (res.seqNum === expectedSeq) {
              fs.writeSync(fd, res.data);
              bytes += res.dataLen;
              this.log(`Received packet ${expectedSeq}, len=${res.dataLen}`);
              
              // Send ACK
              const ack = this.createPacket(0, expectedSeq, FLAG_ACK, null);
              await this.sendPacket(ack);
              
              if (res.flags & FLAG_FIN) done = true;
              expectedSeq++;
            } else if (res.seqNum < expectedSeq) {
              // Re-ACK
              const ack = this.createPacket(0, res.seqNum, FLAG_ACK, null);
              await this.sendPacket(ack);
            }
          }
        } catch (e) {
          this.log('Timeout waiting for packet');
          // Should break or retry?
          // For now, if timeout, maybe server died or finished?
          // Let's break to avoid infinite loop in UI
          break;
        }
      }
    } finally {
      fs.closeSync(fd);
    }
    
    return { ok: true, bytes };
  }

  async put(filePath) {
    const baseName = path.basename(filePath);
    const cmd = Buffer.from(`put ${baseName}`);
    const pkt = this.createPacket(0, 0, FLAG_SYN, cmd);
    await this.sendPacket(pkt);

    const fd = fs.openSync(filePath, 'r');
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const totalPackets = Math.ceil(fileSize / DATA_SIZE);
    
    let nextSeq = 1;
    let base = 1;
    
    // Simple Stop-and-Wait for JS client simplicity (or small window)
    // Let's do Stop-and-Wait to be safe with the async nature
    
    try {
      while (nextSeq <= totalPackets) {
        const buf = Buffer.alloc(DATA_SIZE);
        const read = fs.readSync(fd, buf, 0, DATA_SIZE, (nextSeq - 1) * DATA_SIZE);
        const data = buf.subarray(0, read);
        
        let flags = FLAG_DATA;
        if (nextSeq === totalPackets) flags |= FLAG_FIN;
        
        const dataPkt = this.createPacket(nextSeq, 0, flags, data);
        
        let acked = false;
        let retries = 0;
        
        while (!acked && retries < 10) {
          await this.sendPacket(dataPkt);
          try {
            const res = await this.recvOnce(1000);
            if ((res.flags & FLAG_ACK) && res.ackNum === nextSeq) {
              acked = true;
            }
          } catch (e) {
            retries++;
          }
        }
        
        if (!acked) throw new Error('Failed to send packet ' + nextSeq);
        nextSeq++;
      }
    } finally {
      fs.closeSync(fd);
    }

    return { ok: true, bytes: fileSize };
  }

  async exit() {
    // Just close
    return { ok: true };
  }

  setMetricsCb(cb) {
    this.metricsCb = cb;
  }

  async ping() {
    return { ok: true, rttMs: 10 }; // Dummy
  }
}

module.exports = UdpClientWin;
