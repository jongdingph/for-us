// Journal client using Firestore (compat)
(function(){
  const status = document.getElementById('status');
  const entriesEl = document.getElementById('entries');
  const saveBtn = document.getElementById('saveNote');
  const noteText = document.getElementById('noteText');
  const authorEl = document.getElementById('author');

  function disableUI(msg){
    if(status) status.textContent = msg;
    if(saveBtn) saveBtn.disabled = true;
  }

  // Verify firebase config exists
  if (!window.firebaseConfig) {
    disableUI('Firestore not configured — add your config to assets/firebase-config.js');
    return;
  }

  // init firebase
  try{
    firebase.initializeApp(window.firebaseConfig);
    var db = firebase.firestore();
  }catch(e){
    console.error('Firebase init error', e);
    disableUI('Failed to initialize Firebase. Check console.');
    return;
  }

  // Save a note
  saveBtn.addEventListener('click', async ()=>{
    const text = noteText.value && noteText.value.trim();
    if(!text) return;
    saveBtn.disabled = true; status.textContent = 'Saving...';
    try{
      await db.collection('journal').add({
        text, author: authorEl.value||null, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      noteText.value = '';
      authorEl.value = '';
      status.textContent = 'Saved ✨';
    }catch(e){
      console.error(e); status.textContent = 'Save failed. Check console.';
    }finally{ saveBtn.disabled = false; setTimeout(()=>status.textContent='',1500); }
  });

  // Render entries in real time
  db.collection('journal').orderBy('createdAt','desc').limit(50).onSnapshot(snap=>{
    entriesEl.innerHTML = '';
    snap.forEach(doc=>{
      const d = doc.data();
      const entry = document.createElement('div'); entry.className='journal-entry';
      entry.innerHTML = `<div>${escapeHTML(d.text||'')}</div><div class="journal-meta">${d.author?escapeHTML(d.author)+' • ':''}${d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : ''}</div>`;
      entriesEl.appendChild(entry);
    });
  }, err=>{ console.error('snapshot err',err); status.textContent='Unable to load entries.'});

  function escapeHTML(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }
})();
