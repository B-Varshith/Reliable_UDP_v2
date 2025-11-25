/***************************************************************************************************
MIT License - Windows Port (Akamai-Grade Reliable UDP Client)

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
#include <time.h>

#include "../common/protocol.h"

#pragma comment(lib, "ws2_32.lib")

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

static void print_error(char *msg) {
    fprintf(stderr, "%s: %d\n", msg, WSAGetLastError());
    exit(EXIT_FAILURE);
}

void send_packet(SOCKET sfd, struct sockaddr_in *addr, int addr_len, Packet *pkt) {
    pkt->header.checksum = 0;
    pkt->header.checksum = calculate_crc32(pkt, sizeof(PacketHeader) + pkt->header.data_len);
    sendto(sfd, (char *)pkt, sizeof(PacketHeader) + pkt->header.data_len, 0, (struct sockaddr *)addr, addr_len);
}

int main(int argc, char **argv) {
    WSADATA wsaData;
    SOCKET cfd;
    struct sockaddr_in send_addr, from_addr;
    Packet pkt;
    int addr_len;

    if (argc != 3) {
        printf("Client: Usage --> %s [IP Address] [Port Number]\n", argv[0]);
        exit(EXIT_FAILURE);
    }

    init_crc32();

    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        fprintf(stderr, "WSAStartup failed\n");
        exit(EXIT_FAILURE);
    }

    memset(&send_addr, 0, sizeof(send_addr));
    send_addr.sin_family = AF_INET;
    send_addr.sin_port = htons(atoi(argv[2]));
    send_addr.sin_addr.s_addr = inet_addr(argv[1]);

    if ((cfd = socket(AF_INET, SOCK_DGRAM, 0)) == INVALID_SOCKET)
        print_error("Client: socket");

    printf("Akamai-Grade Client connected to %s:%s\n", argv[1], argv[2]);

    for (;;) {
        char cmd_input[200];
        char cmd[10], flname[200];
        
        printf("\n===== Menu =====\n");
        printf("  1.) get [file_name]\n");
        printf("  2.) put [file_name]\n");
        printf("  3.) delete [file_name]\n");
        printf("  4.) ls\n");
        printf("  5.) exit\n");
        printf("Command: ");
        
        fgets(cmd_input, sizeof(cmd_input), stdin);
        cmd_input[strcspn(cmd_input, "\n")] = 0;
        
        sscanf(cmd_input, "%s %s", cmd, flname);

        // Send Command
        memset(&pkt, 0, sizeof(pkt));
        strcpy(pkt.data, cmd_input);
        pkt.header.data_len = strlen(cmd_input);
        pkt.header.flags = FLAG_SYN; // Command packet
        send_packet(cfd, &send_addr, sizeof(send_addr), &pkt);

        if (strcmp(cmd, "get") == 0) {
            FILE *fp = fopen(flname, "wb");
            if (!fp) {
                printf("Error opening file for writing\n");
                continue;
            }

            uint32_t expected_seq = 1;
            Packet ack;
            int transfer_done = 0;

            while (!transfer_done) {
                addr_len = sizeof(from_addr);
                int len = recvfrom(cfd, (char *)&pkt, sizeof(pkt), 0, (struct sockaddr *)&from_addr, &addr_len);
                
                if (len > 0) {
                    uint32_t received_crc = pkt.header.checksum;
                    pkt.header.checksum = 0;
                    if (calculate_crc32(&pkt, sizeof(PacketHeader) + pkt.header.data_len) == received_crc) {
                        if (pkt.header.flags & FLAG_DATA) {
                            if (pkt.header.seq_num == expected_seq) {
                                fwrite(pkt.data, 1, pkt.header.data_len, fp);
                                printf("Received packet %d\n", expected_seq);
                                
                                ack.header.seq_num = 0;
                                ack.header.ack_num = expected_seq;
                                ack.header.flags = FLAG_ACK;
                                ack.header.data_len = 0;
                                send_packet(cfd, &send_addr, sizeof(send_addr), &ack);
                                
                                if (pkt.header.flags & FLAG_FIN) {
                                    transfer_done = 1;
                                }
                                expected_seq++;
                            } else if (pkt.header.seq_num < expected_seq) {
                                ack.header.seq_num = 0;
                                ack.header.ack_num = pkt.header.seq_num;
                                ack.header.flags = FLAG_ACK;
                                ack.header.data_len = 0;
                                send_packet(cfd, &send_addr, sizeof(send_addr), &ack);
                            }
                        }
                    }
                }
            }
            fclose(fp);
            printf("File received successfully\n");

        } else if (strcmp(cmd, "put") == 0) {
            FILE *fp = fopen(flname, "rb");
            if (!fp) {
                printf("File not found\n");
                continue;
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
                    printf("Sending packet %d\n", next_seq_num);
                    send_packet(cfd, &send_addr, sizeof(send_addr), &window[idx]);
                    next_seq_num++;
                }

                Packet ack_pkt;
                fd_set readfds;
                struct timeval tv;
                tv.tv_sec = 0;
                tv.tv_usec = 100000;

                FD_ZERO(&readfds);
                FD_SET(cfd, &readfds);

                int activity = select(0, &readfds, NULL, NULL, &tv);
                if (activity > 0) {
                    addr_len = sizeof(from_addr);
                    int len = recvfrom(cfd, (char *)&ack_pkt, sizeof(ack_pkt), 0, (struct sockaddr *)&from_addr, &addr_len);
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
                    printf("Timeout, resending from %d\n", base);
                    next_seq_num = base;
                }
            }
            fclose(fp);
            printf("File sent successfully\n");

        } else if (strcmp(cmd, "ls") == 0) {
            addr_len = sizeof(from_addr);
            int len = recvfrom(cfd, (char *)&pkt, sizeof(pkt), 0, (struct sockaddr *)&from_addr, &addr_len);
            if (len > 0) {
                printf("Files:\n%s\n", pkt.data);
            }
        } else if (strcmp(cmd, "delete") == 0) {
            addr_len = sizeof(from_addr);
            int len = recvfrom(cfd, (char *)&pkt, sizeof(pkt), 0, (struct sockaddr *)&from_addr, &addr_len);
            if (len > 0) {
                int res = *(int*)pkt.data;
                if (res == 1) printf("Deleted successfully\n");
                else printf("Delete failed\n");
            }
        } else if (strcmp(cmd, "exit") == 0) {
            break;
        }
    }

    closesocket(cfd);
    WSACleanup();
    return 0;
}
