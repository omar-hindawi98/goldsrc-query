# goldsrc-query

[![npm version](https://img.shields.io/npm/v/goldsrc-query)](https://www.npmjs.com/package/goldsrc-query)
[![license](https://img.shields.io/npm/l/goldsrc-query)](LICENSE)
[![node](https://img.shields.io/node/v/goldsrc-query)](https://nodejs.org)
[![CI](https://img.shields.io/github/actions/workflow/status/omar-hindawi98/goldsrc-query/ci.yml?branch=main&label=CI)](https://github.com/omar-hindawi98/goldsrc-query/actions/workflows/ci.yml)
[![E2E](https://img.shields.io/github/actions/workflow/status/omar-hindawi98/goldsrc-query/e2e.yml?branch=main&label=E2E)](https://github.com/omar-hindawi98/goldsrc-query/actions/workflows/e2e.yml)

A Promise-based Node.js library for querying GoldSrc game servers (Half-Life, Counter-Strike 1.6, etc.) over UDP using the A2S protocol, with full RCON support over TCP.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API](#api)
    - [Constructor](#constructor)
    - [UDP Queries](#udp-queries)
    - [RCON](#rcon)
    - [Lifecycle](#lifecycle)
- [Types](#types)
- [Error Handling](#error-handling)
- [Development](#development)

---

## Features

- **Promise-based** — no callbacks or event emitters
- **Server info** — name, map, player count, VAC status, and more
- **Player list** — names, scores, and time in-game
- **Rules** — full server cvar list
- **Ping** — round-trip latency via A2S_INFO
- **RCON** — authenticate and send commands over TCP
- **Split-packet reassembly** — handles large responses fragmented across multiple UDP packets
- **TCP buffering** — correctly handles partial RCON packet delivery and multi-packet responses
- **TypeScript** — full type declarations included

---

## Installation

```bash
npm install goldsrc-query
```

**Requirements:** Node.js `>=20.12.0`

---

## Quick Start

```typescript
import { Query } from 'goldsrc-query';

const query = new Query('192.168.1.1', 27015);
query.connect();

const ms = await query.ping();
console.log(`Latency: ${ms}ms`);

const info = await query.serverInfo();
console.log(`${info.name} — ${info.players}/${info.max_players} on ${info.map}`);

const players = await query.players();
players.forEach((p) => console.log(`${p.name}: ${p.score} kills`));

const rules = await query.rules();
console.log(`Rules: ${rules.total}`);

query.close();
```

### With RCON

```typescript
import { Query } from 'goldsrc-query';

const query = new Query('192.168.1.1', 27015);

await query.connectRcon('your_rcon_password');

const response = await query.sendRcon('status');
console.log(response.data);

query.close();
```

---

## API

### Constructor

```typescript
new Query(address: string, port?: number, timeout?: number, verbose?: boolean)
```

| Parameter | Type      | Default | Description                     |
| --------- | --------- | ------- | ------------------------------- |
| `address` | `string`  | —       | Server IP address or hostname   |
| `port`    | `number`  | `27015` | Server port                     |
| `timeout` | `number`  | `1500`  | Request timeout in milliseconds |
| `verbose` | `boolean` | `false` | Log socket activity to stdout   |

---

### UDP Queries

All methods return a `Promise` that rejects with an `Error` if the server does not respond within the timeout.

Call `connect()` before any UDP query method.

#### `connect(): void`

Opens the UDP socket. Must be called before any query.

#### `ping(): Promise<number>`

Returns the round-trip latency in milliseconds, measured using an `A2S_INFO` request.

#### `serverInfo(): Promise<ServerInfo>`

Returns server metadata — name, map, player counts, VAC status, and optional EDF fields.

#### `players(): Promise<PlayerInfo[]>`

Returns the current player list. The challenge handshake is performed and cached automatically on first call.

#### `rules(): Promise<RulesInfo>`

Returns all server rules (cvars). Reuses the cached challenge from `players()` if available.

#### `close(): void`

Closes both the UDP socket and the TCP RCON connection.

---

### RCON

#### `connectRcon(password: string): Promise<void>`

Opens a TCP connection and authenticates with the given password. Resolves on success, rejects on wrong password or timeout.

#### `sendRcon(command: string): Promise<RconMessage>`

Sends an RCON command and returns the full response, including multi-packet responses. Rejects if the command times out.

---

### Lifecycle

```
connect()          → ping() / serverInfo() / players() / rules()
connectRcon()      → sendRcon()
close()            → cleans up both UDP and TCP
```

A `Query` instance can be reused for multiple queries. Call `close()` when done.

---

## Types

```typescript
interface ServerInfo {
    protocol: number;
    name: string;
    map: string;
    folder: string;
    game: string;
    players: number;
    max_players: number;
    bots: number;
    server_type: string; // 'd' = dedicated, 'l' = listen, 'p' = SourceTV proxy
    env: string; // 'l' = Linux, 'w' = Windows, 'm' = Mac
    visibility: number; // 0 = public, 1 = private
    vac: number; // 0 = unsecured, 1 = VAC secured
    // GoldSrc-only fields
    address?: string;
    mod_info?: ModInfo;
    // Source / newer GoldSrc EDF fields
    version?: string;
    server_port?: number;
    steamid?: bigint;
    spec_port?: number;
    spec_name?: string;
    keywords?: string;
    game_id?: number;
    game_id_64?: bigint;
}

interface ModInfo {
    mod: number; // 0 = no mod, 1 = mod active
    link: string | null; // mod info URL
    dl_link: string | null; // mod download URL
    version: number | null;
    size: number | null; // download size in bytes
    type: number | null; // 0 = single+multi, 1 = multiplayer only
    dll: number | null; // 0 = uses HL DLL, 1 = uses own DLL
}

interface PlayerInfo {
    index: number;
    name: string;
    score: number;
    duration: number; // seconds in-game
}

interface RulesInfo {
    total: number;
    list: Array<{ name: string; value: string }>;
}

interface RconMessage {
    id: number;
    data: string;
}
```

---

## Error Handling

All async methods reject with a standard `Error`. Wrap calls in `try/catch` or chain `.catch()`:

```typescript
try {
    const info = await query.serverInfo();
} catch (err) {
    // err.message: 'Timed out waiting for 0x6d/0x49'
}

try {
    await query.connectRcon('wrongpassword');
} catch (err) {
    // err.message: 'RCON authentication failed: wrong password'
}
```

Common error messages:

| Message                                      | Cause                                                    |
| -------------------------------------------- | -------------------------------------------------------- |
| `Socket not open — call connect() first`     | Called a query method before `connect()`                 |
| `Timed out waiting for 0x…`                  | Server did not respond within the timeout                |
| `RCON authentication failed: wrong password` | Invalid RCON password                                    |
| `RCON authentication timed out`              | Server did not respond to auth within the timeout        |
| `RCON command timed out: <cmd>`              | Server did not respond to the command within the timeout |

---

## Development

```bash
npm run build        # compile TypeScript to dist/
npm run dev          # compile in watch mode
npm test             # run all tests
npm run test:watch   # run tests in watch mode
npm run test:e2e     # run e2e tests (requires Docker, x86-64 host only)
npm run check        # lint + format (auto-fix)
npm run check:ci     # lint + format check (no writes, runs in CI)
```

> **Note:** E2E tests require Docker and an x86-64 host — HLDS does not run under QEMU emulation on Apple Silicon. E2E tests run automatically in CI on every push.
