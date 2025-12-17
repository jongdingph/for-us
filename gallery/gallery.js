document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const foldersWrapper = document.querySelector('.memory-folders');
  const grids = document.querySelectorAll('.photo-grid');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const closeBtn = document.querySelector('.lightbox .close');
  const addBtn = document.getElementById('addPhotosBtn');
  const addModal = document.getElementById('addModal');
  const cancelAdd = document.getElementById('cancelAdd');
  const saveAdd = document.getElementById('saveAdd');
  const photoFiles = document.getElementById('photoFiles');
  const photoLabel = document.getElementById('photoLabel');
  const photoDate = document.getElementById('photoDate');
  // Edit/Delete modal elements
  const editModal = document.getElementById('editModal');
  const editThumbs = document.getElementById('editThumbs');
  const editFiles = document.getElementById('editFiles');
  const editLabel = document.getElementById('editLabel');
  const editDate = document.getElementById('editDate');
  const cancelEdit = document.getElementById('cancelEdit');
  const saveEdit = document.getElementById('saveEdit');
  const deleteModal = document.getElementById('deleteModal');
  const cancelDelete = document.getElementById('cancelDelete');
  const confirmDelete = document.getElementById('confirmDelete');
  let currentEditing = null; // {id, docId?, images:[], label, date}
  let pendingDeleteId = null;

  // localStorage key for user-added galleries
  const STORAGE_KEY = 'localGalleryItems_v1';
  // Firestore & Storage instances (if initialized)
  let db = null;
  let storage = null;
  const useFirebase = !!window.firebaseConfig;
  if (useFirebase) {
    try {
      if (!firebase.apps || firebase.apps.length === 0) firebase.initializeApp(window.firebaseConfig);
      db = firebase.firestore();
      storage = firebase.storage();
    } catch (e) { console.warn('Firebase init failed', e); }
  }

  // Utility: create folder element
  function makeFolder(item){
    const div = document.createElement('div');
    div.className = 'folder';
    div.dataset.folder = item.id;
    const img = document.createElement('img');
    const first = item.images && item.images[0];
    img.src = (typeof first === 'string') ? first : (first && first.url) ? first.url : '';
    img.alt = item.label || 'Photos';
    const p = document.createElement('p');
    p.textContent = item.label || item.date || 'Untitled';
    div.appendChild(img);
    div.appendChild(p);
    div.addEventListener('click', () => showGrid(item.id));
    // attach edit/delete actions for local or firebase items
    attachFolderActions(div, item);
    return div;
  }

  // Utility: create photo-grid element
  function makeGrid(item){
    const grid = document.createElement('div');
    grid.id = item.id;
    grid.className = 'photo-grid show';
    item.images.forEach(src => {
      const im = document.createElement('img');
      const srcUrl = (typeof src === 'string') ? src : (src && src.url) ? src.url : '';
      im.src = srcUrl;
      grid.appendChild(im);
      im.addEventListener('click', () => {
        lightbox.style.display = 'flex';
        lightboxImg.src = im.src;
      });
    });
    return grid;
  }

  // Attach action buttons to editable folder elements
  function attachFolderActions(folderEl, item){
    const id = item.id || folderEl.dataset.folder;
    // only editable for local- or fb- items
    if (!id || (!id.startsWith('local-') && !id.startsWith('fb-'))) return;
    const actions = document.createElement('div'); actions.className='folder-actions';
    const editBtn = document.createElement('button'); editBtn.className='folder-action'; editBtn.textContent='Edit';
    const delBtn = document.createElement('button'); delBtn.className='folder-action delete'; delBtn.textContent='Delete';
    actions.appendChild(editBtn); actions.appendChild(delBtn);
    folderEl.appendChild(actions);
    editBtn.addEventListener('click', (e)=>{ e.stopPropagation(); openEditModal(id); });
    delBtn.addEventListener('click', (e)=>{ e.stopPropagation(); openDeleteModal(id); });
  }

  // Load saved items from localStorage and inject into DOM
  function loadLocalItems(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    try{
      const items = JSON.parse(raw);
      items.forEach(item => {
        // avoid duplicating if already present
        if(document.getElementById(item.id)) return;
        const folderEl = makeFolder(item);
        foldersWrapper.appendChild(folderEl);
        const gridEl = makeGrid(item);
        // append after existing grids
        foldersWrapper.parentElement.insertAdjacentElement('beforeend', gridEl);
      });
    }catch(e){console.error('Failed to parse local gallery', e)}
  }

  // Show grid by id and hide others
  function showGrid(id){
    document.querySelectorAll('.photo-grid').forEach(g=>g.classList.remove('show'));
    const grid = document.getElementById(id);
    if(grid) {
      grid.classList.add('show');
      const navbarHeight = document.querySelector('.navbar').offsetHeight || 0;
      const y = grid.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 10;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  // Save new item to localStorage (fallback) or Firestore
  function saveItem(item){
    if (db) {
      // store metadata in Firestore (images likely already uploaded)
      db.collection('gallery').add({ label: item.label, date: item.date, images: item.images, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
        .catch(e=>console.error('Failed to save gallery doc',e));
    } else {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift(item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    }
  }

  // ---------- Edit flow ----------
  // Open edit modal: load current images and metadata
  async function openEditModal(id){
    currentEditing = { id, images: [], label: '', date: '' };
    editThumbs.innerHTML = '';
    editFiles.value = '';
    // local
    if (id.startsWith('local-')){
      const raw = localStorage.getItem(STORAGE_KEY); const arr = raw ? JSON.parse(raw) : [];
      const item = arr.find(x=>x.id===id);
      if (!item) return alert('Item not found');
      currentEditing.images = item.images.slice(); currentEditing.label = item.label; currentEditing.date = item.date; currentEditing.source='local';
    } else if (id.startsWith('fb-') && db){
      const docId = id.slice(3);
      try{
        const doc = await db.collection('gallery').doc(docId).get();
        if (!doc.exists) return alert('Gallery item not found in Firestore');
        const data = doc.data();
        currentEditing.images = (data.images||[]).slice(); currentEditing.label = data.label||data.date||''; currentEditing.date = data.date||''; currentEditing.source='fb'; currentEditing.docId = docId;
      }catch(e){ console.error(e); return alert('Failed to load item for editing'); }
    } else return;

    // populate UI
    currentEditing.images.forEach((src, idx)=>{
      const url = (typeof src === 'string') ? src : (src && src.url) ? src.url : '';
      const thumb = document.createElement('div'); thumb.style.position='relative'; thumb.style.margin='6px';
      thumb.innerHTML = `<img src="${url}" style="width:120px;height:80px;object-fit:cover;border-radius:8px">`;
      const rem = document.createElement('button'); rem.textContent='✕'; rem.style.position='absolute'; rem.style.right='2px'; rem.style.top='2px'; rem.style.background='rgba(0,0,0,0.5)'; rem.style.color='#fff'; rem.style.border='none'; rem.style.borderRadius='8px'; rem.style.cursor='pointer';
      rem.addEventListener('click', async ()=>{ // remove image (and delete from storage if applicable)
        try{
          // if firebase source and this image has a path, delete it from storage
          if (currentEditing.source==='fb' && storage){
            const path = (src && src.path) ? src.path : null;
            if (path){
              try{ await storage.ref().child(path).delete(); }catch(e){ console.warn('Failed to delete storage file', e); }
            }
          }
        }catch(e){ console.error('error removing image', e); }
        currentEditing.images.splice(idx,1); thumb.remove();
      });
      thumb.appendChild(rem); editThumbs.appendChild(thumb);
    });
    editLabel.value = currentEditing.label || '';
    // set date input if parseable
    try{ if (currentEditing.date) editDate.value = (new Date(currentEditing.date)).toISOString().slice(0,10); }catch(e){}
    editModal.style.display='flex';
  }

  // Save edits
  saveEdit.addEventListener('click', async ()=>{
    if (!currentEditing) return;
    saveEdit.disabled = true; saveEdit.textContent = 'Saving...';
    const newFiles = Array.from(editFiles.files || []);
    const newLabel = editLabel.value.trim();
    const newDateVal = editDate.value;
    const newDate = newDateVal ? (new Date(newDateVal)).toLocaleDateString() : currentEditing.date;
    try{
      // handle new files
      if (newFiles.length){
        if (currentEditing.source==='fb' && storage){
          const upload = newFiles.map(f=>{ const ref = storage.ref().child(`gallery/${Date.now()}_${f.name}`); return ref.put(f).then(snap=> snap.ref.getDownloadURL().then(url => ({url, path: snap.ref.fullPath}))); });
          const uploaded = await Promise.all(upload); currentEditing.images.push(...uploaded);
        } else {
          // read as dataURL
          const reads = newFiles.map(f=>new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); }));
          const dataurls = await Promise.all(reads); currentEditing.images.push(...dataurls);
        }
      }

      // update storage: Firestore update or localStorage replace
      if (currentEditing.source==='fb' && db){
        // ensure images saved to Firestore are objects with url and path when available
        await db.collection('gallery').doc(currentEditing.docId).update({ label: newLabel || currentEditing.label, date: newDate || currentEditing.date, images: currentEditing.images });
      } else if (currentEditing.source==='local'){
        const raw = localStorage.getItem(STORAGE_KEY); const arr = raw ? JSON.parse(raw) : [];
        const idx = arr.findIndex(x=>x.id===currentEditing.id);
        if (idx!==-1){ arr[idx].images = currentEditing.images; arr[idx].label = newLabel || currentEditing.label; arr[idx].date = newDate || currentEditing.date; localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
      }

      // update DOM folder and grid
      const folderEl = document.querySelector(`.folder[data-folder="${currentEditing.id}"]`);
      if (folderEl){
        const img = folderEl.querySelector('img'); const first = currentEditing.images[0]; const firstUrl = (typeof first === 'string') ? first : (first && first.url) ? first.url : ''; if (firstUrl) img.src = firstUrl;
        const p = folderEl.querySelector('p'); p.textContent = newLabel || currentEditing.label || newDate || '';
      }
      const grid = document.getElementById(currentEditing.id);
      if (grid){ grid.innerHTML = ''; currentEditing.images.forEach(src=>{ const im=document.createElement('img'); const srcUrl = (typeof src === 'string') ? src : (src && src.url) ? src.url : ''; im.src = srcUrl; grid.appendChild(im); im.addEventListener('click', ()=>{ lightbox.style.display='flex'; lightboxImg.src = im.src; }); }); }

      editModal.style.display='none'; currentEditing = null;
    }catch(e){ console.error('save edit failed', e); alert('Failed to save changes.'); }
    finally{ saveEdit.disabled = false; saveEdit.textContent = 'Save Changes'; }
  });

  cancelEdit.addEventListener('click', ()=>{ editModal.style.display='none'; currentEditing=null; });

  // ---------- Delete flow ----------
  function openDeleteModal(id){ pendingDeleteId = id; deleteModal.style.display='flex'; }
  cancelDelete.addEventListener('click', ()=>{ pendingDeleteId = null; deleteModal.style.display='none'; });
  confirmDelete.addEventListener('click', async ()=>{
    if (!pendingDeleteId) return;
    const id = pendingDeleteId; pendingDeleteId = null; deleteModal.style.display='none';
    try{
      if (id.startsWith('fb-') && db){
        const docId = id.slice(3);
        // attempt to delete storage files referenced by the doc
        try{
          const doc = await db.collection('gallery').doc(docId).get();
          if (doc.exists){
            const data = doc.data();
            const imgs = data.images || [];
            for (const im of imgs){
              const path = (typeof im === 'string') ? null : (im && im.path) ? im.path : null;
              if (path && storage){
                try{ await storage.ref().child(path).delete(); }catch(e){ console.warn('Failed to delete storage path', path, e); }
              }
            }
          }
        }catch(e){ console.warn('Failed to fetch doc for deletion cleanup', e); }
        await db.collection('gallery').doc(docId).delete();
      } else if (id.startsWith('local-')){
        const raw = localStorage.getItem(STORAGE_KEY); const arr = raw ? JSON.parse(raw) : [];
        const idx = arr.findIndex(x=>x.id===id); if (idx!==-1){ arr.splice(idx,1); localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
      }
      // remove DOM
      const folderEl = document.querySelector(`.folder[data-folder="${id}"]`); if (folderEl) folderEl.remove();
      const grid = document.getElementById(id); if (grid) grid.remove();
    }catch(e){ console.error('delete failed', e); alert('Failed to delete item.'); }
  });

  // Handle add photo flow
  addBtn.addEventListener('click', ()=>{ addModal.style.display='flex'; });
  cancelAdd.addEventListener('click', ()=>{ addModal.style.display='none'; photoFiles.value=''; photoLabel.value=''; });

  saveAdd.addEventListener('click', async ()=>{
    const files = Array.from(photoFiles.files || []);
    if(!files.length){ alert('Please choose at least one image'); return; }
    const labelInput = photoLabel.value.trim();
    const dateInput = document.getElementById('photoDate').value;
    const label = dateInput ? (new Date(dateInput)).toLocaleDateString() : (labelInput || (new Date()).toLocaleDateString());
    const id = (db ? 'fb-' : 'local-') + Date.now();

    // If Firebase is available, upload files to Storage and store doc in Firestore
    if (db && storage) {
      saveAdd.disabled = true; saveAdd.textContent = 'Uploading...';
      try {
        const uploadPromises = files.map(file => {
          const ref = storage.ref().child(`gallery/${Date.now()}_${file.name}`);
          return ref.put(file).then(snap => snap.ref.getDownloadURL().then(url => ({ url, path: snap.ref.fullPath })));
        });
        const uploaded = await Promise.all(uploadPromises); // array of {url, path}
        // Save metadata (images with url+path) to Firestore and render locally using the returned doc id
        const docRef = await db.collection('gallery').add({ label: label, date: label, images: uploaded, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        const fbId = 'fb-' + docRef.id;
        const item = { id: fbId, label: label, date: label, images: uploaded };
        const folderEl = makeFolder(item);
        foldersWrapper.appendChild(folderEl);
        const gridEl = makeGrid(item);
        foldersWrapper.parentElement.insertAdjacentElement('beforeend', gridEl);
        addModal.style.display='none'; photoFiles.value=''; photoLabel.value=''; document.getElementById('photoDate').value='';
        showGrid(id);
      } catch (e) { console.error('upload error', e); alert('Upload failed. See console.'); }
      finally { saveAdd.disabled = false; saveAdd.textContent = 'Save'; }
    } else {
      // Fallback: store Data URLs in localStorage (limited by storage quota)
      const promises = files.map(f => new Promise((res, rej) => {
        const r = new FileReader(); r.onload = ()=>res(r.result); r.onerror = rej; r.readAsDataURL(f);
      }));
      try{
        const images = await Promise.all(promises);
        const item = { id, label, date: label, images };
        const folderEl = makeFolder(item);
        foldersWrapper.appendChild(folderEl);
        const gridEl = makeGrid(item);
        foldersWrapper.parentElement.insertAdjacentElement('beforeend', gridEl);
        saveItem(item);
        addModal.style.display='none'; photoFiles.value=''; photoLabel.value=''; document.getElementById('photoDate').value='';
        showGrid(id);
      }catch(err){ console.error('file read err',err); alert('Failed to read files.'); }
    }
  });

  // Initial binding for existing static folders/grids
  document.querySelectorAll('.folder').forEach(folder => {
    folder.addEventListener('click', ()=>{
      const id = folder.dataset.folder;
      showGrid(id);
    });
    // attach actions where appropriate (local/fb only)
    const id = folder.dataset.folder;
    const img = folder.querySelector('img');
    const p = folder.querySelector('p');
    const item = { id: id, images: [img?img.src:''], label: p? p.textContent : '' };
    attachFolderActions(folder, item);
  });

  // Existing static grids: bind lightbox
  document.querySelectorAll('.photo-grid img').forEach(img => img.addEventListener('click', ()=>{ lightbox.style.display='flex'; lightboxImg.src = img.src; }));

  // Close lightbox
  closeBtn.addEventListener('click', ()=> lightbox.style.display='none');
  lightbox.addEventListener('click', e=> { if(e.target===lightbox) lightbox.style.display='none'; });

  // Hamburger handled by assets/main.js

  // Load saved local items
  loadLocalItems();
  // If Firestore available, listen to gallery collection and render items
  if (db) {
    db.collection('gallery').orderBy('createdAt','desc').onSnapshot(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const fid = 'fb-' + doc.id;
        // avoid duplicates
        if (document.getElementById(fid)) return;
        // normalize images: if stored as array of strings, convert to objects {url}
        const rawImages = data.images || [];
        const images = rawImages.map(i => (typeof i === 'string') ? { url: i, path: null } : i);
        const item = { id: fid, label: data.label || data.date || 'Photos', date: data.date || '', images };
        const folderEl = makeFolder(item);
        foldersWrapper.appendChild(folderEl);
        const gridEl = makeGrid(item);
        foldersWrapper.parentElement.insertAdjacentElement('beforeend', gridEl);
      });
    }, err => console.error('gallery snapshot error', err));
  }
});

