/***************************************************************************************************
Akamai-Grade CDN Proxy (Edge Node)

Intermediary that caches files from the Origin Server (5001) and serves them to clients.
Listens on Port 5002.
****************************************************************************************************/

#define _WIN32_WINNT 0x0600
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <io.h>
#include <direct.h>

#include "../common/protocol.h"

#pragma comment(lib, "ws2_32.lib")

#define ORIGIN_PORT 5001
#define PROXY_PORT 5002
#define CACHE_DIR "cache"

// Reuse CRC32 from server (duplicated here for simplicity of single-file compilation if needed, or we can link)
static uint32_t crc32_table[256];

void init_crc32() {
    uint32_t polynomial = 0xEDB88320;
    for (uint32_t i = 0; i < 256; i++) {
        uint32_t c = i;
        for (int j = 0; j < 8; j++) {
            if (c & 1) {
                c = polynomial ^ (c >> 1);
            } else {
                c >>= 1;
            }
        }
        crc32_table[i] = c;
    }
}

uint32_t calculate_crc32(const void *buf, size_t size) {
    const uint8_t *p = (const uint8_t *)buf;
    uint32_t crc = 0xFFFFFFFF;
    for (size_t i = 0; i < size; i++) {
        crc = crc32_table[(crc ^ p[i]) & 0xFF] ^ (crc >> 8);
    }
    return ~crc;
}

void send_packet(SOCKET sfd, struct sockaddr_in *addr, int addr_len, Packet *pkt) {
    pkt->header.checksum = 0;
    pkt->header.checksum = calculate_crc32(pkt, sizeof(PacketHeader) + pkt->header.data_len);
    sendto(sfd, (char *)pkt, sizeof(PacketHeader) + pkt->header.data_len, 0, (struct sockaddr *)addr, addr_len);
}

// Fetch file from Origin Server if not in cache
int fetch_from_origin(char *filename) {
    printf("[Proxy] Cache Miss: Fetching %s from Origin...\n", filename);
    
    SOCKET sfd;
    struct sockaddr_in sv_addr;
    
    if ((sfd = socket(AF_INET, SOCK_DGRAM, 0)) == INVALID_SOCKET) return 0;
    
    memset(&sv_addr, 0, sizeof(sv_addr));
    sv_addr.sin_family = AF_INET;
    sv_addr.sin_port = htons(ORIGIN_PORT);
    sv_addr.sin_addr.s_addr = inet_addr("127.0.0.1");

    // Send GET request to Origin
    Packet req;
    memset(&req, 0, sizeof(req));
    sprintf(req.data, "get %s", filename);
    req.header.data_len = strlen(req.data);
    req.header.flags = FLAG_SYN; // Using SYN/Data for command
    send_packet(sfd, &sv_addr, sizeof(sv_addr), &req);

    // Receive file and save to cache
    char cache_path[256];
    sprintf(cache_path, "%s\\%s", CACHE_DIR, filename);
    FILE *fp = fopen(cache_path, "wb");
    if (!fp) {
        closesocket(sfd);
        return 0;
    }

    uint32_t expected_seq = 1;
    Packet pkt;
    Packet ack;
    int success = 0;

    while (1) {
        struct sockaddr_in from_addr;
        int from_len = sizeof(from_addr);
        int len = recvfrom(sfd, (char *)&pkt, sizeof(pkt), 0, (struct sockaddr *)&from_addr, &from_len);
        
        if (len > 0) {
            uint32_t received_crc = pkt.header.checksum;
            pkt.header.checksum = 0;
            if (calculate_crc32(&pkt, sizeof(PacketHeader) + pkt.header.data_len) == received_crc) {
                if (pkt.header.flags & FLAG_DATA) {
                    if (pkt.header.seq_num == expected_seq) {
                        fwrite(pkt.data, 1, pkt.header.data_len, fp);
                        
                        // Send ACK
                        ack.header.seq_num = 0;
                        ack.header.ack_num = expected_seq;
                        ack.header.flags = FLAG_ACK;
                        ack.header.data_len = 0;
                        send_packet(sfd, &from_addr, from_len, &ack);
                        
                        if (pkt.header.flags & FLAG_FIN) {
                            success = 1;
                            break;
                        }
                        expected_seq++;
                    } else if (pkt.header.seq_num < expected_seq) {
                        ack.header.seq_num = 0;
                        ack.header.ack_num = pkt.header.seq_num;
                        ack.header.flags = FLAG_ACK;
                        ack.header.data_len = 0;
                        send_packet(sfd, &from_addr, from_len, &ack);
                    }
                }
            }
        }
    }
    
    fclose(fp);
    closesocket(sfd);
    printf("[Proxy] Fetched %s from Origin.\n", filename);
    return success;
}

