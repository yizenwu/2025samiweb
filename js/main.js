/* =========================
   Utils
========================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarse = matchMedia('(pointer: coarse)').matches;

function smooth(current, target, dt, tau = 0.12) {
  const a = 1 - Math.exp(-dt / tau);
  return current + (target - current) * a;
}

function centerOffset(panel) {
  const r = panel.getBoundingClientRect();
  const vpC = innerHeight * 0.5;
  const pC = r.top + r.height * 0.5;
  const denom = Math.max(1, r.height * 0.5);
  return (pC - vpC) / denom;
}

/* =========================
   Cursor (desktop only)
========================= */
const cursor = document.getElementById('cursor');
if (isCoarse) cursor?.remove();

if (!isCoarse && cursor) {
  let cx = innerWidth / 2;
  let cy = innerHeight / 2;
  let tx = cx;
  let ty = cy;

  addEventListener(
    'mousemove',
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
      cursor.classList.add('cursor--on');
    },
    { passive: true }
  );

  (function rafCursor() {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    cursor.style.left = cx + 'px';
    cursor.style.top = cy + 'px';
    requestAnimationFrame(rafCursor);
  })();

  const hoverSet = new Set(
    document.querySelectorAll('a,button,input,.js-hover')
  );

  hoverSet.forEach((el) => {
    el.addEventListener('mouseenter', () =>
      cursor.classList.add('cursor--big')
    );
    el.addEventListener('mouseleave', () =>
      cursor.classList.remove('cursor--big')
    );
  });

  const follow = document.getElementById('follow');
  if (follow) {
    new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          cursor.classList.toggle('cursor--blue', e.isIntersecting);
        });
      },
      { threshold: 0.25 }
    ).observe(follow);
  }
}

/* =========================
   Contact form (demo)
========================= */
const form = document.getElementById('contactForm');
const toast = document.getElementById('toast');

if (form && toast) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = (fd.get('name') || '').toString().trim();

    toast.textContent = name
      ? `收到囉，${name} ✶（目前是前端展示版）`
      : '收到囉 ✶（目前是前端展示版）';

    form.reset();
    setTimeout(() => (toast.textContent = ''), 2200);
  });
}

/* =========================
   Grain canvas
========================= */
const g = document.getElementById('grain');
const ctx = g?.getContext?.('2d', { alpha: true });
let noise = { w: 0, h: 0, img: null, off: null, offctx: null };

function resizeGrain() {
  if (!g || !ctx) return;

  const dpr = Math.max(1, Math.min(2, devicePixelRatio || 1));
  g.width = Math.floor(innerWidth * dpr);
  g.height = Math.floor(innerHeight * dpr);
  g.style.width = innerWidth + 'px';
  g.style.height = innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const s = 2;
  const nw = Math.ceil(innerWidth / s);
  const nh = Math.ceil(innerHeight / s);

  if (nw !== noise.w || nh !== noise.h) {
    noise.w = nw;
    noise.h = nh;
    noise.img = ctx.createImageData(nw, nh);
    noise.off = document.createElement('canvas');
    noise.off.width = nw;
    noise.off.height = nh;
    noise.offctx = noise.off.getContext('2d', { alpha: true });
  }
}

resizeGrain();
addEventListener('resize', resizeGrain, { passive: true });

let lastGrain = 0;
function drawGrain(t) {
  if (!g || !ctx || reduced) return;

  if (t - lastGrain > 90 && noise.img && noise.offctx) {
    lastGrain = t;
    const d = noise.img.data;

    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 28;
    }

    noise.offctx.putImageData(noise.img, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      noise.off,
      0,
      0,
      noise.w,
      noise.h,
      0,
      0,
      innerWidth,
      innerHeight
    );
  }

  requestAnimationFrame(drawGrain);
}
requestAnimationFrame(drawGrain);

/* =========================
   Parallax
========================= */
const heroPanel = document.querySelector('.panel.workHero');
const worksPanel = document.querySelector('.panel.works');
const heroBg = document.getElementById('workBg');
const cards = Array.from(document.querySelectorAll('.card'));

const mqPhone = matchMedia('(max-width: 600px)');
const mqTablet = matchMedia('(max-width: 1024px)');

let heroOcur = 1;
let heroYcur = 0;
const cardXcur = cards.map(() => 0);
const cardOcur = cards.map(() => 1);

function offscreenDistanceFor(card) {
  const w = card.getBoundingClientRect().width || 320;
  return innerWidth * 0.5 + w * 0.5 + 120;
}

let lastT = performance.now();

function raf(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  if (!reduced && heroPanel && heroBg) {
    const off1 = centerOffset(heroPanel);
    const a1 = clamp(Math.abs(off1), 0, 1);

    heroOcur = smooth(heroOcur, 0.12 + (1 - a1) * 0.88, dt, 0.12);
    heroYcur = smooth(heroYcur, -off1 * 70, dt, 0.12);

    heroBg.style.opacity = heroOcur.toFixed(3);
    heroBg.style.transform = `translate3d(0, ${heroYcur.toFixed(
      2
    )}px, 0) scale(1.06)`;
  }

  if (worksPanel && cards.length) {
    const off2 = centerOffset(worksPanel);
    const a2 = clamp(Math.abs(off2), 0, 1);

    const isPhone = mqPhone.matches;
    const isTablet = mqTablet.matches && !isPhone;

    cards.forEach((card, i) => {
      if (reduced || isTablet || isPhone) {
        card.style.transform = '';
        card.style.opacity = '';
        return;
      }

      const dir = parseFloat(
        card.getAttribute('data-dir') || (i % 2 ? 1 : -1)
      );

      const maxOut = offscreenDistanceFor(card);
      const xT = dir * a2 * maxOut;
      const oT = 0.35 + (1 - a2) * 0.65;

      cardXcur[i] = smooth(cardXcur[i], xT, dt, 0.1);
      cardOcur[i] = smooth(cardOcur[i], oT, dt, 0.12);

      card.style.transform = `translate3d(${cardXcur[
        i
      ].toFixed(2)}px, 0, 0)`;
      card.style.opacity = cardOcur[i].toFixed(3);
    });
  }

  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);
