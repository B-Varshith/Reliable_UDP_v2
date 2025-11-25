/***************************************************************************************************
MIT License - Windows Port (Akamai-Grade Reliable UDP)

Modified for Windows using Winsock2
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
#include <time.h>

#include "../common/protocol.h"

#pragma comment(lib, "ws2_32.lib")

// CRC32 Table-based implementation
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

static void print_error(const char *msg) {
    fprintf(stderr, "%s: %d\n", msg, WSAGetLastError());
    // Don't exit on error, just log it to keep server alive
}

// Helper to send a packet with header
void send_packet(SOCKET sfd, struct sockaddr_in *addr, int addr_len, Packet *pkt) {
    pkt->header.checksum = 0;
    pkt->header.checksum = calculate_crc32(pkt, sizeof(PacketHeader) + pkt->header.data_len);
    sendto(sfd, (char *)pkt, sizeof(PacketHeader) + pkt->header.data_len, 0, (struct sockaddr *)addr, addr_len);
}

void handle_get(SOCKET sfd, struct sockaddr_in *cl_addr, int addr_len, char *filename) {
    printf("Processing GET %s\n", filename);
    FILE *fp = fopen(filename, "rb");
    if (!fp) {
        printf("File not found\n");
        // Send error packet (empty data with FIN?) - for now just ignore
        return;
    }

    fseek(fp, 0, SEEK_END);
    long filesize = ftell(fp);
    fseek(fp, 0, SEEK_SET);

    uint32_t total_packets = (filesize + DATA_SIZE - 1) / DATA_SIZE;
    printf("File size: %ld, Total packets: %d\n", filesize, total_packets);

    // Send metadata (SYN with file info could be better, but sticking to simple flow)
    // We will send packets 1..N.
    // Simple Stop-and-Wait for this demo to ensure reliability without complex window management in C for now,
    // or we can try a simple window. Let's do Stop-and-Wait for robustness first, then optimize if time permits.
    // Actually, plan said Sliding Window. Let's implement a simple window.

    uint32_t base = 1;
    uint32_t next_seq_num = 1;
    Packet window[MAX_WINDOW_SIZE];
    int window_valid[MAX_WINDOW_SIZE] = {0}; // 1 if packet is loaded

    while (base <= total_packets) {
        // Fill window
        while (next_seq_num < base + MAX_WINDOW_SIZE && next_seq_num <= total_packets) {
            int idx = next_seq_num % MAX_WINDOW_SIZE;
            if (!window_valid[idx] || window[idx].header.seq_num != next_seq_num) {
                // Load packet
                long offset = (next_seq_num - 1) * DATA_SIZE;
                fseek(fp, offset, SEEK_SET);
                int bytes_read = fread(window[idx].data, 1, DATA_SIZE, fp);
                
                window[idx].header.seq_num = next_seq_num;
                window[idx].header.data_len = bytes_read;
                window[idx].header.flags = FLAG_DATA;
                if (next_seq_num == total_packets) window[idx].header.flags |= FLAG_FIN;
                window_valid[idx] = 1;
            }
            
            // Send packet
            printf("Sending packet %d\n", next_seq_num);
            send_packet(sfd, cl_addr, addr_len, &window[idx]);
            next_seq_num++;
        }

        // Wait for ACKs
        Packet ack_pkt;
        struct sockaddr_in from_addr;
        int from_len = sizeof(from_addr);
        
        fd_set readfds;
        struct timeval tv;
        tv.tv_sec = 0;
        tv.tv_usec = 100000; // 100ms timeout for fast retransmit check

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
                        printf("Received ACK %d\n", ack_pkt.header.ack_num);
                        if (ack_pkt.header.ack_num >= base) {
                            base = ack_pkt.header.ack_num + 1;
                        }
                    }
                }
            }
        } else {
            // Timeout, Go-Back-N
            printf("Timeout, resending from %d\n", base);
            next_seq_num = base;
        }
    }

    fclose(fp);
    printf("File sent successfully\n");
}

void handle_put(SOCKET sfd, struct sockaddr_in *cl_addr, int addr_len, char *filename) {
    printf("Processing PUT %s\n", filename);
    FILE *fp = fopen(filename, "wb");
    if (!fp) {
        printf("Cannot create file\n");
        return;
    }

    uint32_t expected_seq = 1;
    Packet pkt;
    Packet ack;
    
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
                        printf("Received packet %d\n", expected_seq);
                        
                        // Send ACK
                        ack.header.seq_num = 0;
                        ack.header.ack_num = expected_seq;
                        ack.header.flags = FLAG_ACK;
                        ack.header.data_len = 0;
                        send_packet(sfd, &from_addr, from_len, &ack);
                        
                        if (pkt.header.flags & FLAG_FIN) {
                            printf("Received FIN\n");
                            break;
                        }
                        expected_seq++;
                    } else if (pkt.header.seq_num < expected_seq) {
                        // Resend ACK for old packet
                        ack.header.seq_num = 0;
                        ack.header.ack_num = pkt.header.seq_num;
                        ack.header.flags = FLAG_ACK;
                        ack.header.data_len = 0;
                        send_packet(sfd, &from_addr, from_len, &ack);
                    }
                }
            } else {
                printf("CRC Error on packet %d\n", pkt.header.seq_num);
            }
        }
    }
    fclose(fp);
    printf("File received successfully\n");
}

int main(int argc, char **argv) {
    WSADATA wsaData;
    SOCKET sfd;
    struct sockaddr_in sv_addr, cl_addr;
    int addr_len;
    Packet pkt;

    if (argc != 2) {
        printf("Usage: %s [Port Number]\n", argv[0]);
        exit(EXIT_FAILURE);
    }

    init_crc32();

    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        fprintf(stderr, "WSAStartup failed\n");
        exit(EXIT_FAILURE);
    }

    if ((sfd = socket(AF_INET, SOCK_DGRAM, 0)) == INVALID_SOCKET)
        print_error("Server: socket");

    memset(&sv_addr, 0, sizeof(sv_addr));
    sv_addr.sin_family = AF_INET;
    sv_addr.sin_port = htons(atoi(argv[1]));
    sv_addr.sin_addr.s_addr = INADDR_ANY;

    if (bind(sfd, (struct sockaddr *)&sv_addr, sizeof(sv_addr)) == SOCKET_ERROR)
        print_error("Server: bind");

    printf("Akamai-Grade UDP Server started on port %s\n", argv[1]);

    for (;;) {
        addr_len = sizeof(cl_addr);
        memset(&pkt, 0, sizeof(pkt));
        
        int len = recvfrom(sfd, (char *)&pkt, sizeof(pkt), 0, (struct sockaddr *)&cl_addr, &addr_len);
        if (len > 0) {
            // Check if it's a new protocol packet
            uint32_t received_crc = pkt.header.checksum;
            pkt.header.checksum = 0;
            if (calculate_crc32(&pkt, sizeof(PacketHeader) + pkt.header.data_len) == received_crc) {
                // It's our protocol
                char cmd[10], filename[200];
                sscanf(pkt.data, "%s %s", cmd, filename);
                
                if (strcmp(cmd, "get") == 0) {
                    handle_get(sfd, &cl_addr, addr_len, filename);
                } else if (strcmp(cmd, "put") == 0) {
                    handle_put(sfd, &cl_addr, addr_len, filename);
                } else if (strcmp(cmd, "ls") == 0) {
                    // Implement LS
                     WIN32_FIND_DATA findFileData;
                    HANDLE hFind = FindFirstFile(".\\*", &findFileData);
                    char file_list[2048] = "";
                    
                    if (hFind != INVALID_HANDLE_VALUE) {
                        do {
                            strcat(file_list, findFileData.cFileName);
                            strcat(file_list, "\n");
                        } while (FindNextFile(hFind, &findFileData) != 0);
                        FindClose(hFind);
                    }
                    
                    Packet resp;
                    memset(&resp, 0, sizeof(resp));
                    strcpy(resp.data, file_list);
                    resp.header.data_len = strlen(file_list);
                    resp.header.flags = FLAG_DATA | FLAG_FIN;
                    send_packet(sfd, &cl_addr, addr_len, &resp);
                } else if (strcmp(cmd, "delete") == 0) {
                     int res = remove(filename);
                     Packet resp;
                     memset(&resp, 0, sizeof(resp));
                     *(int*)resp.data = (res == 0) ? 1 : -1;
                     resp.header.data_len = 4;
                     resp.header.flags = FLAG_ACK;
                     send_packet(sfd, &cl_addr, addr_len, &resp);
                }
            } else {
                // Legacy or garbage
                printf("Received invalid packet or legacy command\n");
            }
        }
    }

    closesocket(sfd);
    WSACleanup();
    return 0;
}
