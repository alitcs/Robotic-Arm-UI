const WS_URL = location.search.match(/ws=([^&]+)/)?.[1]
  ? decodeURIComponent(location.search.match(/ws=([^&]+)/)[1])
  : "ws://localhost:8765";

const slabel = document.getElementById("slabel");
const latest = document.getElementById("latest");
const logEl = document.getElementById("log");
const gaugesBox = document.getElementById("gauges");

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
  return { fill: row.querySelector(".fill"), val: row.querySelector(".val") };
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
  });
}

function connect() {
  const ws = new WebSocket(WS_URL);
  slabel.textContent = "Connecting…";
  ws.onopen = () => {
    slabel.textContent = "Connected";
  };
  ws.onmessage = (e) => {
    const line = String(e.data);
    latest.textContent = line;
    const n = parse(line);
    if (n) render(n);
    buf.push(line);
    if (buf.length > MAX) buf.shift();
    logEl.textContent = buf.join("\n");
    logEl.scrollTop = logEl.scrollHeight;
  };
  ws.onclose = () => {
    slabel.textContent = "Reconnecting…";
    setTimeout(connect, 800);
  };
}
connect();
