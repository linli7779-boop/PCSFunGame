export class FloatingTextEngine {
  constructor(canvas, onEntityClicked) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onEntityClicked = onEntityClicked;

    this.entities = [];

    this.running = false;
    this.rafId = null;
    this.lastT = 0;

    this.dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    this.w = 0;
    this.h = 0;

    this._boundOnPointerDown = this._onPointerDown.bind(this);
    canvas.addEventListener("pointerdown", this._boundOnPointerDown);
  }

  destroy() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener("pointerdown", this._boundOnPointerDown);
  }

  resize(width, height) {
    // Use CSS pixels as our simulation space.
    this.w = Math.max(1, Math.floor(width));
    this.h = Math.max(1, Math.floor(height));

    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setEntities(entities) {
    this.entities = entities;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastT = performance.now();
    const tick = (t) => {
      if (!this.running) return;
      const dt = Math.min(0.032, (t - this.lastT) / 1000);
      this.lastT = t;
      this._step(dt);
      this._render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this._render();
  }

  _step(dt) {
    const entities = this.entities;

    for (const e of entities) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      // Boundary bounce.
      if (e.x < 0) {
        e.x = 0;
        e.vx *= -1;
      } else if (e.x + e.w > this.w) {
        e.x = this.w - e.w;
        e.vx *= -1;
      }
      if (e.y < 0) {
        e.y = 0;
        e.vy *= -1;
      } else if (e.y + e.h > this.h) {
        e.y = this.h - e.h;
        e.vy *= -1;
      }
    }

    // Entity collision (naive O(n^2) is fine for our small word counts).
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const a = entities[i];
        const b = entities[j];
        if (!this._rectsOverlap(a, b)) continue;

        // Swap velocities for a playful "bounce" feel.
        const avx = a.vx;
        const avy = a.vy;
        a.vx = b.vx;
        a.vy = b.vy;
        b.vx = avx;
        b.vy = avy;

        // Push them apart a bit to reduce jitter.
        const ax = a.x + a.w / 2;
        const bx = b.x + b.w / 2;
        const ay = a.y + a.h / 2;
        const by = b.y + b.h / 2;
        if (ax < bx) {
          a.x -= 1;
          b.x += 1;
        } else {
          a.x += 1;
          b.x -= 1;
        }
        if (ay < by) {
          a.y -= 1;
          b.y += 1;
        } else {
          a.y += 1;
          b.y -= 1;
        }
      }
    }
  }

  _render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    for (const e of this.entities) {
      // Subtle shadow helps readability on mobile.
      ctx.font = `${e.fontSize}px ${e.fontFamily}`;
      ctx.textBaseline = "top";

      ctx.fillStyle = e.color;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = Math.max(1, e.fontSize * 0.06);

      const rx = e.x;
      const ry = e.y;
      ctx.strokeText(e.text, rx, ry);
      ctx.fillText(e.text, rx, ry);
    }
  }

  _rectsOverlap(a, b) {
    return !(
      a.x + a.w < b.x ||
      a.x > b.x + b.w ||
      a.y + a.h < b.y ||
      a.y > b.y + b.h
    );
  }

  _onPointerDown(ev) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    
    // Add generous padding for fat-finger mobile/tablet taps
    const pad = 25; 
    
    for (const e of this.entities) {
      if (x >= e.x - pad && x <= e.x + e.w + pad && y >= e.y - pad && y <= e.y + e.h + pad) {
        this.onEntityClicked?.(e);
        break;
      }
    }
  }
}

