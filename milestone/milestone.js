// Milestone dynamic stats and countdowns
(function(){
  // ensure timeline clears fixed navbar by measuring nav height
  function adjustTimelinePadding(){
    const nav = document.querySelector('.navbar');
    const tl = document.querySelector('.timeline');
    if (!nav || !tl) return;
    const navH = nav.offsetHeight || 72;
    // leave small gap
    tl.style.paddingTop = (navH + 18) + 'px';
  }
  window.addEventListener('resize', adjustTimelinePadding);
  window.addEventListener('load', adjustTimelinePadding);
  const $ = sel => document.querySelector(sel);
  const firstMeetEl = Array.from(document.querySelectorAll('.milestone-item')).find(a=>a.querySelector('.milestone-title') && a.querySelector('.milestone-title').textContent.trim().toLowerCase().includes('first meet'));
  const firstDateEl = Array.from(document.querySelectorAll('.milestone-item')).find(a=>a.querySelector('.milestone-title') && a.querySelector('.milestone-title').textContent.trim().toLowerCase().includes('first date'));

  function parseDateFrom(el, fallback){
    if (!el) return new Date(fallback);
    const t = el.querySelector('.milestone-date')?.textContent.trim();
    if (!t || t === '—') return new Date(fallback);
    const d = new Date(t);
    if (!isNaN(d)) return d;
    // try parsing common format like 'May 19, 2025'
    return new Date(Date.parse(t));
  }

  // sensible defaults (from page)
  const DEFAULT_FIRST_MEET = '2024-03-09';
  const DEFAULT_FIRST_DATE = '2024-04-19';

  const firstMeetDate = parseDateFrom(firstMeetEl, DEFAULT_FIRST_MEET);
  const firstDateDate = parseDateFrom(firstDateEl, DEFAULT_FIRST_DATE);

  // recurring dates
  // Monthsary: every month on day 28 -> set MONTHSARY_MONTH = null
  const MONTHSARY_MONTH = null, MONTHSARY_DAY = 28; // monthly on day 28
  // Anniversary: fixed on Aug 28
  const ANNIV_MONTH = 8, ANNIV_DAY = 28; // Aug 28

  function nextOccurrence(month, day){
    const now = new Date();
    // compare dates at midnight so "today" counts as upcoming
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (month === null || month === undefined){
      // next monthly occurrence for given day
      let cand = new Date(now.getFullYear(), now.getMonth(), day);
      const candMid = new Date(cand.getFullYear(), cand.getMonth(), cand.getDate());
      if (candMid < todayMid){
        cand = new Date(now.getFullYear(), now.getMonth()+1, day);
      }
      return new Date(cand.getFullYear(), cand.getMonth(), cand.getDate());
    }
    const year = now.getFullYear();
    let cand = new Date(year, month-1, day);
    const candMid = new Date(cand.getFullYear(), cand.getMonth(), cand.getDate());
    if (candMid < todayMid) cand = new Date(year+1, month-1, day);
    return new Date(cand.getFullYear(), cand.getMonth(), cand.getDate());
  }

  function msToParts(ms){
    const totalSeconds = Math.max(0, Math.floor(ms/1000));
    const days = Math.floor(totalSeconds/86400);
    const hours = Math.floor((totalSeconds%86400)/3600);
    const minutes = Math.floor((totalSeconds%3600)/60);
    const seconds = totalSeconds % 60;
    return {days,hours,minutes,seconds};
  }

  function humanizeDays(ms){
    const days = Math.floor(ms / (1000*60*60*24));
    const years = Math.floor(days/365);
    const months = Math.floor((days%365)/30);
    const remDays = days - years*365 - months*30;
    const parts = [];
    if (years) parts.push(years + (years>1?' yrs':' yr'));
    if (months) parts.push(months + (months>1?' mos':' mo'));
    if (remDays || parts.length===0) parts.push(remDays + (remDays>1?' days':' day'));
    return parts.join(' ');
  }

  function formatCountdown(ms){
    const p = msToParts(ms);
    if (p.days>0) return p.days + 'd ' + String(p.hours).padStart(2,'0') + 'h';
    return String(p.hours).padStart(2,'0') + 'h ' + String(p.minutes).padStart(2,'0') + 'm ' + String(p.seconds).padStart(2,'0') + 's';
  }

  function update(){
    const now = new Date();
    // since first meet
    const sinceMs = now - firstMeetDate;
    $('#sinceFirstMeet').textContent = humanizeDays(sinceMs);
    $('#sinceFirstMeetTotal').textContent = Math.floor(sinceMs/(1000*60*60*24)) + ' days total';

    // first chat length (days between meet and first date)
    const chatMs = Math.abs(firstDateDate - firstMeetDate);
    $('#firstChatLength').textContent = Math.floor(chatMs/(1000*60*60*24)) + ' days';

    // next monthsary
    const nextM = nextOccurrence(MONTHSARY_MONTH, MONTHSARY_DAY);
    $('#nextMonthsary').textContent = nextM.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
    $('#cd-monthsary-small').textContent = formatCountdown(nextM - now);

    // next anniversary
    const nextA = nextOccurrence(ANNIV_MONTH, ANNIV_DAY);
    $('#nextAnniversary').textContent = nextA.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
    $('#cd-anniversary-small').textContent = formatCountdown(nextA - now);
  }

  // initial update and interval
  update();
  setInterval(update, 1000);

  // --- Calendar rendering ---
  const calEl = document.getElementById('calendar');
  const calLabel = document.getElementById('calMonthLabel');
  const prevBtn = document.getElementById('calPrev');
  const nextBtn = document.getElementById('calNext');
  let viewDate = new Date();

  function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }

  function renderCalendar(date){
    if (!calEl) return;
    calEl.innerHTML = '';
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    // header label
    calLabel.textContent = date.toLocaleString(undefined,{month:'long', year:'numeric'});
    // day names
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    dayNames.forEach(dn=>{ const el = document.createElement('div'); el.className='day-name'; el.textContent=dn; calEl.appendChild(el); });

    // calculate first day's weekday
    const firstWeekday = start.getDay();
    // fill blanks
    for(let i=0;i<firstWeekday;i++){ const el=document.createElement('div'); el.className='day-cell empty'; calEl.appendChild(el); }

    // iterate days
    for(let day=1; day<=end.getDate(); day++){
      const cur = new Date(date.getFullYear(), date.getMonth(), day);
      const cell = document.createElement('div'); cell.className='day-cell';
      const dn = document.createElement('div'); dn.className='date-num'; dn.textContent = day; cell.appendChild(dn);

      // check if this is monthsary or anniversary (compare month/day)
      // corner badges (small top-right) for quick visual mark
      const nextM = nextOccurrence(MONTHSARY_MONTH, MONTHSARY_DAY);
      const nextA = nextOccurrence(ANNIV_MONTH, ANNIV_DAY);
      if ((MONTHSARY_MONTH === null && cur.getDate() === MONTHSARY_DAY) || (cur.getMonth()+1 === MONTHSARY_MONTH && cur.getDate() === MONTHSARY_DAY)){
        cell.classList.add('monthsary');
        const corner = document.createElement('div');
        // if this is the upcoming monthsary
        if (cur.toDateString() === nextM.toDateString()){
          corner.className = 'corner-badge small next';
          corner.textContent = 'Next M';
        } else {
          corner.className = 'corner-badge';
          corner.textContent = 'M';
        }
        cell.appendChild(corner);
        const badge = document.createElement('div'); badge.className='badge'; badge.textContent='Monthsary'; badge.style.background='rgba(255,95,158,0.12)'; badge.style.color='#ff5f9e'; cell.appendChild(badge);
      }
      if (cur.getMonth()+1 === ANNIV_MONTH && cur.getDate() === ANNIV_DAY){
        cell.classList.add('anniv');
        const corner = document.createElement('div');
        if (cur.toDateString() === nextA.toDateString()){
          corner.className = 'corner-badge small next';
          corner.textContent = 'Next A';
        } else {
          corner.className = 'corner-badge';
          corner.textContent = 'A';
        }
        cell.appendChild(corner);
        const badge = document.createElement('div'); badge.className='badge'; badge.textContent='Anniversary'; badge.style.background='rgba(224,85,134,0.08)'; badge.style.color='#e05586'; cell.appendChild(badge);
      }

      // mark today
      const today = new Date();
      if (cur.toDateString() === today.toDateString()){
        cell.classList.add('today');
        const todayBadge = document.createElement('div'); todayBadge.className = 'today-badge'; todayBadge.textContent = 'Today'; cell.appendChild(todayBadge);
      }

      // labels for next occurrences within this month (below date)
      if (cur.toDateString() === nextM.toDateString()){
        const l = document.createElement('div'); l.className='label'; l.textContent='Next Monthsary'; cell.appendChild(l);
      }
      if (cur.toDateString() === nextA.toDateString()){
        const l = document.createElement('div'); l.className='label'; l.textContent='Next Anniversary'; cell.appendChild(l);
      }

      calEl.appendChild(cell);
    }
  }

  prevBtn && prevBtn.addEventListener('click', ()=>{ viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1); renderCalendar(viewDate); });
  nextBtn && nextBtn.addEventListener('click', ()=>{ viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1); renderCalendar(viewDate); });
  renderCalendar(viewDate);

  // Export dates button
  const exportBtn = document.getElementById('exportDates');
  if (exportBtn){
    exportBtn.addEventListener('click', ()=>{
      const nextM = nextOccurrence(MONTHSARY_MONTH, MONTHSARY_DAY);
      const nextA = nextOccurrence(ANNIV_MONTH, ANNIV_DAY);
      const payload = {
        firstMeet: firstMeetDate.toISOString().split('T')[0],
        firstDate: firstDateDate.toISOString().split('T')[0],
        nextMonthsary: nextM.toISOString().split('T')[0],
        nextAnniversary: nextA.toISOString().split('T')[0],
        generatedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'milestones-dates.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
  }

  // expose for debugging
  window._milestones = { firstMeetDate, firstDateDate };
})();
