// main.js: Bootstrap. Canvas setup, render loop, staged scenes, test hook.

import { createGame, startGame, startTurn, endTurn, checkWin, playSelectedToRitual, castSelectedSpell, toggleMute, stageScene, snapshot, initGame } from './game.js';
import { initInput } from './input.js';
import { clearCanvas, renderTable } from './render.js';
import { drawUI, drawTitle, drawHelp, drawEnd } from './ui.js';
import { animate } from './animator.js';
import { LAYOUT } from './table.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = createGame();

// Bind the state machine actions onto the game object for input handling.
game.startGame = () => startGame(game);
game.playSelectedToRitual = () => playSelectedToRitual(game);
game.castSelectedSpell = () => castSelectedSpell(game);
game.toggleMute = () => toggleMute(game);
game.initGame = () => initGame(game);
game.startTurn = () => startTurn(game);
game.endTurn = () => endTurn(game);
game.checkWin = () => checkWin(game);
game.snapshot = () => snapshot(game);

const params = new URLSearchParams(window.location.search);
const scene = params.get('scene');
if (scene === 'table' || scene === 'win' || scene === 'loss') {
  stageScene(game, scene);
} else if (scene === 'title') {
  game.screen = 'title';
}

initInput(canvas, game);

let last = performance.now();

function frame(now) {
  const dt = Math.min(50, now - last);
  last = now;
  animate(dt);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 0.05);
  if (game.flash && now > game.flash.until) game.flash = null;

  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  clearCanvas(ctx);
  if (game.screen === 'title') {
    drawTitle(ctx, game, now);
  } else if (game.screen === 'help') {
    drawHelp(ctx);
  } else if (game.screen === 'win') {
    renderTable(ctx, game, now);
    drawEnd(ctx, game, true);
  } else if (game.screen === 'loss') {
    renderTable(ctx, game, now);
    drawEnd(ctx, game, false);
  } else {
    renderTable(ctx, game, now);
    drawUI(ctx, game, now);
  }
  if (game.flash) {
    ctx.fillStyle = game.flash.color;
    ctx.fillRect(0, 0, LAYOUT.width, LAYOUT.height);
  }
  ctx.restore();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.__game = game;
