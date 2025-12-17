// ----------------------------
// Floating hearts
// ----------------------------
const heartsContainer = document.querySelector('.hearts-container');

function createHeart() {
  const heart = document.createElement('div');
  heart.classList.add('heart');

  // random position and size
  heart.style.left = Math.random() * 100 + 'vw';
  const size = 10 + Math.random() * 20; // 10px to 30px
  heart.style.width = size + 'px';
  heart.style.height = size + 'px';
  heart.style.animationDuration = 3 + Math.random() * 3 + 's';
  heart.style.background = `#ff5f9e`;

  heartsContainer.appendChild(heart);

  setTimeout(() => {
    heart.remove();
  }, 6000); // match animation duration
}

// create hearts every 300ms
setInterval(createHeart, 300);

// Fade in letters when scrolling
const letters = document.querySelectorAll('.letter');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if(entry.isIntersecting) {
      entry.target.style.opacity = 1;
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, {
  threshold: 0.1
});

// expose observer so dynamically added messages can be observed
window.letterObserver = observer;
letters.forEach(letter => {
  letter.style.opacity = 0;
  letter.style.transform = 'translateY(20px)';
  window.letterObserver.observe(letter);
});

// Hamburger behavior handled in assets/main.js

// ----------------------------
// Real-time Letters (Firestore fallback to localStorage)
// ----------------------------
const lettersContainer = document.querySelector('.letter-container');
const sendBtn = document.getElementById('sendLetter');
const textInput = document.getElementById('letterText');

const LOCAL_KEY = 'local_letters_v1';

function genId(){
  return String(Date.now()) + '-' + Math.random().toString(36).slice(2,9);
}

function renderLetters(items){
  lettersContainer.innerHTML = '';
  // ensure items are chronological (oldest first)
  items.sort((a,b)=> (a.createdAt||0) - (b.createdAt||0));
  items.forEach(it => {
    const div = document.createElement('div');
    div.className = 'letter ' + (it.side || 'left');
    if (!it.id) it.id = genId();
    div.dataset.id = it.id;
    // optional sender
    if (it.name){
      const s = document.createElement('span');
      s.className = 'sender';
      s.textContent = it.name;
      div.appendChild(s);
    }
    const p = document.createElement('p');
    p.textContent = it.text;
    const meta = document.createElement('span');
    meta.className = 'meta';
    const who = it.name ? '' : '';
    const d = it.createdAt ? new Date(it.createdAt).toLocaleString() : '';
    meta.textContent = (who + d).trim();
    div.appendChild(p);
    // actions (edit) for messages (show on hover)
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.title = 'Edit message';
    editBtn.textContent = '✎';
    actions.appendChild(editBtn);
    div.appendChild(actions);
    div.appendChild(meta);
    lettersContainer.appendChild(div);
    // animate and let observer pick up
    if (window.letterObserver) {
      window.letterObserver.observe(div);
    }
    // wire edit handler
    editBtn.addEventListener('click', ()=> openEdit(div, it));
  });
  // auto-scroll to bottom like a chat
  setTimeout(()=>{ lettersContainer.scrollTop = lettersContainer.scrollHeight; }, 40);
}

function saveLocalLetter(obj){
  const cur = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  if (!obj.id) obj.id = genId();
  cur.push(obj);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(cur));
  renderLetters(cur);
}

function loadLocalLetters(){
  const cur = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  // ensure each local item has id and chronological
  cur.forEach(it=>{ if(!it.id) it.id = genId(); });
  cur.sort((a,b)=> (a.createdAt||0) - (b.createdAt||0));
  renderLetters(cur);
}

let useFirestore = false;
let db = null;

if (window.firebaseConfig){
  try{
    firebase.initializeApp(window.firebaseConfig);
    db = firebase.firestore();
    useFirestore = true;
  }catch(e){
    console.warn('Firebase init failed, falling back to localStorage', e);
    useFirestore = false;
  }
}

