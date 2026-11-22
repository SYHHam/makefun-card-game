// CDP driver for Ritual & Ruin: play test and screenshots.
// Serves game/ on localhost, drives headless Chrome over CDP.
// Usage: node test-play.mjs [shots|play]
import { writeFileSync, mkdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9334;
const GAME_DIR = '/home/hatch/workspace/makefun/card-game/card-entry/game';
const SHOT_DIR = '/home/hatch/workspace/makefun/card-game/card-entry/screenshots';
const HTTP_PORT = 8123;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startServer() {
  return spawn('python3', ['-m', 'http.server', String(HTTP_PORT), '--bind', '127.0.0.1'], {
    cwd: GAME_DIR, stdio: 'ignore',
  });
}

async function launchChrome() {
  const policyPath = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
  const policySha = createHash('sha256').update(readFileSync(policyPath)).digest('hex');
  const proc = spawn(CHROME, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--hatch-webgl-allowed-domains-file=${policyPath}`,
    `--hatch-webgl-allowed-domains-sha256=${policySha}`,
    '--remote-debugging-port=' + PORT,
    '--window-size=1280,720',
    '--allow-file-access-from-files',
    '--user-data-dir=/tmp/card-game-chrome',
    'about:blank',
  ], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://localhost:' + PORT + '/json/version');
      if (res.ok) return proc;
    } catch (e) { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('chrome did not come up');
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    };
  }
  async send(method, params) {
    await this.ready;
    const id = ++this.id;
    const p = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    return p;
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  }
  async click(x, y) {
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  async shot(path, format, quality) {
    const r = await this.send('Page.captureScreenshot', { format: format || 'jpeg', quality: quality || 80 });
    writeFileSync(path, Buffer.from(r.data, 'base64'));
  }
  consoleErrors() {
    return this.events.filter((e) =>
      (e.method === 'Runtime.exceptionThrown') ||
      (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'));
  }
  failedRequests() {
    return this.events.filter((e) =>
      (e.method === 'Network.loadingFailed') ||
      (e.method === 'Network.responseReceived' && e.params.response.status >= 400));
  }
}

async function newTab(url) {
  const res = await fetch('http://localhost:' + PORT + '/json/new?about:blank', { method: 'PUT' });
  const target = await res.json();
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url });
  await sleep(2000);
  return cdp;
}

function gameUrl(query) {
  return 'file://' + GAME_DIR + '/index.html' + (query || '');
}

const snap = () => `(() => { const g = window.__game; return g ? g.snapshot() : null; })()`;

async function waitFor(cdp, pred, timeoutMs, label) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const s = await cdp.eval(snap());
    if (s && pred(s)) return s;
    await sleep(300);
  }
  throw new Error('timeout waiting for: ' + label);
}

async function playTest() {
  const server = startServer();
  const proc = await launchChrome();
  const errors = [];
  try {
    const cdp = await newTab(gameUrl());
    let s = await cdp.eval(snap());
    console.log('1 title screen:', JSON.stringify(s));
    if (!s || s.screen !== 'title') throw new Error('expected title screen');

    // START GAME.
    await cdp.click(640, 428);
    s = await waitFor(cdp, (v) => v.screen === 'playing', 5000, 'playing');
    console.log('2 after START:', JSON.stringify(s));

    // Wait until it is the player's turn (AI may start).
    s = await waitFor(cdp, (v) => v.turn === 'player', 8000, 'player turn');
    console.log('3 player turn, hand:', s.handSize, 'deck:', s.deckCount);

    // Select first hand card and play it to ritual.
    const handBefore = s.handSize;
    const ritualBefore = s.playerRitual.length;
    await cdp.click(290, 545);
    await sleep(200);
    s = await cdp.eval(snap());
    console.log('4 after selecting card 0:', JSON.stringify({ selected: s.selected }));
    if (s.selected !== 0) throw new Error('card 0 was not selected');
    await cdp.click(875, 662);
    await sleep(300);
    s = await cdp.eval(snap());
    console.log('5 after PLAY TO RITUAL:', JSON.stringify(s));
    if (s.handSize !== handBefore - 1) throw new Error('hand did not shrink after ritual play');
    if (s.playerRitual.length !== ritualBefore + 1) throw new Error('ritual area did not grow');

    // Wait for the AI turn to finish and the player to draw again.
    s = await waitFor(cdp, (v) => v.turn === 'player' && v.handSize === handBefore, 10000, 'player turn again');
    console.log('6 after AI turn:', JSON.stringify(s));

    // Cast a spell with the first hand card.
    const aiCandlesBefore = s.aiCandles;
    const myCandlesBefore = s.playerCandles;
    const aiRitualBefore = s.aiRitual.length;
    const aiHandBefore = s.aiHandSize;
    const discardBefore = s.discardCount;
    await cdp.click(290, 545);
    await sleep(200);
    await cdp.click(1085, 662);
    await sleep(300);
    s = await cdp.eval(snap());
    console.log('7 after CAST SPELL:', JSON.stringify(s));
    if (s.handSize !== handBefore - 1) throw new Error('hand did not shrink after spell');
    if (s.discardCount <= discardBefore) throw new Error('discard did not grow after spell');
    const spellChanged =
      s.aiCandles !== aiCandlesBefore ||
      s.playerCandles !== myCandlesBefore ||
      s.aiRitual.length !== aiRitualBefore ||
      s.aiHandSize !== aiHandBefore;
    if (!spellChanged) throw new Error('spell had no visible effect');
    console.log('7b spell effect confirmed (candles/ritual/hand changed)');

    // Staged scenes render.
    for (const scene of ['win', 'loss', 'table']) {
      const c2 = await newTab(gameUrl('?scene=' + scene));
      const s2 = await c2.eval(snap());
      console.log('8 scene=' + scene + ':', JSON.stringify(s2));
      const want = scene === 'table' ? 'playing' : scene;
      if (!s2 || s2.screen !== want) throw new Error('scene ' + scene + ' did not render, got ' + (s2 && s2.screen));
      c2.ws.close();
    }

    const errs = cdp.consoleErrors();
    const failed = cdp.failedRequests();
    console.log('console errors:', errs.length);
    for (const e of errs.slice(0, 5)) console.log(JSON.stringify(e).slice(0, 400));
    console.log('failed requests:', failed.length);
    for (const e of failed.slice(0, 5)) console.log(JSON.stringify(e).slice(0, 400));
    if (errs.length) throw new Error('console errors present');
    if (failed.length) throw new Error('failed requests present');
    console.log('PLAY TEST PASSED');
  } catch (e) {
    console.log('PLAY TEST FAILED:', e.message);
    errors.push(e);
  } finally {
    proc.kill();
    server.kill();
  }
  if (errors.length) process.exit(1);
}

async function takeShots() {
  const server = startServer();
  const proc = await launchChrome();
  try {
    mkdirSync(SHOT_DIR, { recursive: true });
    const jobs = [
      ['table', '1-cover.jpg'],
      ['title', '2-title.jpg'],
      ['win', '3-win.jpg'],
      ['loss', '4-loss.jpg'],
    ];
    for (const [scene, file] of jobs) {
      const cdp = await newTab(gameUrl('?scene=' + scene));
      await sleep(1000);
      const s = await cdp.eval(snap());
      console.log(scene, JSON.stringify(s));
      await cdp.shot(SHOT_DIR + '/' + file, 'jpeg', 80);
      const bytes = statSync(SHOT_DIR + '/' + file).size;
      console.log(file, bytes + ' bytes');
      const errs = cdp.consoleErrors();
      if (errs.length) console.log(scene, 'console errors:', errs.length, JSON.stringify(errs[0]).slice(0, 300));
      cdp.ws.close();
    }
    console.log('SHOTS DONE');
  } finally {
    proc.kill();
    server.kill();
  }
}

const mode = process.argv[2] || 'play';
if (mode === 'shots') await takeShots();
else await playTest();
