document.addEventListener('DOMContentLoaded', () => {
  // Pause other audio elements when one plays and update now-playing UI
  const audios = Array.from(document.querySelectorAll('audio'));
  const np = document.getElementById('nowPlaying');
  const npTitle = document.getElementById('npTitle');
  const npTime = document.getElementById('npTime');
  const npPlay = document.getElementById('npPlay');
  const npProgressBar = document.querySelector('.np-progress-bar');
  let currentAudio = null;

  function formatTime(s){
    if (!isFinite(s)) return '00:00';
    const mm = Math.floor(s/60).toString().padStart(2,'0');
    const ss = Math.floor(s%60).toString().padStart(2,'0');
    return mm+':'+ss;
  }

  audios.forEach(a => {
    // when play starts, pause others
    a.addEventListener('play', () => {
      audios.forEach(other => { if (other !== a) other.pause(); });
      currentAudio = a;
      const title = a.dataset.title || a.querySelector('source')?.getAttribute('src') || 'Playing';
      if (np){ npTitle.textContent = title; np.setAttribute('aria-hidden','false'); }
      if (npPlay) npPlay.textContent = 'Pause';
    });

    a.addEventListener('pause', ()=>{
      if (currentAudio === a){ if (npPlay) npPlay.textContent = 'Play'; }
    });

    a.addEventListener('timeupdate', ()=>{
      if (currentAudio !== a) return;
      const cur = a.currentTime; const dur = a.duration || 0;
      if (npTime) npTime.textContent = formatTime(cur) + ' / ' + formatTime(dur);
      if (npProgressBar) npProgressBar.style.width = (dur? (cur/dur*100):0) + '%';
    });

    // allow clicking the track container to toggle play
    const container = a.closest('.song-item') || a.closest('.track');
    if (container){
      container.addEventListener('click', (e)=>{
        // avoid toggling when clicking native controls
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'AUDIO' || e.target.closest('audio')) return;
        if (a.paused) a.play(); else a.pause();
      });
    }
  });

  // now-playing controls
  if (npPlay){
    npPlay.addEventListener('click', ()=>{
      if (!currentAudio) return;
      if (currentAudio.paused) currentAudio.play(); else currentAudio.pause();
    });
  }

  // clicking progress seeks
  const npProgress = document.getElementById('npProgress');
  if (npProgress){
    npProgress.addEventListener('click', (e)=>{
      if (!currentAudio) return;
      const rect = npProgress.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left)/rect.width));
      currentAudio.currentTime = (currentAudio.duration || 0) * pct;
    });
  }
});
// Hamburger behavior handled globally in assets/main.js
