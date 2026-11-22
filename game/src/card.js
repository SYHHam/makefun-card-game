// card.js: Card model, suits, values.
// Suits: Blood (red teardrop), Bone (white skull), Shadow (purple wisp).

export const SUITS = {
  blood: { key: 'blood', name: 'Blood', label: 'BLOOD', color: '#c73e3e', dark: '#8f2a2a' },
  bone: { key: 'bone', name: 'Bone', label: 'BONE', color: '#e8e0d5', dark: '#3d3225' },
  shadow: { key: 'shadow', name: 'Shadow', label: 'SHADOW', color: '#7b68a6', dark: '#4a3d6b' },
};

export const SUIT_KEYS = ['blood', 'bone', 'shadow'];

let nextId = 1;

export function createCard(suit, value) {
  if (!SUITS[suit]) throw new Error('unknown suit: ' + suit);
  if (value < 1 || value > 9) throw new Error('value out of range: ' + value);
  return { id: nextId++, suit, value };
}

export function getSuitSymbol(suit) {
  if (suit === 'blood') return 'teardrop';
  if (suit === 'bone') return 'skull';
  if (suit === 'shadow') return 'wisp';
  return 'unknown';
}

export function getCardValue(card) {
  return card.value;
}

export function cardName(card) {
  return SUITS[card.suit].name + ' ' + card.value;
}

export function buildComponentDeck() {
  const cards = [];
  for (const suit of SUIT_KEYS) {
    for (let v = 1; v <= 9; v++) cards.push(createCard(suit, v));
  }
  return cards;
}
