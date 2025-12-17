/* Shared main script for site features
   - Daily love message rotation
   - Countdown timers
   - Memory of the Day
   - Theme switcher (localStorage)
   - Clickable heart particles
   - Floating music widget
   - Scroll reveal for milestones
*/

(() => {
  // ---------- Configuration (edit dates/images as needed) ----------
  const config = {
    // ISO dates for countdowns (update these to your real dates)
    monthsary: '2026-01-19T00:00:00',
    anniversary: '2026-11-28T00:00:00',
    upcomingPlan: null, // optional: '2026-02-14T18:00:00'
    // Memory images (paths relative to site root)
    memoryImages: [
      'images/p1.jpg','images/p2.jpg','images/p3.jpg','images/p4.jpg','images/p5.jpg','images/p6.jpg','images/p7.jpg','images/p8.jpg',
      'images/IMG_20250519_184649.jpg','images/IMG_20250522_173837.jpg'
    ]
  };

  // ---------- Daily Message / Quote rotation ----------
  const messages = [
    "Every morning with you feels like my favorite song — soft, warm, and full of promises.",
    "I keep your smile safe in my chest; it lights my days when I miss you most.",
    "We are small magic: two hearts that chose the same home.",
    "Thank you for choosing me every day, in little ways and big ones.",
    "If I could bottle a feeling, it would be the comfort of your hand in mine.",
    "When I think of forever, I think of our quiet mornings and shared dreams.",
    "Your laugh is my favorite sound; your name, my favorite word.",
    "With you even ordinary days become memories I treasure.",
    "I love how you make the world feel safe and bright at the same time.",
    "Home for me is wherever you are.",
  ];

  function showDailyMessage() {
    const el = document.querySelector('.daily-card');
    if (!el) return;
    // rotation index stored in localStorage
    let idx = parseInt(localStorage.getItem('loveMsgIndex') || '0', 10);
    // use index and increment
    const msg = messages[idx % messages.length];
    idx = (idx + 1) % messages.length;
    localStorage.setItem('loveMsgIndex', idx);

    el.querySelector('p').textContent = msg;
    // reveal with class
    requestAnimationFrame(() => el.classList.add('show'));
  }

  // ---------- Countdown timers ----------
  function formatCountdown(ms) {
    if (ms <= 0) return '💕 Today is the day!';
    const sec = Math.floor(ms / 1000);
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return `💕 ${days} days, ${hours} hours left`;
  }

  function setupCountdown(id, dateStr, label) {
    const el = document.getElementById(id);
    if (!el || !dateStr) return;
    const target = new Date(dateStr).getTime();
    function tick() {
      const now = Date.now();
      const diff = target - now;
      el.textContent = `${formatCountdown(diff)} until our ${label}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  // ---------- Memory of the Day ----------
  function showMemory() {
    const wrapper = document.querySelector('.memory-card');
    if (!wrapper) return;
    const img = wrapper.querySelector('img');
    if (!img) return;
    const imgs = config.memoryImages;
    if (!imgs.length) return;
    const choice = imgs[Math.floor(Math.random() * imgs.length)];
    img.src = choice;
    // reveal after image loads
    img.onload = () => wrapper.classList.add('show');
  }

  // ---------- Theme switcher ----------
  function initTheme() {
    const toggle = document.getElementById('themeToggle');
    const root = document.documentElement;
    const saved = localStorage.getItem('theme') || 'light';
    if (saved === 'dark') root.setAttribute('data-theme','dark');
    function setTheme(t) {
      root.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
      localStorage.setItem('theme', t);
    }
    if (toggle) toggle.addEventListener('click', () => {
      const now = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(now);
    });
  }

  // ---------- Clickable heart animation ----------
  function createHeart(x, y) {
    const heart = document.createElement('div');
    heart.className = 'heart';
    // random color shade
    heart.style.left = `${x - 8}px`;
    heart.style.top = `${y - 8}px`;
    heart.style.background = `linear-gradient(45deg, ${getComputedStyle(document.documentElement).getPropertyValue('--accent')}, ${getComputedStyle(document.documentElement).getPropertyValue('--accent-2')})`;
    heart.style.opacity = '1';
    document.body.appendChild(heart);
    // animate using transforms
    requestAnimationFrame(() => {
      heart.style.transition = 'transform 900ms ease-out, opacity 900ms ease-out';
      const dx = (Math.random() - 0.5) * 80;
      const dy = -120 - Math.random() * 40;
      heart.style.transform = `translate(${dx}px, ${dy}px) scale(${0.9 + Math.random() * 0.4}) rotate(${Math.random()*40-20}deg)`;
      heart.style.opacity = '0';
    });
    setTimeout(() => heart.remove(), 1000);
  }

  function initHearts() {
    document.addEventListener('click', (e) => {
      // only create small number of hearts for performance
      for (let i=0;i<3;i++) {
        setTimeout(() => createHeart(e.clientX + (Math.random()-0.5)*20, e.clientY + (Math.random()-0.5)*20), i*60);
      }
    });
  }

  // ---------- Music widget ----------
  function initMusicWidget() {
    if (document.querySelector('.music-widget')) return; // already added
    const widget = document.createElement('div');
    widget.className = 'music-widget';
    widget.innerHTML = `<button class="music-toggle">Play ♫</button><div class="music-title">Now Playing</div><audio preload="none"></audio>`;
    document.body.appendChild(widget);
    const audio = widget.querySelector('audio');
    const btn = widget.querySelector('.music-toggle');
    // try to pick a sample audio on the song page or fallback
    audio.src = document.querySelector('audio source') ? document.querySelector('audio source').src : 'song/fireproof.mp3';
    let playing = false;
    btn.addEventListener('click', async () => {
      try {
        if (!playing) { await audio.play(); btn.textContent = 'Pause ▮▮'; playing = true; }
        else { audio.pause(); btn.textContent = 'Play ♫'; playing = false; }
      } catch(e){ console.warn('Audio play blocked or unavailable', e); }
    });
  }

  // ---------- Scroll reveal for milestone items ----------
  function initScrollReveal() {
    const items = document.querySelectorAll('.milestone-item');
    if (!items.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(ent => {
        if (ent.isIntersecting) ent.target.classList.add('show');
      });
    }, {threshold: 0.15});
    items.forEach(i=>obs.observe(i));
  }

  // ---------- Auto init on DOMContentLoaded ----------
  document.addEventListener('DOMContentLoaded', () => {
    showDailyMessage();
    setupCountdown('cd-monthsary', config.monthsary, 'Monthsary');
    setupCountdown('cd-anniversary', config.anniversary, 'Anniversary');
    if (config.upcomingPlan) setupCountdown('cd-upcoming', config.upcomingPlan, 'Upcoming Plan');
    showMemory();
    initTheme();
    initHearts();
    initMusicWidget();
    initScrollReveal();
  });

})();
