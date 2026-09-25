# PiZXel Session API

The internal API of the PiZXel session server (`npm run start:server`), which
runs many isolated PiZXels in one process for **pizxel.uk**. The website is
its only client, and it's reachable only on the private Docker network. The
engine knows nothing about handles, PINs or logins, only opaque session ids.

Local modes (`npm start`, `--canvas`, `--fb`) don't use any of this.

- Implementation: `pizxel/server/` (`server.ts` routes and WebSocket,
  `session.ts` protocol, `session-manager.ts` limits)
- Tests: `tests/server-test.ts` exercises everything below

## Authentication

Every HTTP request and the WebSocket upgrade must carry:

```
Authorization: Bearer <ENGINE_TOKEN>
```

The only exception is `GET /healthz`. A missing or wrong token gets HTTP
`401` or, on the WebSocket, close code `4401`.

## Sessions

A session is one visitor's PiZXel: its own display, input, apps and saved
data, stored under `<DATA_ROOT>/sessions/<id>/`.

- Ids are 22-character base64url strings, e.g. `LcrWqKG_2fAWVCrdxPmqmg`.
  Anything else is treated as unknown.
- A session is either **`live`** (running) or **`suspended`** (stopped, with
  its state on disk). New sessions start suspended.
- Connecting a viewer makes a session live. When its last viewer leaves, it
  is suspended after `IDLE_SUSPEND_SECONDS` (default 60).
- A session resumes as the visitor left it: apps' saved data is kept, and
  the app that was open when it suspended is reopened (Escape still returns
  to the launcher).
- At most `MAX_LIVE_SESSIONS` run at once. When that's reached and another
  session connects, the live session that has had no viewers for longest is
  suspended to make room. If every live session has a viewer, the newcomer
  gets `full`.
- Sessions never expire on their own: the website deletes them (e.g. after
  90 days unused, using `lastActiveAt`).

## HTTP endpoints

All bodies are JSON.

### `POST /sessions`

Creates a session.

```
201 {"id": "LcrWqKG_2fAWVCrdxPmqmg"}
```

This never fails for lack of room: the limit applies to live sessions, so
"full" is reported when connecting (see WebSocket).

### `DELETE /sessions/:id`

Deletes a session and its data. Any connected viewer is closed with `4410`.
Idempotent: deleting an unknown session also returns `204`.

```
204 (no body)
```

### `GET /sessions/:id/status`

```
200 {"state": "live" | "suspended", "lastActiveAt": "2026-09-25T15:44:01.123Z"}
404 {"error": "not found"}
```

`lastActiveAt` is the last key or text input, connect or disconnect.

### `GET /catalog`

The apps visitors can have. `tier` is `core` (always on) or `optional`
(switched on per session).

```
200 [
  {"id": "clock", "name": "Clock", "description": "Analog clock with date display",
   "icon": "⏰", "category": null, "tier": "core"},
  ...
]
```

`id` is the app's directory name. `icon` is an emoji.

### `GET /sessions/:id/apps`

```
200 {"enabled": ["some-optional-app"]}
404 {"error": "not found"}
```

### `PUT /sessions/:id/apps`

Sets which optional apps are on. **Changes apply on the next resume**, not
to a session that's already live.

```
PUT {"enabled": ["some-optional-app"]}
200 {"enabled": ["some-optional-app"]}
400 {"error": "enabled must list optional app ids"}   (unknown or core ids)
404 {"error": "not found"}
```

### `GET /healthz`

No authentication.

```
200 {"ok": true}
```

## WebSocket: `/sessions/:id/ws`

A plain WebSocket (not socket.io), with no compression on this leg. Text
messages are JSON control messages; binary messages are frames.

On connect, the engine resumes the session if needed and then sends `init`,
**immediately followed by the current frame**, so a viewer of a still screen
isn't left black. The same happens on every reconnect.

### Frames (server → client, binary)

Raw RGB24: `width × height × 3` bytes, row by row from the top-left, one byte
each for red, green and blue. At 256×192 that's 147,456 bytes.

A frame is sent only when the display changes, at most `FPS_CAP` times a
second (default 20). If a viewer falls more than 1 MB behind, frames are
skipped for it until it catches up.

### Server → client (JSON)

| Message | Meaning |
|---|---|
| `{"type":"init","width":256,"height":192}` | First message on every connect |
| `{"type":"full"}` | No room; sent just before close `4503` |
| `{"type":"audio:beep","frequency":800,"duration":50,"volume":0.1}` | Play a tone (Hz, ms, 0–1) |
| `{"type":"audio:sweep","startFreq":400,"endFreq":800,"duration":100,"volume":0.15}` | Play a frequency sweep |
| `{"type":"audio:request-start"}` | An app wants the microphone (see below) |
| `{"type":"audio:request-stop"}` | The app is done with the microphone |

