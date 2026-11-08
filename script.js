const params = new URLSearchParams(location.search);
const WS_URL = params.get("ws") || "ws://localhost:8765";

const slabel = document.getElementById("slabel");
const latest = document.getElementById("latest");
const logEl = document.getElementById("log");
const gaugesBox = document.getElementById("gauges");
const demoControls = document.getElementById("demo-controls");
const localHelp = document.getElementById("local-help");
const demoMode = document.getElementById("demo-mode");
const modeInputs = document.querySelectorAll('input[name="connection"]');
const demoButtons = document.querySelectorAll("[data-key]");
const guides = document.querySelectorAll("[data-guide]");
const interactionNote = document.getElementById("interaction-note");
const packetCount = document.getElementById("packet-count");
const status = document.getElementById("status");
const arm = document.getElementById("arm");
const armState = document.getElementById("arm-state");
const motionLabel = document.getElementById("motion-label");
const demoDisclaimer = document.getElementById("demo-disclaimer");
const buttonLabels = {
  wrist: { w: "Wrist up", a: "Rotate counterclockwise", s: "Wrist down", d: "Rotate clockwise" },
  shoulder: { w: "Shoulder forward", a: "Rotate counterclockwise", s: "Shoulder back", d: "Rotate clockwise" },
  elbow: { w: "Elbow up", a: "Close claw", s: "Elbow down", d: "Open claw" },
};
const arrowKeys = { ArrowUp: "w", ArrowLeft: "a", ArrowDown: "s", ArrowRight: "d" };

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
window.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse" || motionPreference.matches) return;
  document.body.style.setProperty("--cursor-x", `${event.clientX}px`);
  document.body.style.setProperty("--cursor-y", `${event.clientY}px`);
  document.body.classList.add("has-cursor");
}, { passive: true });
document.addEventListener("pointerleave", () => document.body.classList.remove("has-cursor"));
motionPreference.addEventListener("change", () => document.body.classList.remove("has-cursor"));

const labels = [
  "Elbow",
  "WristRight",
  "WristLeft",
  "Claw",
  "ShoulderM1",
  "ShoulderM2",
];
const gauges = labels.map((name) => {
  const row = document.createElement("div");
  row.className = "gauge";
  row.innerHTML = `<div class="name">${name}</div><div class="bar"><div class="fill"></div><div class="neutral"></div></div><div class="val">—</div>`;
  gaugesBox.appendChild(row);
  return { row, fill: row.querySelector(".fill"), val: row.querySelector(".val") };
});

