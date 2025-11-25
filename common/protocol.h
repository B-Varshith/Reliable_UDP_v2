#ifndef PROTOCOL_H
#define PROTOCOL_H

#include <stdint.h>

#define BUF_SIZE 2048
#define DATA_SIZE 1024

// Packet Flags
#define FLAG_SYN  0x01
#define FLAG_ACK  0x02
#define FLAG_FIN  0x04
#define FLAG_DATA 0x08

// Protocol Constants
#define MAX_WINDOW_SIZE 10
#define TIMEOUT_MS 2000

#pragma pack(push, 1)
typedef struct {
    uint32_t seq_num;       // Sequence Number
    uint32_t ack_num;       // Acknowledgment Number
    uint16_t window_size;   // Flow Control Window
    uint16_t data_len;      // Length of data payload
    uint32_t checksum;      // CRC32 Checksum
    uint8_t  flags;         // Packet Type Flags
    uint8_t  reserved[3];   // Padding/Reserved
} PacketHeader;

typedef struct {
    PacketHeader header;
    char data[DATA_SIZE];
} Packet;
#pragma pack(pop)

#endif // PROTOCOL_H
