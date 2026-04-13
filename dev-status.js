const http = require('http');
const net = require('net');
const { execSync } = require('child_process');

const PORT = 3333;

const services = [
  { name: 'Firebase Auth Emulator',     port: 9099, url: 'http://localhost:9099' },
  { name: 'Firebase Functions Emulator', port: 5001, url: 'http://localhost:5001' },
  { name: 'Firestore Emulator',         port: 8080, url: 'http://localhost:8080' },
  { name: 'Emulator UI',                port: 4000, url: 'http://localhost:4000' },
  { name: 'Emulator Hub',               port: 4400, url: 'http://localhost:4400' },
  { name: 'Web Dev Server (Vite)',       port: 5173, url: 'http://localhost:5173' },
];

// Group: emulator ports share a single parent process
const emulatorPorts = [9099, 5001, 8080, 4000, 4400];

function checkPort(port) {
  function tryHost(host) {
    return new Promise((resolve) => {
      const sock = net.createConnection({ port, host }, () => {
        sock.destroy();
        resolve(true);
      });
      sock.setTimeout(1000);
      sock.once('timeout', () => { sock.destroy(); resolve(false); });
      sock.once('error', () => { sock.destroy(); resolve(false); });
    });
  }
  return tryHost('127.0.0.1').then((ok) => ok ? true : tryHost('::1'));
}

function findPidsByPort(port) {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    return out ? out.split('\n').map(Number) : [];
  } catch {
    return [];
  }
}

function killByPort(port) {
  const pids = findPidsByPort(port);
  if (pids.length === 0) return { ok: false, message: `No process on port ${port}` };
  for (const pid of pids) {
    try { process.kill(pid, 'SIGTERM'); } catch {}
  }
  return { ok: true, message: `Killed PID(s) ${pids.join(', ')} on port ${port}` };
}

function killEmulators() {
  // Find the parent firebase process via any emulator port
  const allPids = new Set();
  for (const port of emulatorPorts) {
    findPidsByPort(port).forEach((p) => allPids.add(p));
  }
  if (allPids.size === 0) return { ok: false, message: 'No emulator processes found' };
  for (const pid of allPids) {
    try { process.kill(pid, 'SIGTERM'); } catch {}
  }
  return { ok: true, message: `Killed emulator PID(s): ${[...allPids].join(', ')}` };
}

const HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>Local Dev Status</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #1a1a2e; color: #eee; padding: 40px; }
    h1 { font-size: 24px; margin-bottom: 24px; color: #e0e0e0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .card {
      background: #16213e; border-radius: 12px; padding: 20px;
      border: 1px solid #0f3460; transition: border-color 0.3s;
    }
    .card.up { border-color: #00d97e; }
    .card.down { border-color: #e63946; }
    .card.checking { border-color: #f4a261; }
    .name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .url { font-size: 12px; color: #888; margin-bottom: 12px; word-break: break-all; }
    .url a { color: #888; text-decoration: none; }
    .url a:hover { color: #aaa; text-decoration: underline; }
    .row { display: flex; align-items: center; justify-content: space-between; }
    .status { display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot.up { background: #00d97e; box-shadow: 0 0 6px #00d97e; }
    .dot.down { background: #e63946; }
    .dot.checking { background: #f4a261; }
    .kill-btn {
      background: #e63946; color: white; border: none; border-radius: 6px;
      padding: 4px 12px; font-size: 12px; cursor: pointer; display: none;
    }
    .kill-btn:hover { background: #c62828; }
    .kill-btn.visible { display: inline-block; }
    .kill-btn:disabled { background: #555; cursor: not-allowed; }
    .group-actions { margin-bottom: 20px; display: flex; gap: 12px; }
    .group-btn {
      background: #0f3460; color: #eee; border: 1px solid #e63946; border-radius: 8px;
      padding: 8px 16px; font-size: 13px; cursor: pointer;
    }
    .group-btn:hover { background: #e63946; }
    .group-btn:disabled { background: #333; border-color: #555; color: #666; cursor: not-allowed; }
    .footer { margin-top: 32px; font-size: 12px; color: #555; }
    #lastCheck { color: #888; }
    .toast {
      position: fixed; bottom: 24px; right: 24px; background: #16213e;
      border: 1px solid #0f3460; border-radius: 8px; padding: 12px 20px;
      font-size: 13px; color: #eee; opacity: 0; transition: opacity 0.3s;
      pointer-events: none;
    }
    .toast.show { opacity: 1; }
  </style>
</head>
<body>
  <h1>Local Dev Status</h1>
  <div class="group-actions">
    <button class="group-btn" id="kill-emulators" onclick="killGroup('emulators')">Stop All Emulators</button>
    <button class="group-btn" id="kill-web" onclick="killGroup('web')">Stop Web Dev Server</button>
  </div>
  <div class="grid" id="cards"></div>
  <div class="footer">
    Auto-refresh: 5s &nbsp;|&nbsp; Last check: <span id="lastCheck">-</span>
  </div>
  <div class="toast" id="toast"></div>

  <script>
    const services = ${JSON.stringify(services)};
    const emulatorPorts = ${JSON.stringify(emulatorPorts)};
    const grid = document.getElementById('cards');
    const lastCheckEl = document.getElementById('lastCheck');
    let statuses = {};

    services.forEach((s, i) => {
      grid.innerHTML += \`
        <div class="card checking" id="card-\${i}">
          <div class="name">\${s.name}</div>
          <div class="url"><a href="\${s.url}" target="_blank">\${s.url}</a></div>
          <div class="row">
            <div class="status">
              <div class="dot checking" id="dot-\${i}"></div>
              <span id="label-\${i}">Checking...</span>
            </div>
            <button class="kill-btn" id="kill-\${i}" onclick="killService(\${s.port}, \${i})">Stop</button>
          </div>
        </div>\`;
    });

    function toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    }

    async function checkAll() {
      try {
        const res = await fetch('/status');
        const data = await res.json();
        statuses = data;
        services.forEach((s, i) => {
          const up = data[s.port];
          const card = document.getElementById('card-' + i);
          const dot = document.getElementById('dot-' + i);
          const label = document.getElementById('label-' + i);
          const btn = document.getElementById('kill-' + i);
          card.className = up ? 'card up' : 'card down';
          dot.className = up ? 'dot up' : 'dot down';
          label.textContent = up ? 'Running' : 'Down';
          btn.className = up ? 'kill-btn visible' : 'kill-btn';
        });
        // group buttons
        const anyEmulator = emulatorPorts.some(p => data[p]);
        document.getElementById('kill-emulators').disabled = !anyEmulator;
        const webUp = data[5173];
        document.getElementById('kill-web').disabled = !webUp;
      } catch {
        // status server itself might be down
      }
      lastCheckEl.textContent = new Date().toLocaleTimeString();
    }

    async function killService(port, idx) {
      const btn = document.getElementById('kill-' + idx);
      btn.disabled = true;
      btn.textContent = '...';
      try {
        const res = await fetch('/kill/' + port, { method: 'POST' });
        const data = await res.json();
        toast(data.message);
      } catch (e) {
        toast('Failed: ' + e.message);
      }
      btn.textContent = 'Stop';
      btn.disabled = false;
      setTimeout(checkAll, 1000);
    }

    async function killGroup(group) {
      const btn = document.getElementById('kill-' + (group === 'emulators' ? 'emulators' : 'web'));
      btn.disabled = true;
      try {
        const res = await fetch('/kill-group/' + group, { method: 'POST' });
        const data = await res.json();
        toast(data.message);
      } catch (e) {
        toast('Failed: ' + e.message);
      }
      setTimeout(checkAll, 1500);
    }

    checkAll();
    setInterval(checkAll, 5000);
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    const results = {};
    await Promise.all(services.map(async (s) => {
      results[s.port] = await checkPort(s.port);
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/kill/')) {
    const port = parseInt(req.url.split('/')[2], 10);
    if (!port) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: 'Invalid port' }));
      return;
    }
    const result = killByPort(port);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (req.method === 'POST' && req.url === '/kill-group/emulators') {
    const result = killEmulators();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (req.method === 'POST' && req.url === '/kill-group/web') {
    const result = killByPort(5173);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Dev Status Dashboard: http://localhost:${PORT}`);
});
