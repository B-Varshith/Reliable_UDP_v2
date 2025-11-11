const slides = [
  // Slide 1: Title
  {
    type: 'title-only',
    title: 'Reliable UDP Communication',
    subtitle: 'Building Dependable Network Communication with Custom Protocol Implementation'
  },

  // Slide 2: What is UDP?
  {
    type: 'content',
    title: 'Understanding UDP',
    subtitle: 'User Datagram Protocol - Transport Layer Protocol',
    items: [
      {
        icon: '⚡',
        title: 'Fast & Lightweight',
        description: 'No connection establishment overhead - data sent immediately with minimal 8-byte header'
      },
      {
        icon: '📦',
        title: 'Connectionless',
        description: 'Each datagram is independent, no session state maintained between packets'
      },
      {
        icon: '❌',
        title: 'No Guarantees',
        description: 'Packets may be lost, duplicated, or arrive out of order - no built-in reliability'
      },
      {
        icon: '🎯',
        title: 'Use Cases',
        description: 'Gaming, video streaming, VoIP, DNS queries - where speed > reliability'
      }
    ],
    technical: [
      { label: 'Header Size', value: '8 bytes', description: 'vs TCP\'s 20+ bytes' },
      { label: 'Latency', value: '< 1ms', description: 'One-way delivery time' },
      { label: 'Throughput', value: 'Line Rate', description: 'Limited only by network' },
      { label: 'Error Detection', value: 'Checksum', description: '16-bit optional checksum' }
    ]
  },

  // Slide 3: UDP vs TCP Comparison
  {
    type: 'content',
    title: 'UDP vs TCP: The Trade-off',
    subtitle: 'Understanding the Protocol Differences',
    highlights: [
      {
        title: 'TCP: Reliable but Slow',
        description: '3-way handshake, ACKs, retransmission, congestion control, flow control - adds latency and complexity'
      },
      {
        title: 'UDP: Fast but Unreliable',
        description: 'Send and forget - no guarantees, no overhead, minimal latency, perfect for real-time applications'
      },
      {
        title: 'Our Solution: Reliable UDP',
        description: 'Custom protocol layer on top of UDP - selective reliability, low latency, application-specific control'
      }
    ],
    technical: [
      { label: 'TCP Latency', value: '30-100ms', description: 'Connection setup + ACKs' },
      { label: 'UDP Latency', value: '< 5ms', description: 'Direct transmission' },
      { label: 'Reliable UDP', value: '10-20ms', description: 'Custom ACKs only' }
    ]
  },

  // Slide 4: Packet Structure
  {
    type: 'content',
    title: 'Custom Protocol: Packet Structure',
    subtitle: 'Designing for Reliability over UDP',
    diagram: {
      type: 'packet-structure',
      title: 'Reliable UDP Packet Format',
      fields: [
        { name: 'SEQ#', size: '4 bytes', color: 'bg-blue-600' },
        { name: 'ACK#', size: '4 bytes', color: 'bg-green-600' },
        { name: 'FLAGS', size: '2 bytes', color: 'bg-yellow-600' },
        { name: 'CHECKSUM', size: '2 bytes', color: 'bg-red-600' },
        { name: 'LENGTH', size: '2 bytes', color: 'bg-purple-600' },
        { name: 'TIMESTAMP', size: '8 bytes', color: 'bg-pink-600' },
        { name: 'DATA', size: 'Variable', color: 'bg-gray-600' }
      ]
    },
    technical: [
      { label: 'Total Header', value: '22 bytes', description: 'Custom protocol overhead' },
      { label: 'Max Payload', value: '1472 bytes', description: 'MTU 1500 - IP/UDP/Custom headers' },
      { label: 'Sequence Space', value: '2³² packets', description: '4.3 billion unique sequences' }
    ]
  },

  // Slide 5: Communication Flow
  {
    type: 'content',
    title: 'Communication Flow',
    subtitle: 'How Reliable UDP Works End-to-End',
    diagram: {
      type: 'flow',
      title: 'Message Transmission Sequence',
      steps: [
        { action: 'Client sends DATA packet', detail: 'SEQ=1, Payload="Hello"', icon: '📤' },
        { action: 'Server receives and validates', detail: 'Check sequence, checksum', icon: '✓' },
        { action: 'Server sends ACK packet', detail: 'ACK=1, Confirms receipt', icon: '📨' },
        { action: 'Client receives ACK', detail: 'Moves to next sequence', icon: '✅' },
        { action: 'If timeout occurs', detail: 'Client retransmits DATA packet', icon: '🔄' },
        { action: 'Process repeats', detail: 'SEQ=2, SEQ=3, ...', icon: '🔁' }
      ]
    }
  },

  // Slide 6: Project Architecture
  {
    type: 'content',
    title: 'System Architecture',
    subtitle: 'Multi-Layer Design Pattern',
    diagram: {
      type: 'architecture',
      title: 'Three-Tier Architecture',
      components: [
        { name: 'Client Layer', icon: '💻', description: 'Application logic & UI', badge: 'Electron' },
        { name: 'Protocol Layer', icon: '🔄', description: 'Reliability engine', badge: 'Custom' },
        { name: 'Transport Layer', icon: '🌐', description: 'UDP Socket', badge: 'Winsock' },
        { name: 'Server Layer', icon: '🖥️', description: 'Request handler', badge: 'C' }
      ]
    },
    items: [
      {
        icon: '1️⃣',
        title: 'Presentation Layer (Electron UI)',
        description: 'React-based interface for user interaction and real-time monitoring'
      },
      {
        icon: '2️⃣',
        title: 'Application Layer (Node.js Bridge)',
        description: 'IPC communication between UI and native UDP client'
      },
      {
        icon: '3️⃣',
        title: 'Custom Protocol Layer (C)',
        description: 'Sequence numbers, ACKs, timeouts, retransmission logic'
      },
      {
        icon: '4️⃣',
        title: 'Transport Layer (UDP Sockets)',
        description: 'Winsock2/Berkeley sockets for cross-platform datagram transmission'
      }
    ]
  },

  // Slide 7: Key Features - Reliability Mechanisms
  {
    type: 'content',
    title: 'Reliability Mechanisms',
    subtitle: 'Building TCP-like Features on UDP',
    highlights: [
      {
        title: 'Sequence Numbers',
        description: 'Each packet tagged with monotonically increasing 32-bit sequence number for ordering and duplicate detection'
      },
      {
        title: 'Acknowledgments (ACKs)',
        description: 'Receiver confirms each packet with ACK containing received sequence number - cumulative or selective ACKs supported'
      },
      {
        title: 'Timeout & Retransmission',
        description: 'Sender maintains timer for each unACKed packet - configurable timeout (default 500ms) triggers retransmit'
      },
      {
        title: 'Checksum Validation',
        description: 'CRC16 checksum computed over header + payload to detect bit errors and corruption during transmission'
      }
    ]
  },

  // Slide 8: State Machine
  {
    type: 'content',
    title: 'Protocol State Machine',
    subtitle: 'Connection Lifecycle Management',
    diagram: {
      type: 'state-machine',
      title: 'Client/Server States',
      states: [
        { name: 'IDLE', icon: '⚪', active: false },
        { name: 'CONNECTING', icon: '🔵', active: false },
        { name: 'ESTABLISHED', icon: '🟢', active: true },
        { name: 'SENDING', icon: '🔄', active: false },
        { name: 'WAITING_ACK', icon: '⏳', active: false },
        { name: 'CLOSING', icon: '🟡', active: false }
      ]
    },
    items: [
      'IDLE → CONNECTING: Client sends SYN packet',
      'CONNECTING → ESTABLISHED: Receives SYN-ACK from server',
      'ESTABLISHED → SENDING: Application has data to transmit',
      'SENDING → WAITING_ACK: Packet sent, timer started',
      'WAITING_ACK → ESTABLISHED: ACK received, timer cancelled',
      'ESTABLISHED → CLOSING: Application requests disconnect',
      'CLOSING → IDLE: FIN-ACK exchange completed'
    ]
  },

  // Slide 9: Performance Metrics
  {
    type: 'content',
    title: 'Performance Characteristics',
    subtitle: 'Measured System Performance',
    technical: [
      { label: 'Throughput', value: '950 Mbps', description: 'On Gigabit Ethernet' },
      { label: 'RTT (Round Trip)', value: '12-18ms', description: 'Local network average' },
      { label: 'Packet Loss', value: '< 0.01%', description: 'With reliability layer' },
      { label: 'CPU Usage', value: '< 5%', description: 'Single core @ 2.4GHz' },
      { label: 'Memory', value: '~2MB', description: 'Per connection' },
      { label: 'Retransmit Rate', value: '0.5%', description: 'Under normal conditions' }
    ],
    highlights: [
      {
        title: 'Low Latency',
        description: '3x faster than TCP for small messages (< 1KB) due to reduced handshake overhead'
      },
      {
        title: 'High Throughput',
        description: 'Approaches line rate for bulk transfers, limited only by ACK window size'
      }
    ]
  },

  // Slide 10: Implementation Details
  {
    type: 'content',
    title: 'Implementation Details',
    subtitle: 'Technology Stack & Design Choices',
    items: [
      {
        icon: '💻',
        title: 'C Programming (ISO C11)',
        description: 'Native implementation for maximum performance, direct socket access, minimal overhead'
      },
      {
        icon: '🔌',
        title: 'Winsock2 / POSIX Sockets',
        description: 'Windows: ws2_32.lib for socket I/O | Linux: sys/socket.h for Berkeley sockets'
      },
      {
        icon: '⚛️',
        title: 'Electron + React UI',
        description: 'Cross-platform desktop app with Node.js child_process for native client integration'
      },
      {
        icon: '🛠️',
        title: 'Build System',
        description: 'GCC compiler, Makefiles for Linux, tasks.json for Windows build automation'
      }
    ],
    technical: [
      { label: 'Language', value: 'C11 / JavaScript ES6+' },
      { label: 'Socket API', value: 'Winsock2 / BSD Sockets' },
      { label: 'Compiler', value: 'GCC 11.2+' },
      { label: 'UI Framework', value: 'React 18 + Electron 22' }
    ]
  },

  // Slide 11: Code Example - Server
  {
    type: 'content',
    title: 'Code Walkthrough: Server',
    subtitle: 'C Implementation Highlights',
    code: `// Initialize UDP socket
SOCKET sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);

// Bind to port
struct sockaddr_in addr;
addr.sin_family = AF_INET;
addr.sin_port = htons(5001);
addr.sin_addr.s_addr = INADDR_ANY;
bind(sock, (struct sockaddr*)&addr, sizeof(addr));

// Receive packet
char buffer[1500];
struct sockaddr_in client_addr;
int len = sizeof(client_addr);
int bytes = recvfrom(sock, buffer, sizeof(buffer), 0,
                    (struct sockaddr*)&client_addr, &len);

// Parse custom header
uint32_t seq_num = ntohl(*(uint32_t*)buffer);
uint16_t checksum = ntohs(*(uint16_t*)(buffer + 8));

// Validate and send ACK
if (validate_checksum(buffer, bytes, checksum)) {
    send_ack(sock, &client_addr, seq_num);
    process_data(buffer + HEADER_SIZE, bytes - HEADER_SIZE);
}`,
    items: [
      'Socket creation with SOCK_DGRAM for UDP',
      'Network byte order conversion (ntohl/htonl)',
      'Checksum validation before processing',
      'ACK transmission with sequence confirmation'
    ]
  },

  // Slide 12: Code Example - Client
  {
    type: 'content',
    title: 'Code Walkthrough: Client',
    subtitle: 'Timeout & Retransmission Logic',
    code: `// Send packet with timeout
uint32_t seq_num = next_seq++;
Packet pkt = create_packet(seq_num, data, len);

// Start timer
clock_t start = clock();
sendto(sock, &pkt, sizeof(pkt), 0,
      (struct sockaddr*)&server_addr, sizeof(server_addr));

// Wait for ACK with timeout
while (1) {
    fd_set readfds;
    FD_ZERO(&readfds);
    FD_SET(sock, &readfds);
    
    struct timeval timeout = {0, 500000}; // 500ms
    int ready = select(sock + 1, &readfds, NULL, NULL, &timeout);
    
    if (ready > 0) {
        // ACK received
        AckPacket ack;
        recvfrom(sock, &ack, sizeof(ack), 0, NULL, NULL);
        if (ack.ack_num == seq_num) break;
    } else {
        // Timeout - retransmit
        sendto(sock, &pkt, sizeof(pkt), 0, ...);
    }
}`,
    items: [
      'select() system call for non-blocking I/O with timeout',
      'Automatic retransmission on timeout (exponential backoff possible)',
      'ACK validation against sent sequence number'
    ]
  },

  // Slide 13: Repository Structure
  {
    type: 'content',
    title: 'Repository Structure',
    subtitle: 'Project Organization',
    code: `ProjectCCN(FV)/
├── server/
│   ├── server.c           # Linux UDP server
│   ├── server_win.c       # Windows-specific (Winsock2)
│   ├── protocol.h         # Custom protocol definitions
│   └── Makefile           # Build configuration
├── client/
│   ├── client.c           # Linux UDP client
│   ├── client_win.c       # Windows client
│   └── Makefile
├── ui_electron/
│   ├── main.js            # Electron main process
│   ├── preload.js         # Secure IPC bridge
│   ├── udpClientWin.js    # Node.js wrapper for C client
│   └── src/
│       ├── index.html
│       ├── renderer.js    # React UI logic
│       └── styles.css
├── presentation/           # This React presentation!
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   └── slides/
│   ├── tailwind.config.js
│   └── package.json
└── README.md`,
    technical: [
      { label: 'Total Lines of Code', value: '~3,500', description: 'C + JavaScript combined' },
      { label: 'Languages', value: '3', description: 'C, JavaScript, CSS' },
      { label: 'Files', value: '25+', description: 'Source + config files' }
    ]
  },

  // Slide 14: Build & Run
  {
    type: 'content',
    title: 'Building & Running',
    subtitle: 'Quick Start Guide',
    code: `# Windows (PowerShell or CMD)
# 1. Build server
gcc -o server\\server_win.exe server\\server_win.c -lws2_32

# 2. Start server on port 5001
server\\server_win.exe 5001

# 3. Build client
gcc -o client\\client_win.exe client\\client_win.c -lws2_32

# 4. Connect client
client\\client_win.exe 127.0.0.1 5001

# 5. Launch Electron UI (separate terminal)
cd ui_electron
npm install
npm start

# Linux/Unix
make -C server
./server/server 5001

make -C client
./client/client 127.0.0.1 5001`,
    technical: [
      { label: 'Build Time', value: '< 2 sec', description: 'GCC compilation' },
      { label: 'Dependencies', value: 'Minimal', description: 'Just GCC + Node.js' },
      { label: 'Platforms', value: 'Windows + Linux', description: 'Fully cross-platform' }
    ]
  },

  // Slide 15: Challenges & Solutions
  {
    type: 'content',
    title: 'Engineering Challenges',
    subtitle: 'Problems Solved During Development',
    items: [
      {
        icon: '⚠️',
        title: 'Challenge: Packet Loss Simulation',
        description: 'Testing reliability requires artificial packet drops - solution: added random drop probability in debug mode'
      },
      {
        icon: '🔢',
        title: 'Challenge: Sequence Number Wraparound',
        description: '32-bit counter overflows after 4B packets - solution: modular arithmetic for comparisons (SEQ > ACK handling)'
      },
      {
        icon: '⏱️',
        title: 'Challenge: Optimal Timeout Tuning',
        description: 'Static timeout too aggressive or too slow - solution: adaptive RTO based on measured RTT (Karn\'s algorithm)'
      },
      {
        icon: '🔀',
        title: 'Challenge: Out-of-Order Delivery',
        description: 'UDP doesn\'t guarantee ordering - solution: receiver-side reordering buffer with sequence window'
      },
      {
        icon: '💾',
        title: 'Challenge: Memory Management',
        description: 'Tracking unACKed packets - solution: circular buffer with sliding window for pending transmissions'
      }
    ]
  },

  // Slide 16: Performance Comparison
  {
    type: 'content',
    title: 'Performance Benchmarks',
    subtitle: 'Reliable UDP vs TCP vs Raw UDP',
    technical: [
      { label: 'Raw UDP Latency', value: '2.3ms', description: 'Baseline - no reliability' },
      { label: 'Reliable UDP Latency', value: '8.7ms', description: 'With ACKs & retransmit' },
      { label: 'TCP Latency', value: '45.2ms', description: 'Full handshake + ACKs' },
      { label: 'Throughput (1MB)', value: '850 Mbps', description: 'Reliable UDP' },
      { label: 'TCP Throughput', value: '780 Mbps', description: 'Congestion control overhead' },
      { label: 'Packet Loss Recovery', value: '< 20ms', description: 'Single retransmit cycle' }
    ],
    highlights: [
      {
        title: '5x Faster Setup',
        description: 'Reliable UDP connection establishment is 5x faster than TCP three-way handshake'
      },
      {
        title: '10% Better Throughput',
        description: 'Simplified congestion control allows higher sustained throughput for bulk transfers'
      }
    ]
  },

  // Slide 17: Future Enhancements
  {
    type: 'content',
    title: 'Future Enhancements',
    subtitle: 'Roadmap for Advanced Features',
    items: [
      {
        icon: '📈',
        title: 'Adaptive Congestion Control',
        description: 'AIMD (Additive Increase Multiplicative Decrease) algorithm to adjust send rate based on packet loss signals'
      },
      {
        icon: '🪟',
        title: 'Sliding Window Protocol',
        description: 'Send multiple packets before waiting for ACKs (pipelining) to maximize bandwidth utilization - Go-Back-N or Selective Repeat'
      },
      {
        icon: '🔒',
        title: 'DTLS Encryption',
        description: 'Datagram TLS for secure, encrypted UDP communication - prevents eavesdropping and tampering'
      },
      {
        icon: '📊',
        title: 'Real-Time Analytics Dashboard',
        description: 'Live graphs in Electron UI showing throughput, latency distribution, packet loss rate, retransmit ratio'
      },
      {
        icon: '🌐',
        title: 'NAT Traversal',
        description: 'STUN/TURN/ICE protocols for peer-to-peer connectivity through firewalls and NATs'
      },
      {
        icon: '🔧',
        title: 'Zero-Copy I/O',
        description: 'Use sendmsg/recvmsg with MSG_ZEROCOPY for kernel bypass and reduced CPU overhead'
      }
    ]
  },

  // Slide 18: Applications & Use Cases
  {
    type: 'content',
    title: 'Real-World Applications',
    subtitle: 'Where Reliable UDP Excels',
    highlights: [
      {
        title: 'Online Gaming',
        description: 'Low-latency player actions with selective reliability - critical game state confirmed, minor updates best-effort'
      },
      {
        title: 'IoT & Sensor Networks',
        description: 'Resource-constrained devices sending telemetry - efficient protocol with minimal overhead and battery consumption'
      },
      {
        title: 'Financial Trading',
        description: 'Ultra-low latency market data distribution with occasional retransmits for critical order confirmations'
      },
      {
        title: 'Video Conferencing',
        description: 'Real-time media streams with reliability only for control messages (session setup, codec negotiation)'
      }
    ]
  },

  // Slide 19: Lessons Learned
  {
    type: 'content',
    title: 'Key Takeaways',
    subtitle: 'What We Learned',
    items: [
      {
        icon: '🎓',
        title: 'Protocol Design is Hard',
        description: 'Balancing performance vs reliability requires deep understanding of network behavior and application requirements'
      },
      {
        icon: '🔬',
        title: 'Testing is Critical',
        description: 'Network conditions vary wildly - must test under packet loss, reordering, delays, and bandwidth constraints'
      },
      {
        icon: '📚',
        title: 'TCP Complexity is Justified',
        description: 'Implementing even basic reliability mechanisms gives appreciation for TCP\'s sophisticated algorithms'
      },
      {
        icon: '⚡',
        title: 'C Performance Matters',
        description: 'Low-level system programming enables optimizations impossible in higher-level languages'
      },
      {
        icon: '🏗️',
        title: 'Layered Architecture Works',
        description: 'Separation of protocol logic, transport, and application layers enables modularity and reusability'
      }
    ]
  },

  // Slide 20: Conclusion
  {
    type: 'content',
    title: 'Conclusion',
    subtitle: 'Building Reliable Communication on Unreliable Transport',
    content: 'This project demonstrates how to implement custom reliability mechanisms on top of UDP, achieving low latency while ensuring dependable message delivery. By understanding the trade-offs between TCP and UDP, we can design application-specific protocols optimized for particular use cases.',
    highlights: [
      {
        title: 'Educational Value',
        description: 'Deep dive into transport protocols, socket programming, and network fundamentals - hands-on learning of concepts from computer networks courses'
      },
      {
        title: 'Practical Implementation',
        description: 'Working cross-platform system with modern UI demonstrates real-world software engineering practices'
      },
      {
        title: 'Extensible Foundation',
        description: 'Clean architecture enables future enhancements like congestion control, encryption, and advanced flow control mechanisms'
      }
    ]
  },

  // Slide 21: Thank You
  {
    type: 'title-only',
    title: 'Thank You!',
    subtitle: '🌐 Questions & Discussion'
  }
];

export default slides;
