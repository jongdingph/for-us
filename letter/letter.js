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

letters.forEach(letter => {
  letter.style.opacity = 0;
  letter.style.transform = 'translateY(20px)';
  observer.observe(letter);
});

// Hamburger behavior handled in assets/main.js

// ----------------------------
// Real-time Letters (Firestore fallback to localStorage)
// ----------------------------
const lettersContainer = document.querySelector('.letter-container');
const sendBtn = document.getElementById('sendLetter');
const clearBtn = document.getElementById('clearLetters');
const nameInput = document.getElementById('letterName');
const textInput = document.getElementById('letterText');

const LOCAL_KEY = 'local_letters_v1';

function renderLetters(items){
  lettersContainer.innerHTML = '';
  items.forEach(it => {
    const div = document.createElement('div');
    div.className = 'letter ' + (it.side || 'left');
    const p = document.createElement('p');
    p.textContent = it.text;
    const meta = document.createElement('span');
    meta.className = 'date';
    const who = it.name ? (it.name + ' · ') : '';
    const d = it.createdAt ? new Date(it.createdAt).toLocaleString() : '';
    meta.textContent = who + d;
    div.appendChild(p);
    div.appendChild(meta);
    lettersContainer.appendChild(div);
  });
}

function saveLocalLetter(obj){
  const cur = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  cur.unshift(obj);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(cur));
  renderLetters(cur);
}

function loadLocalLetters(){
  const cur = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
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
  // listen to real-time letters
  db.collection('letters').orderBy('createdAt','desc').onSnapshot(snap => {
    const items = [];
    snap.forEach(doc => {
      const data = doc.data();
      items.push({name: data.name||'', text: data.text||'', createdAt: data.createdAt ? data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt : Date.now(), side: data.side||'left'});
    });
    renderLetters(items);
  }, err => { console.error('Letters snapshot error', err); loadLocalLetters(); });
} else {
  loadLocalLetters();
}

sendBtn && sendBtn.addEventListener('click', async ()=>{
  const text = (textInput.value || '').trim();
  const name = (nameInput.value || '').trim();
  if (!text) return;
  const payload = { name, text, createdAt: Date.now(), side: 'right' };
  if (useFirestore && db){
    try{
      await db.collection('letters').add({ name, text, createdAt: firebase.firestore.FieldValue.serverTimestamp(), side: 'right' });
      textInput.value = '';
      nameInput.value = '';
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

clearBtn && clearBtn.addEventListener('click', ()=>{
  localStorage.removeItem(LOCAL_KEY);
  loadLocalLetters();
});
