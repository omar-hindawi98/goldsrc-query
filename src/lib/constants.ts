const OFFSET_BYTES = [0xff, 0xff, 0xff, 0xff];

export const UDP_PACKET = {
    A2S_INFO: OFFSET_BYTES.concat([
        0x54, 0x53, 0x6f, 0x75, 0x72, 0x63, 0x65, 0x20, 0x45, 0x6e, 0x67, 0x69, 0x6e, 0x65, 0x20,
        0x51, 0x75, 0x65, 0x72, 0x79, 0x00,
    ]),
    A2S_PLAYER: OFFSET_BYTES.concat([0x55]),
    A2S_PLAYER_CHALLENGE: OFFSET_BYTES.concat([0x55, ...OFFSET_BYTES]),
    A2S_RULES: OFFSET_BYTES.concat([0x56]),
    A2S_SERVERQUERY_GETCHALLENGE: OFFSET_BYTES.concat([0x57]),
} as const;

export const UDP_RESPONSE = {
    A2S_INFO: 0x6d,
    A2S_INFO_ADDITIONAL: 0x49,
    A2S_PLAYER: 0x44,
    A2S_RULES: 0x45,
    A2S_SERVERQUERY_GETCHALLENGE: 0x41,
} as const;

export const TCP_PACKET = {
    SERVERDATA_AUTH: 3,
    SERVERDATA_EXECCOMMAND: 2,
} as const;

export const TCP_RESPONSE = {
    SERVERDATA_AUTH_RESPONSE: 2,
    SERVERDATA_RESPONSE_VALUE: 0,
} as const;
