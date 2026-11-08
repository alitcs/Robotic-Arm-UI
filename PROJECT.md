# Projects

## Robotic Arm Control System with Web UI

### Project Overview

- Built a browser-based dashboard for monitoring commands produced by a local robotic arm keyboard-control system.
- Connected a Python keyboard-input backend to the browser through a local WebSocket server.
- Displayed six motor-channel values as live gauges and showed the latest command packet alongside a scrollable packet log.
- Added connection status and automatic reconnection when the WebSocket server disconnects.
- Kept the project lightweight with a Python backend and a dependency-free HTML, CSS, and JavaScript frontend.

### Python Backend & Keyboard Input

- Used PyGame to poll keyboard state and keep a small display window available for keyboard input.
- Implemented separate wrist, shoulder, and elbow/claw control modes, selected by holding no modifier, `Shift`, or `Ctrl` respectively.
- Mapped directional keys to neutral and movement PWM-style values, using `128` as neutral and `56` or `200` for directional commands.
- Polled input at approximately 50 Hz and broadcast a packet only when the channel values changed.
- Printed outgoing packets locally to support debugging.

### WebSocket Communication & Packet Format

- Used Python `asyncio` and the `websockets` library to serve local browser clients at `ws://127.0.0.1:8765`.
- Encoded each command as a seven-part underscore-delimited packet: a leading `A` followed by six channel values.
- Broadcast updated packets to connected clients and removed clients that could no longer receive messages.
- Kept the WebSocket stream outbound-only; incoming client messages are ignored.

### Browser Dashboard

- Built the interface with HTML, CSS, and vanilla JavaScript.
- Parsed incoming packets and validated the expected prefix, channel count, and 0–255 value range before updating the gauges.
- Visualized the elbow, right wrist, left wrist, claw, and two shoulder motor channels.
- Maintained a log of up to 150 recent packets and automatically scrolled to the newest entry.
- Allowed the WebSocket endpoint to be overridden through the page's `ws` query parameter.

### Architecture

- Kept keyboard polling, command generation, and WebSocket broadcasting in `backendsender.py`.
- Separated the browser layout, styling, and WebSocket-driven UI behavior into `index.html`, `styles.css`, and `script.js`.
- Used the packet as the shared contract between the Python backend and JavaScript frontend.

### Build & Run

- Requires Python 3.12 or newer, plus the `pygame` and `websockets` packages.
- Starts the backend with `python backendsender.py`, then serves or opens `index.html` in a browser.
- Uses the local WebSocket endpoint `ws://127.0.0.1:8765` by default.

### Technologies

- **Languages:** Python, JavaScript, HTML, CSS
- **Libraries:** PyGame, `websockets`
- **Protocols:** WebSocket
- **Concepts:** Real-time input polling, asynchronous messaging, packet parsing, live data visualization, connection recovery