const buf = [];
const MAX = 150;
function parse(line) {
  const p = line.trim().split("_");
  if (p[0] !== "A" || p.length !== 7) return null;
  const n = p.slice(1).map(Number);
  if (n.some((x) => !Number.isFinite(x) || x < 0 || x > 255)) return null;
  return n;
}
function render(nums) {
  nums.forEach((v, i) => {
    gauges[i].fill.style.width = (v / 255) * 100 + "%";
    gauges[i].val.textContent = v;
    gauges[i].row.classList.toggle("is-active", v !== 128);
  });
  const [elbow, wristRight, wristLeft, claw, shoulderM1, shoulderM2] = nums;
  const offset = (value) => (value - 128) / 127;
  const wristTilt = (offset(wristRight) + offset(wristLeft)) / 2;
  const wristRotation = (offset(wristLeft) - offset(wristRight)) / 2;
  arm.style.setProperty("--shoulder-angle", `${offset(shoulderM1) * 35}deg`);
  arm.style.setProperty("--shoulder-yaw", `${offset(shoulderM2) * 55}deg`);
  arm.style.setProperty("--elbow-angle", `${offset(elbow) * 45}deg`);
  arm.style.setProperty("--wrist-angle", `${wristTilt * 65}deg`);
  arm.style.setProperty("--wrist-roll", `${wristRotation * 90}deg`);
  arm.style.setProperty("--claw-angle", `${offset(claw) * 22}deg`);
  const active = [];
  [
    ["shoulder", shoulderM1 !== 128 || shoulderM2 !== 128, "SHOULDER"],
    ["elbow", elbow !== 128, "ELBOW"],
    ["wrist", wristRight !== 128 || wristLeft !== 128, "WRIST"],
    ["claw", claw !== 128, "CLAW"],
  ].forEach(([part, isActive, label]) => {
    arm.classList.toggle(`${part}-active`, isActive);
    if (isActive) active.push(label);
  });
  armState.textContent = active.length ? `${active.join(" + ")} ACTIVE` : "ALL CHANNELS NEUTRAL";
  const motion = [];
  const direction = (value, positive, negative) => {
    if (value > 0) motion.push(positive);
    else if (value < 0) motion.push(negative);
  };
  direction(offset(shoulderM1), "SHOULDER FORWARD", "SHOULDER BACK");
  direction(offset(shoulderM2), "SHOULDER CW", "SHOULDER CCW");
  direction(offset(elbow), "ELBOW UP", "ELBOW DOWN");
  direction(wristTilt, "WRIST UP", "WRIST DOWN");
  direction(wristRotation, "WRIST CW", "WRIST CCW");
  direction(offset(claw), "CLAW OPEN", "CLAW CLOSE");
  motionLabel.textContent = motion.length ? motion.join(" / ") : "WAITING FOR MOVEMENT";
}
function receivePacket(line) {
  latest.textContent = line;
  const nums = parse(line);
  if (nums) render(nums);
  buf.push(line);
  if (buf.length > MAX) buf.shift();
  logEl.textContent = buf.join("\n");
  logEl.scrollTop = logEl.scrollHeight;
  packetCount.textContent = `/ ${buf.length}`;
}
document.getElementById("clear-log").addEventListener("click", () => {
  buf.length = 0;
  logEl.textContent = "";
  packetCount.textContent = "/ 0";
});

let connection = "demo";
let socket = null;
let reconnectTimer = null;
let demoTimer = null;
let lastDemoPacket = "";
const pressed = new Set();

function demoPacket(keys, mode) {
  const values = [128, 128, 128, 128, 128, 128];
  if (mode === "shoulder") {
    if (keys.has("w")) values[4] = 200;
    else if (keys.has("s")) values[4] = 56;
    if (keys.has("a")) values[5] = 56;
    else if (keys.has("d")) values[5] = 200;
  } else if (mode === "elbow") {
    if (keys.has("w")) values[0] = 200;
    else if (keys.has("s")) values[0] = 56;
    if (keys.has("a")) values[3] = 56;
    else if (keys.has("d")) values[3] = 200;
  } else {
    if (keys.has("w")) values[1] = values[2] = 200;
    else if (keys.has("s")) values[1] = values[2] = 56;
    if (keys.has("d")) {
      values[1] = 56;
      values[2] = 200;
    } else if (keys.has("a")) {
      values[1] = 200;
      values[2] = 56;
    }
  }
  return `A_${values.join("_")}`;
}

function updateDemo(keys, mode) {
  guides.forEach((guide) => {
    guide.classList.toggle("is-active", guide.dataset.guide === mode);
  });
  demoButtons.forEach((button) => {
    button.classList.toggle("is-active", demoMode.value === mode && keys.has(button.dataset.key));
  });
  const modeName = { wrist: "WRIST", shoulder: "SHOULDER", elbow: "ELBOW + CLAW" }[mode];
  interactionNote.textContent = `${["w", "a", "s", "d"].some((key) => keys.has(key)) ? "COMMAND ACTIVE" : "ARROW KEYS READY"} / ${modeName} MODE`;
  const packet = demoPacket(keys, mode);
  if (packet !== lastDemoPacket) {
    lastDemoPacket = packet;
    receivePacket(packet);
  }
}

function keyboardMode() {
  if (pressed.has("shift")) return "shoulder";
  if (pressed.has("control")) return "elbow";
  return "wrist";
}

