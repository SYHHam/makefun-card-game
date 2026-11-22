// deck.js: Deck class plus shuffle / draw / discard helpers.

import { buildComponentDeck } from './card.js';

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

export function draw(deck) {
  return deck.draw();
}

export function discard(deck, card) {
  deck.discard(card);
}

export class Deck {
  constructor(cards) {
    this.cards = cards ? cards.slice() : buildComponentDeck();
    this.discardPile = [];
  }

  shuffle() {
    shuffle(this.cards);
    return this;
  }

  draw() {
    if (this.cards.length === 0) {
      if (this.discardPile.length === 0) return null;
      this.cards = this.discardPile;
      this.discardPile = [];
      this.shuffle();
    }
    return this.cards.pop();
  }

  discard(card) {
    this.discardPile.push(card);
  }

  get count() {
    return this.cards.length;
  }

  get discardCount() {
    return this.discardPile.length;
  }
}
