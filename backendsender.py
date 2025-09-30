import asyncio, websockets
import pygame

NEUTRAL = 128

def make_packet(elbow, wr, wl, claw, sh1, sh2):
    return f"A_{elbow}_{wr}_{wl}_{claw}_{sh1}_{sh2}"

def shift_movement(vals, keys):
    FORWARD = 200   # ShoulderM1 forward
    BACK    = 56    # ShoulderM1 backward
    CW      = 200   # ShoulderM2 clockwise
    CCW     = 56    # ShoulderM2 counterclockwise

    sh1 = NEUTRAL
    sh2 = NEUTRAL

    if keys[pygame.K_w]:
        sh1 = FORWARD
    elif keys[pygame.K_s]:
        sh1 = BACK

    if keys[pygame.K_a]:
        sh2 = CCW
    elif keys[pygame.K_d]:
        sh2 = CW

    vals[4] = sh1
    vals[5] = sh2

def ctrl_movement(vals, keys):
    # Elbow + Claw when Ctrl is held
    UP = 200
    DOWN = 56
    OPEN = 200
    CLOSE = 56

    if keys[pygame.K_w]:
        vals[0] = UP      # Elbow up
    elif keys[pygame.K_s]:
        vals[0] = DOWN    # Elbow down

    if keys[pygame.K_a]:
        vals[3] = CLOSE   # Claw close
    elif keys[pygame.K_d]:
        vals[3] = OPEN    # Claw open

def wrist_movement(vals, keys):
    # Default mode (no modifiers): wrists together/up-down or rotate
    UP = 200
    DOWN = 56

    if keys[pygame.K_w]:  # Wrists together up
        vals[1] = UP
        vals[2] = UP
    elif keys[pygame.K_s]:  # Wrists together down
        vals[1] = DOWN
        vals[2] = DOWN

    if keys[pygame.K_d]:  # Rotate clockwise
        vals[1] = DOWN
        vals[2] = UP
    elif keys[pygame.K_a]:  # Rotate counterclockwise
        vals[1] = UP
        vals[2] = DOWN

clients = set()

async def ws_handler(ws):
    clients.add(ws)
    try:
        async for _ in ws:
            # This server is one-way (outbound). Ignore inbound messages.
            pass
    finally:
        clients.discard(ws)

async def keypoll_and_broadcast():
    """
    Poll pygame keys ~50 Hz, build packets, and broadcast to all WS clients
    only when values change.
    """
    pygame.init()
    # Tiny hidden window just so pygame can read keyboard on all platforms
    pygame.display.set_mode((200, 100))
    pygame.display.set_caption("Arm Sender (WebSocket)")

    clock = pygame.time.Clock()
    prev_vals = [NEUTRAL]*6

    while True:
        # Process events so key states update and window remains responsive
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return

        keys = pygame.key.get_pressed()
        # Start neutral each tick; then apply one mode
        vals = [NEUTRAL]*6

        shift_down = keys[pygame.K_LSHIFT] or keys[pygame.K_RSHIFT]
        ctrl_down  = keys[pygame.K_LCTRL]  or keys[pygame.K_RCTRL]

        if shift_down:
            shift_movement(vals, keys)
        elif ctrl_down:
            ctrl_movement(vals, keys)
        else:
            wrist_movement(vals, keys)

        if vals != prev_vals:
            pkt = make_packet(*vals)
            # Print locally for debugging
            print(pkt)
            # Broadcast to all connected clients
            dead = []
            for ws in list(clients):
                try:
                    await ws.send(pkt)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                clients.discard(ws)

            prev_vals = vals

        # ~50 Hz loop
        clock.tick(50)
        await asyncio.sleep(0)  # yield to event loop

async def main():
    async with websockets.serve(ws_handler, "127.0.0.1", 8765, max_queue=None):
        # Run the key polling + broadcasting coroutine alongside the WS server
        await keypoll_and_broadcast()

if __name__ == "__main__":
    asyncio.run(main())