Viewers should ignore message types they don't know.

### Client → server (JSON)

| Message | Meaning |
|---|---|
| `{"type":"key","key":"ArrowUp","code":"ArrowUp","shift":false,"ctrl":false,"alt":false}` | A keydown |
| `{"type":"text","text":"pasted text"}` | Paste |

- **`key`** is `KeyboardEvent.key`, sent for every keydown, including
  auto-repeat. PiZXel handles:
  - `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, `Escape`,
    `Tab`, `Backspace`, and `" "` for Space;
  - any single printable character (`"a"`, `"A"`, `"?"`), which is also how
    text inputs receive typing.

  Other keys (`Shift`, `F1`, ...) are ignored, as are `key` values over 32
  characters. `code`, `shift`, `ctrl` and `alt` are accepted and currently
  ignored.
- **`text`** is typed in as one key per character, up to 256 characters.
- Binary messages from the client, malformed JSON and unknown types are
  ignored. Messages over 64 KB close the connection (code `1009`).

### Microphone (optional)

Some apps (e.g. a live equaliser) use the microphone. The website may
implement this later; until then, apps just see no microphone.

1. The engine sends `audio:request-start` **only when an app asks** for the
   microphone. The viewer asks the browser for permission then, never before.
2. The viewer replies with `{"type":"audio:started"}`, `{"type":"audio:denied"}`
   or `{"type":"audio:error","message":"..."}`.
3. While capturing, the browser analyses the sound and sends summaries, not
   raw audio, at up to ~30 a second (the engine uses the latest):

   ```json
   {"type":"audio:analysis",
    "spectrum": {"bands":[/* 32 numbers, low to high, log-spaced */],
                 "bassEnergy":0.4, "midEnergy":0.2, "trebleEnergy":0.1},
    "levels": {"rms":0.1, "peak":0.3, "db":-20},
    "waveform": {"samples":[/* 128 numbers, -1 to 1 */]},
    "classification": {"type":"music", "confidence":0.8, "hasBeat":true, "tempo":120}}
   ```

   and, on a beat, `{"type":"audio:beat","tempo":120,"confidence":0.8}`.
   Values are 0–1 unless noted; `db` is −60 to 0; `classification.type` is
   `silence`, `music`, `speech`, `noise` or `unknown`; `tempo` is BPM and may
   be absent.
4. On `audio:request-stop`, or when the visitor leaves, the viewer stops
   capturing and sends `{"type":"audio:stopped"}`.

The local canvas viewer is a working reference for the analysis (functions
`calculateSpectrum`, `calculateLevels`, `calculateWaveform` and
`classifyAudio` in `pizxel/display/canvas-server.ts`).

### Close codes (server → client)

| Code | Meaning | Suggested handling |
|---|---|---|
| `1001` | Engine shutting down or restarting | Reconnect with backoff |
| `4401` | Missing or wrong token | Configuration error on the site |
| `4404` | Unknown session | Check `GET /status`; offer to start afresh |
| `4410` | Session deleted while connected | Don't reconnect |
| `4503` | Full (after `{"type":"full"}`) | Retry later |
| `1011` | Internal error | Reconnect with backoff |

## Safety in server mode

- Visitors can only send keys, text and microphone summaries. They can't
  upload or run code, choose files, or pick URLs.
- User apps (`data/*/apps`) are never loaded. The only extra apps come from
  `EXTRA_APPS_DIR`, which the operator sets (e.g. for a private instance).
- PiZXel makes no outbound network requests in server mode (the emoji CDN
  fallback and emoji search are off; see `pizxel/core/network.ts`).
- The ZX Spectrum emulator (jsspeccy3) isn't in the image.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `ENGINE_TOKEN` | (required) | Bearer token the website sends |
| `PORT` | `3001` | HTTP and WebSocket port |
| `DATA_ROOT` | `./data/server` (`/data` in Docker) | Session data directory |
| `MAX_LIVE_SESSIONS` | `10` | Sessions running at once |
| `FPS_CAP` | `20` | Maximum frames per second per session |
| `IDLE_SUSPEND_SECONDS` | `60` | Delay before suspending an unwatched session |
| `EXTRA_APPS_DIR` | (none) | Extra apps directory, e.g. private apps |
| `PIZXEL_DEBUG` | (off) | Per-frame and per-key debug logging |
