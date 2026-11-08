# Arm Control System with Web UI

This dashboard displays six motor-channel values and the command packets produced
by a Python robotic arm keyboard controller. It has two modes:

- **Demo** (default): the browser simulates packets. No backend or robot is
  connected, and no commands are sent to hardware.
- **Local backend**: the dashboard receives real packets from the Python
  WebSocket server running on the visitor's computer.

Both modes use the same packet parser, gauges, and packet log. The real backend
uses PyGame to read keyboard input and broadcasts changes over a WebSocket; it
does not receive commands from the dashboard.

The animated 3D arm is a conceptual visualization of the latest valid channel
values. Its motion and highlighted parts do not represent measured physical
position or a precise model of the hardware. Wrist up/down and rotation are
shown on separate axes; the movement label names the current command. The
decorative pointer glow is disabled for touch devices and reduced-motion users.

## Try the demo

Open `index.html` in a browser. Use the arrow keys for the wrists, hold Shift
for the shoulder, or hold Ctrl for the elbow and claw. Shift takes precedence
if both modifiers are held. The on-screen buttons also work on touch devices;
choose their motor group from the dropdown. The dropdown only affects the
buttons, not keyboard controls. While the dropdown is focused, arrows operate
the dropdown as usual. Button commands return to neutral after a short delay.
The highlighted control guide follows the current keyboard or button mode.
Use **Clear log** to clear packet history without changing the latest packet or
motor values.

## Run with the local backend

1. Install Python 3.12 or newer and the dependencies:
   ```bash
   pip install pygame websockets
   ```
2. Run `python backendsender.py`.
3. Open `index.html` and select **Local backend**. The default endpoint is
   `ws://localhost:8765`.
4. Focus the PyGame window and use the original W/A/S/D controls. Hold Shift
   for the shoulder or Ctrl for the elbow and claw; without a modifier they
   control the wrists. Shift takes precedence if both modifiers are held.
   The dashboard displays packets when channel values change.

To select local mode with another endpoint, supply a URL-encoded `ws` query
parameter, for example
`index.html?ws=ws%3A%2F%2F127.0.0.1%3A8765`. An HTTPS-hosted dashboard may be
subject to browser restrictions on insecure WebSockets; use a secure `wss://`
endpoint if your browser blocks the connection. The local backend is intended
for local use, not public deployment.

## Deploy to Netlify

Connect this repository to Netlify and use the settings in `netlify.toml`. The
build command copies only `index.html`, `styles.css`, and `script.js` into the
`dist` publish directory. No Python backend is deployed or required for the
public demo. After deployment, open the site and try the demo controls.

## Packet format

`A_Elbow_WristRight_WristLeft_Claw_ShoulderM1_ShoulderM2`

Each channel ranges from 0 to 255. The backend uses 128 for neutral and 56 or
200 for directional commands. The dashboard retains up to 150 recent packets.
