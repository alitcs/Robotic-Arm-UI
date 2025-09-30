# Arm Dynamics + Web UI

# Arm Control System with Web UI

## Overview

This project extends the Python arm control system with a **WebSocket server** and a **browser-based UI**.  
It allows real-time visualization of motor PWM values and command packets in the browser.

## Files

- **Backend:**
  - `backendsender.py` — Captures keyboard input with PyGame, builds packets, and broadcasts them via WebSocket.
- **Frontend (UI):**
  - `index.html` — Web UI layout
  - `styles.css` — Styling for gauges, packet log, and status
  - `script.js` — Connects to WebSocket, parses packets, and updates UI

## Packet Format

Same as the non-UI project:

A_Elbow_WristRight_WristLeft_Claw_ShoulderM1_ShoulderM2

## Controls

Keyboard mappings are the same as in `sender.py`:

- **No modifier (default):** Wrist control
- **Hold `Shift`:** Shoulder control
- **Hold `Ctrl`:** Elbow + Claw control

Press `ESC` to quit backend.

## How to Run

1. Install Python ≥3.12 and `pygame`, `websockets`:
   ```bash
   pip install pygame websockets
   ```

Start the backend WebSocket server:

python backendsender.py

This runs on ws://127.0.0.1:8765.

Open index.html in your browser.

The status indicator should show Connected once linked.

Motor PWM gauges and packet logs update in real time as you use the keyboard.

Features

Live Gauges: Each motor channel displayed as a bar (0–255).

Packet Log: Recent commands stored and scrollable.

Connection Handling: Auto-reconnect if server restarts.

Example Flow

Run backend

Open frontend in browser

Hold Shift + W → Shoulder forward

UI updates gauges + logs packet A_128_128_128_128_200_128
