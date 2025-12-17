// =======================
// PLANS.JS - Firebase Firestore Integration
// =======================

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDplFxDb9KBsqxJqPko9UK6l6YBO--Lvaw",
  authDomain: "couplewebsite-61438.firebaseapp.com",
  projectId: "couplewebsite-61438",
  storageBucket: "couplewebsite-61438.firebasestorage.app",
  messagingSenderId: "51464681388",
  appId: "1:51464681388:web:4b2b714c566a59e02fec09",
  measurementId: "G-EHKPYVER76"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// Determine whether Firestore is available
const hasFirestore = typeof db !== 'undefined' && db;

// localStorage fallback key
const LS_KEY = 'local_plans_v1';

function readLocal(){
  try{ return JSON.parse(localStorage.getItem(LS_KEY)) || []; }catch(e){ return []; }
}
function writeLocal(arr){ localStorage.setItem(LS_KEY, JSON.stringify(arr)); }

// Generic addPlan that uses Firestore if available otherwise localStorage
function addPlan(type, text){
  const item = { id: 'local_' + Date.now(), type, text, done: false, timestamp: Date.now() };
  if (hasFirestore){
    return db.collection('plans').add({ type, text, done: false, timestamp: firebase.firestore.FieldValue.serverTimestamp() }).then(()=>displayPlans()).catch(err=>console.error(err));
  } else {
    const arr = readLocal(); arr.push(item); writeLocal(arr); displayPlans(); return Promise.resolve();
  }
}

function updatePlanDone(id, done){
  if (hasFirestore && id && !id.startsWith('local_')){
    return db.collection('plans').doc(id).update({done});
  } else {
    const arr = readLocal(); const idx = arr.findIndex(x=>x.id===id); if (idx>=0){ arr[idx].done = done; writeLocal(arr); displayPlans(); }
    return Promise.resolve();
  }
}

function deletePlan(id){
  if (hasFirestore && id && !id.startsWith('local_')){
    return db.collection('plans').doc(id).delete().then(()=>displayPlans());
  } else {
    const arr = readLocal().filter(x=>x.id!==id); writeLocal(arr); displayPlans(); return Promise.resolve();
  }
}

let currentFilter = 'all';

function renderPlanItem(plan, planBox){
  const planItem = document.createElement('div');
  planItem.className = 'plan-item' + (plan.done? ' done':'');
  planItem.dataset.id = plan.id || '';
  planItem.innerHTML = `
    <input type="checkbox" class="plan-checkbox" ${plan.done? 'checked':''}>
    <p>${escapeHtml(plan.text)}</p>
    <button class="delete-btn" title="Delete">×</button>
  `;
  const cb = planItem.querySelector('.plan-checkbox');
  cb.addEventListener('change', ()=>{ updatePlanDone(plan.id, cb.checked); });
  planItem.querySelector('.delete-btn').addEventListener('click', ()=>{ if (confirm('Delete this plan?')) deletePlan(plan.id); });
  planBox.querySelector('.plan-content').appendChild(planItem);
}

function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

function displayPlans(){
  const planBoxes = document.querySelectorAll('.plan-box');
  planBoxes.forEach(box => box.querySelector('.plan-content').innerHTML = '');

  if (hasFirestore){
    db.collection('plans').orderBy('timestamp').get().then(snapshot=>{
      const docs = [];
      snapshot.forEach(doc=>{ const d = doc.data(); docs.push(Object.assign({id:doc.id}, d)); });
      docs.forEach(d=>{
        const pb = document.querySelector(`.plan-box[data-plan="${d.type}"]`);
        if (!pb) return;
        if (currentFilter==='active' && d.done) return;
        if (currentFilter==='done' && !d.done) return;
        renderPlanItem(d, pb);
      });
    }).catch(err=>console.error('Error fetching plans:',err));
  } else {
    const arr = readLocal();
    arr.forEach(d=>{
      const pb = document.querySelector(`.plan-box[data-plan="${d.type}"]`);
      if (!pb) return;
      if (currentFilter==='active' && d.done) return;
      if (currentFilter==='done' && !d.done) return;
      renderPlanItem(d, pb);
    });
  }
}

// wire up add buttons and inputs
function initUI(){
  document.querySelectorAll('.plan-box').forEach(box=>{
    const btn = box.querySelector('.add-plan-btn');
    const input = box.querySelector('.plan-input');
    btn.addEventListener('click', ()=>{
      const text = (input.value||'').trim(); if (!text) return; addPlan(box.dataset.plan, text).then(()=>{ input.value=''; });
    });
    input.addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ btn.click(); } });
  });

  // filters
  document.querySelectorAll('.filter-bar button').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.querySelectorAll('.filter-bar button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); currentFilter = b.dataset.filter; displayPlans();
    });
  });
}

window.addEventListener('DOMContentLoaded', ()=>{ initUI(); displayPlans(); });

// Hamburger behavior is handled in assets/main.js
