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
  // next / prev and autoplay-next + persistence
  const npPrev = document.getElementById('npPrev');
  const npNext = document.getElementById('npNext');
  let currentIndex = null;
  const STORAGE_INDEX = 'forus_last_track_v1';
  const STORAGE_TIME = 'forus_last_time_v1';
  const AUTOPLAY_NEXT = true;

  function setCurrentByIndex(i){
    if (i == null || i < 0 || i >= audios.length) return;
    currentIndex = i;
    currentAudio = audios[i];
    const title = currentAudio.dataset.title || currentAudio.querySelector('source')?.getAttribute('src') || 'Playing';
    if (np){ npTitle.textContent = title; np.setAttribute('aria-hidden','false'); }
    // update cover
    const cover = document.querySelector('.np-cover');
    const coverSrc = currentAudio.dataset.cover || currentAudio.closest('.song-item')?.dataset.cover;
    if (cover && coverSrc) cover.style.backgroundImage = `url('${coverSrc}')`;
  }

  // handle ended -> next
  audios.forEach((a, idx)=>{
    a.addEventListener('ended', ()=>{
      if (AUTOPLAY_NEXT){
        const next = (idx+1) % audios.length;
        audios[next].play();
      }
    });
    a.addEventListener('play', ()=>{ currentIndex = audios.indexOf(a); setCurrentByIndex(currentIndex); });
  });

  if (npPrev){ npPrev.addEventListener('click', ()=>{ if (currentIndex==null) return; const prev = (currentIndex-1+audios.length)%audios.length; audios[prev].play(); }); }
  if (npNext){ npNext.addEventListener('click', ()=>{ if (currentIndex==null) return; const next = (currentIndex+1)%audios.length; audios[next].play(); }); }

  // persistence: restore last track/time if available
  const lastIndex = parseInt(localStorage.getItem(STORAGE_INDEX));
  const lastTime = parseFloat(localStorage.getItem(STORAGE_TIME));
  if (!isNaN(lastIndex) && audios[lastIndex]){
    // wait for metadata then set time
    const target = audios[lastIndex];
    const applyTime = ()=>{
      if (!isNaN(lastTime) && isFinite(lastTime) && lastTime > 0){
        try{ target.currentTime = Math.min(lastTime, target.duration || lastTime); }catch(e){}
      }
      setCurrentByIndex(lastIndex);
    };
    if (target.readyState >= 1) applyTime(); else target.addEventListener('loadedmetadata', applyTime, {once:true});
  }

  // save periodically on timeupdate (throttled) and on pause
  let lastSavedAt = 0;
  audios.forEach((a, idx)=>{
    a.addEventListener('timeupdate', ()=>{
      const now = Date.now();
      if (now - lastSavedAt > 5000){
        localStorage.setItem(STORAGE_INDEX, String(idx));
        localStorage.setItem(STORAGE_TIME, String(a.currentTime));
        lastSavedAt = now;
      }
    });
    a.addEventListener('pause', ()=>{
      localStorage.setItem(STORAGE_INDEX, String(idx));
      localStorage.setItem(STORAGE_TIME, String(a.currentTime));
    });
    window.addEventListener('beforeunload', ()=>{
      localStorage.setItem(STORAGE_INDEX, String(idx));
      localStorage.setItem(STORAGE_TIME, String(a.currentTime));
    });
  });
});
// Hamburger behavior handled globally in assets/main.js