function connect() {
  status.dataset.state = "waiting";
  slabel.textContent = "Connecting to local backend…";
  try {
    socket = new WebSocket(WS_URL);
  } catch (error) {
    slabel.textContent = `Invalid WebSocket endpoint: ${error.message}`;
    return;
  }
  const currentSocket = socket;
  currentSocket.onopen = () => {
    if (socket === currentSocket) {
      status.dataset.state = "connected";
      slabel.textContent = "Connected to local backend";
    }
  };
  currentSocket.onmessage = (event) => {
    if (socket === currentSocket) receivePacket(String(event.data));
  };
  currentSocket.onclose = () => {
    if (socket !== currentSocket) return;
    socket = null;
    status.dataset.state = "waiting";
    slabel.textContent = "Local backend disconnected; reconnecting…";
    armState.textContent = "DISCONNECTED / LAST COMMAND";
    motionLabel.textContent = "LAST RECEIVED COMMAND";
    reconnectTimer = setTimeout(connect, 800);
  };
}

function setConnection(mode) {
  connection = mode;
  clearTimeout(reconnectTimer);
  clearTimeout(demoTimer);
  pressed.clear();
  if (socket) {
    const oldSocket = socket;
    socket = null;
    oldSocket.close();
  }
  buf.length = 0;
  logEl.textContent = "";
  packetCount.textContent = "/ 0";
  latest.textContent = "—";
  arm.removeAttribute("style");
  arm.classList.remove("shoulder-active", "elbow-active", "wrist-active", "claw-active");
  armState.textContent = "WAITING FOR COMMAND";
  motionLabel.textContent = "WAITING FOR MOVEMENT";
  gauges.forEach(({ row, fill, val }) => {
    row.classList.remove("is-active");
    fill.style.width = "0%";
    val.textContent = "—";
  });
  demoControls.hidden = mode !== "demo";
  demoDisclaimer.hidden = mode !== "demo";
  localHelp.hidden = mode !== "local";
  if (mode === "demo") {
    status.dataset.state = "demo";
    slabel.textContent = "Simulated data";
    lastDemoPacket = "";
    updateDemo(pressed, keyboardMode());
  } else {
    connect();
  }
}

modeInputs.forEach((input) => {
  input.addEventListener("change", () => setConnection(input.value));
});

document.addEventListener("keydown", (event) => {
  if (connection !== "demo" || event.target.closest('select, input, textarea, a, [contenteditable]')) return;
  const key = arrowKeys[event.key] || (event.key === "Shift" ? "shift" : event.key === "Control" ? "control" : null);
  if (!key || event.altKey || event.metaKey) return;
  if (arrowKeys[event.key]) {
    event.preventDefault();
    if (event.shiftKey) pressed.add("shift");
    else pressed.delete("shift");
    if (event.ctrlKey) pressed.add("control");
    else pressed.delete("control");
  }
  clearTimeout(demoTimer);
  pressed.add(key);
  updateDemo(pressed, keyboardMode());
});
document.addEventListener("keyup", (event) => {
  if (connection !== "demo") return;
  const key = arrowKeys[event.key] || (event.key === "Shift" ? "shift" : event.key === "Control" ? "control" : null);
  if (!pressed.has(key)) return;
  pressed.delete(key);
  updateDemo(pressed, keyboardMode());
});
window.addEventListener("blur", () => {
  if (connection !== "demo") return;
  clearTimeout(demoTimer);
  pressed.clear();
  updateDemo(pressed, keyboardMode());
});
demoMode.addEventListener("change", () => {
  clearTimeout(demoTimer);
  pressed.clear();
  demoButtons.forEach((button) => {
    button.querySelector("span").textContent = buttonLabels[demoMode.value][button.dataset.key];
  });
  if (connection === "demo") updateDemo(pressed, keyboardMode());
});
demoButtons.forEach((button) => {
  button.addEventListener("click", () => {
    clearTimeout(demoTimer);
    pressed.clear();
    updateDemo(new Set([button.dataset.key]), demoMode.value);
    demoTimer = setTimeout(() => updateDemo(pressed, keyboardMode()), 600);
  });
});

const initialMode = params.has("ws") ? "local" : "demo";
document.querySelector(`input[name="connection"][value="${initialMode}"]`).checked = true;
setConnection(initialMode);