void serve_from_cache(SOCKET sfd, struct sockaddr_in *cl_addr, int addr_len, char *filename) {
    char cache_path[256];
    sprintf(cache_path, "%s\\%s", CACHE_DIR, filename);
    
    printf("[Proxy] Serving %s from Cache...\n", filename);
    
    FILE *fp = fopen(cache_path, "rb");
    if (!fp) {
        printf("[Proxy] Error: File not found in cache after fetch attempt.\n");
        return;
    }

    fseek(fp, 0, SEEK_END);
    long filesize = ftell(fp);
    fseek(fp, 0, SEEK_SET);
    uint32_t total_packets = (filesize + DATA_SIZE - 1) / DATA_SIZE;

    uint32_t base = 1;
    uint32_t next_seq_num = 1;
    Packet window[MAX_WINDOW_SIZE];
    int window_valid[MAX_WINDOW_SIZE] = {0};

    while (base <= total_packets) {
        while (next_seq_num < base + MAX_WINDOW_SIZE && next_seq_num <= total_packets) {
            int idx = next_seq_num % MAX_WINDOW_SIZE;
            if (!window_valid[idx] || window[idx].header.seq_num != next_seq_num) {
                long offset = (next_seq_num - 1) * DATA_SIZE;
                fseek(fp, offset, SEEK_SET);
                int bytes_read = fread(window[idx].data, 1, DATA_SIZE, fp);
                
                window[idx].header.seq_num = next_seq_num;
                window[idx].header.data_len = bytes_read;
                window[idx].header.flags = FLAG_DATA;
                if (next_seq_num == total_packets) window[idx].header.flags |= FLAG_FIN;
                window_valid[idx] = 1;
            }
            send_packet(sfd, cl_addr, addr_len, &window[idx]);
            next_seq_num++;
        }

        Packet ack_pkt;
        struct sockaddr_in from_addr;
        int from_len = sizeof(from_addr);
        
        fd_set readfds;
        struct timeval tv;
        tv.tv_sec = 0;
        tv.tv_usec = 100000;

        FD_ZERO(&readfds);
        FD_SET(sfd, &readfds);

        int activity = select(0, &readfds, NULL, NULL, &tv);
        if (activity > 0) {
            int len = recvfrom(sfd, (char *)&ack_pkt, sizeof(ack_pkt), 0, (struct sockaddr *)&from_addr, &from_len);
            if (len > 0) {
                 uint32_t received_crc = ack_pkt.header.checksum;
                ack_pkt.header.checksum = 0;
                if (calculate_crc32(&ack_pkt, sizeof(PacketHeader) + ack_pkt.header.data_len) == received_crc) {
                    if (ack_pkt.header.flags & FLAG_ACK) {
                        if (ack_pkt.header.ack_num >= base) {
                            base = ack_pkt.header.ack_num + 1;
                        }
                    }
                }
            }
        } else {
            next_seq_num = base;
        }
    }
    fclose(fp);
    printf("[Proxy] Served %s to client.\n", filename);
}

int main(int argc, char **argv) {
    WSADATA wsaData;
    SOCKET sfd;
    struct sockaddr_in sv_addr, cl_addr;
    int addr_len;
    Packet pkt;

    // CreateDirectory(CACHE_DIR, NULL);
    init_crc32();

    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) exit(EXIT_FAILURE);

    if ((sfd = socket(AF_INET, SOCK_DGRAM, 0)) == INVALID_SOCKET) print_error("Proxy: socket");

    memset(&sv_addr, 0, sizeof(sv_addr));
    sv_addr.sin_family = AF_INET;
    sv_addr.sin_port = htons(PROXY_PORT);
    sv_addr.sin_addr.s_addr = INADDR_ANY;

    if (bind(sfd, (struct sockaddr *)&sv_addr, sizeof(sv_addr)) == SOCKET_ERROR) print_error("Proxy: bind");

    printf("Akamai-Grade CDN Proxy started on port %d\n", PROXY_PORT);

    for (;;) {
        addr_len = sizeof(cl_addr);
        memset(&pkt, 0, sizeof(pkt));
        
        int len = recvfrom(sfd, (char *)&pkt, sizeof(pkt), 0, (struct sockaddr *)&cl_addr, &addr_len);
        if (len > 0) {
            uint32_t received_crc = pkt.header.checksum;
            pkt.header.checksum = 0;
            if (calculate_crc32(&pkt, sizeof(PacketHeader) + pkt.header.data_len) == received_crc) {
                char cmd[10], filename[200];
                sscanf(pkt.data, "%s %s", cmd, filename);
                
                if (strcmp(cmd, "get") == 0) {
                    char cache_path[256];
                    sprintf(cache_path, "%s\\%s", CACHE_DIR, filename);
                    
                    FILE *test_fp = fopen(cache_path, "rb");
                    if (test_fp == NULL) {
                        // Cache Miss
                        if (!fetch_from_origin(filename)) {
                            printf("[Proxy] Failed to fetch from origin\n");
                            continue;
                        }
                    } else {
                        fclose(test_fp);
                        printf("[Proxy] Cache Hit for %s\n", filename);
                    }
                    serve_from_cache(sfd, &cl_addr, addr_len, filename);
                }
            }
        }
    }

    closesocket(sfd);
    WSACleanup();
    return 0;
}
