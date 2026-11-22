// animator.js: Tiny tween and particle system for card motion and feedback.

const tweens = [];
const particles = [];

export function tween(obj, prop, from, to, durMs, onDone) {
  const t = { obj, prop, from, to, start: performance.now(), dur: durMs, onDone };
  tweens.push(t);
  return t;
}

export function animate(dt) {
  const now = performance.now();
  for (let i = tweens.length - 1; i >= 0; i--) {
    const t = tweens[i];
    const k = Math.min(1, (now - t.start) / t.dur);
    const e = 1 - Math.pow(1 - k, 3);
    t.obj[t.prop] = t.from + (t.to - t.from) * e;
    if (k >= 1) {
      tweens.splice(i, 1);
      if (t.onDone) t.onDone();
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.12 * dt;
  }
}

export function createParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 0.05 + Math.random() * 0.22;
    particles.push({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 0.12,
      life: 500 + Math.random() * 700,
      maxLife: 1200,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

export function drawParticles(ctx) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function particleCount() {
  return particles.length;
}