if (useFirestore){
  // listen to real-time letters in chronological order
  db.collection('letters').orderBy('createdAt','asc').onSnapshot(snap => {
    const items = [];
    snap.forEach(doc => {
      const data = doc.data();
      const ts = data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now());
      items.push({id: doc.id, name: data.name||'', text: data.text||'', createdAt: ts, side: data.side||'left'});
    });
    renderLetters(items);
  }, err => { console.error('Letters snapshot error', err); loadLocalLetters(); });
} else {
  loadLocalLetters();
}

sendBtn && sendBtn.addEventListener('click', async ()=>{
  const text = (textInput.value || '').trim();
  const name = '';
  if (!text) return;
  const payload = { text, createdAt: Date.now(), side: 'right' };
  if (useFirestore && db){
    try{
      const write = await db.collection('letters').add({ text, createdAt: firebase.firestore.FieldValue.serverTimestamp(), side: 'right' });
      // optionally we could update local id mapping, but snapshot will refresh
      textInput.value = '';
      // keep focus on input
      textInput.focus();
    }catch(e){
      console.error('Failed to send to Firestore, saving locally', e);
      saveLocalLetter(payload);
      textInput.value = '';
    }
  } else {
    saveLocalLetter(payload);
    textInput.value = '';
  }
});

// allow Enter to send (Shift+Enter for newline)
textInput && textInput.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    sendBtn && sendBtn.click();
  }
});

// ------ Edit message flow ------
function formatForInput(ms){
  const d = new Date(ms || Date.now());
  // local datetime-local format YYYY-MM-DDTHH:MM
  const iso = d.toISOString();
  return iso.slice(0,16);
}

function parseInputToMs(str){
  return str ? new Date(str).getTime() : Date.now();
}

async function openEdit(div, item){
  // only allow editing if we have an id
  if (!item || !div) return;
  const origText = item.text;
  const origMs = item.createdAt || Date.now();
  div.innerHTML = '';
  const ta = document.createElement('textarea');
  ta.value = origText;
  ta.style.width = '100%';
  ta.style.minHeight = '64px';
  ta.style.borderRadius = '12px';
  const dt = document.createElement('input');
  dt.type = 'datetime-local';
  dt.value = formatForInput(origMs);
  dt.style.marginTop = '8px';
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.marginTop = '8px';
  const save = document.createElement('button'); save.textContent = 'Save'; save.style.background = 'var(--accent)'; save.style.color='#fff'; save.style.border='none'; save.style.padding='6px 10px'; save.style.borderRadius='8px';
  const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.style.border='1px solid rgba(0,0,0,0.06)'; cancel.style.padding='6px 10px'; cancel.style.borderRadius='8px';
  actions.appendChild(save); actions.appendChild(cancel);
  div.appendChild(ta); div.appendChild(dt); div.appendChild(actions);
  ta.focus();

  cancel.addEventListener('click', ()=>{ renderCurrentState(); });

  save.addEventListener('click', async ()=>{
    const newText = ta.value.trim();
    const newMs = parseInputToMs(dt.value);
    if (!newText) return;
    // update Firestore or local
    if (useFirestore && db && item.id){
      try{
        await db.collection('letters').doc(item.id).update({ text: newText, createdAt: firebase.firestore.Timestamp.fromMillis(newMs) });
      }catch(e){
        console.error('Failed to update Firestore:', e);
      }
    } else {
      // update localStorage
      const cur = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      const idx = cur.findIndex(k => k.id === item.id);
      if (idx !== -1){ cur[idx].text = newText; cur[idx].createdAt = newMs; localStorage.setItem(LOCAL_KEY, JSON.stringify(cur)); }
    }
    renderCurrentState();
  });
}

function renderCurrentState(){
  if (useFirestore){
    // Firestore snapshot will refresh UI automatically; if not, reload local fallback
    // no-op here
  }
  loadLocalLetters();
  // if Firestore is used, snapshot will re-render shortly
}

clearBtn && clearBtn.addEventListener('click', ()=>{
  localStorage.removeItem(LOCAL_KEY);
  loadLocalLetters();
});
