// input.js: Mouse and keyboard input, mapped to game actions.

import { LAYOUT } from './table.js';
import { initAudio } from './audio.js';

export function initInput(canvas, game) {
  canvas.addEventListener('click', (ev) => {
    initAudio();
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (LAYOUT.width / rect.width);
    const y = (ev.clientY - rect.top) * (LAYOUT.height / rect.height);
    handleClick(x, y, game);
  });
  window.addEventListener('keydown', (ev) => {
    initAudio();
    handleKey(ev.key, game);
  });
}

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function handleClick(x, y, game) {
  if (game.screen === 'title') {
    if (inRect(x, y, { x: 490, y: 400, w: 300, h: 56 })) game.startGame();
    else if (inRect(x, y, { x: 490, y: 476, w: 300, h: 56 })) game.screen = 'help';
    return;
  }
  if (game.screen === 'help') {
    if (inRect(x, y, { x: 540, y: 620, w: 200, h: 48 })) game.screen = 'title';
    return;
  }
  if (game.screen === 'win' || game.screen === 'loss') {
    if (inRect(x, y, { x: 490, y: 520, w: 300, h: 56 })) game.startGame();
    return;
  }
  if (game.screen !== 'playing' || game.turn !== 'player') return;

  // Hand cards.
  for (let i = 0; i < game.player.hand.length; i++) {
    const pos = game.table.handCardPos(i, game.player.hand.length);
    if (inRect(x, y, pos)) {
      game.selected = game.selected === i ? null : i;
      return;
    }
  }
  // Action buttons.
  if (inRect(x, y, LAYOUT.ritualButton)) game.playSelectedToRitual();
  else if (inRect(x, y, LAYOUT.spellButton)) game.castSelectedSpell();
}

export function handleKey(key, game) {
  const k = key.toLowerCase();
  if (game.screen === 'title' && (key === 'Enter' || key === ' ')) {
    game.startGame();
    return;
  }
  if (game.screen === 'help' && (key === 'Escape' || key === 'Enter')) {
    game.screen = 'title';
    return;
  }
  if ((game.screen === 'win' || game.screen === 'loss') && key === 'Enter') {
    game.startGame();
    return;
  }
  if (game.screen !== 'playing' || game.turn !== 'player') return;
  if (k >= '1' && k <= '7') {
    const i = parseInt(k, 10) - 1;
    if (i < game.player.hand.length) game.selected = game.selected === i ? null : i;
    return;
  }
  if (k === 'r') game.playSelectedToRitual();
  else if (k === 's') game.castSelectedSpell();
  else if (k === 'h') game.screen = 'help';
  else if (k === 'm') game.toggleMute();
}
