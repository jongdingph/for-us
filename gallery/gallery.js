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
    img.src = item.images[0];
    img.alt = item.label || 'Photos';
    const p = document.createElement('p');
    p.textContent = item.label || item.date || 'Untitled';
    div.appendChild(img);
    div.appendChild(p);
    div.addEventListener('click', () => showGrid(item.id));
    return div;
  }

  // Utility: create photo-grid element
  function makeGrid(item){
    const grid = document.createElement('div');
    grid.id = item.id;
    grid.className = 'photo-grid show';
    item.images.forEach(src => {
      const im = document.createElement('img');
      im.src = src;
      grid.appendChild(im);
      im.addEventListener('click', () => {
        lightbox.style.display = 'flex';
        lightboxImg.src = im.src;
      });
    });
    return grid;
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
          return ref.put(file).then(snap => snap.ref.getDownloadURL());
        });
        const urls = await Promise.all(uploadPromises);
        const item = { id, label, date: label, images: urls };
        // Save metadata to Firestore and render locally
        await db.collection('gallery').add({ label: item.label, date: item.date, images: item.images, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
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
  });

  // Existing static grids: bind lightbox
  document.querySelectorAll('.photo-grid img').forEach(img => img.addEventListener('click', ()=>{ lightbox.style.display='flex'; lightboxImg.src = img.src; }));

  // Close lightbox
  closeBtn.addEventListener('click', ()=> lightbox.style.display='none');
  lightbox.addEventListener('click', e=> { if(e.target===lightbox) lightbox.style.display='none'; });

  // Hamburger toggle
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  if(hamburger) hamburger.addEventListener('click', ()=>{ navLinks.classList.toggle('active'); hamburger.classList.toggle('open'); });

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
        const item = { id: fid, label: data.label || data.date || 'Photos', date: data.date || '', images: data.images || [] };
        const folderEl = makeFolder(item);
        foldersWrapper.appendChild(folderEl);
        const gridEl = makeGrid(item);
        foldersWrapper.parentElement.insertAdjacentElement('beforeend', gridEl);
      });
    }, err => console.error('gallery snapshot error', err));
  }
});
