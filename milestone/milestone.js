// Milestone dynamic stats and countdowns
(function(){
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
  const DEFAULT_FIRST_MEET = '2025-05-19';
  const DEFAULT_FIRST_DATE = '2025-05-22';

  const firstMeetDate = parseDateFrom(firstMeetEl, DEFAULT_FIRST_MEET);
  const firstDateDate = parseDateFrom(firstDateEl, DEFAULT_FIRST_DATE);

  // user-specified recurring dates
  const MONTHSARY_MONTH = 12, MONTHSARY_DAY = 28; // Dec 28
  const ANNIV_MONTH = 8, ANNIV_DAY = 28; // Aug 28

  function nextOccurrence(month, day){
    const now = new Date();
    const year = now.getFullYear();
    let cand = new Date(year, month-1, day, 0,0,0,0);
    if (cand <= now) cand = new Date(year+1, month-1, day,0,0,0,0);
    return cand;
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

  // expose for debugging
  window._milestones = { firstMeetDate, firstDateDate };
})();
