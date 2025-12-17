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

// =======================
// ADD PLAN FUNCTIONALITY
// =======================
const addPlanButtons = document.querySelectorAll('.add-plan-btn');

addPlanButtons.forEach(button => {
  button.addEventListener('click', () => {
    const planBox = button.closest('.plan-box');
    const planType = planBox.dataset.plan;

    const planText = prompt("Enter your plan:");
    if (!planText) return;

    // Save plan to Firestore
    db.collection('plans').add({
      type: planType,
      text: planText,
      done: false,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      displayPlans(); // Refresh displayed plans
    }).catch(err => console.error("Error adding plan:", err));
  });
});

// =======================
// DISPLAY PLANS FUNCTION
// =======================
function displayPlans() {
  // Clear existing content
  const planBoxes = document.querySelectorAll('.plan-box');
  planBoxes.forEach(box => {
    box.querySelector('.plan-content').innerHTML = '';
  });

  // Fetch all plans from Firestore
  db.collection('plans').orderBy('timestamp').get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      const planBox = document.querySelector(`.plan-box[data-plan="${data.type}"]`);
      if (!planBox) return;

      const planItem = document.createElement('div');
      planItem.classList.add('plan-item');
      planItem.innerHTML = `
        <input type="checkbox" class="plan-checkbox">
        <p>${data.text}</p>
      `;
      planBox.querySelector('.plan-content').appendChild(planItem);

      // Checkbox click removes plan from Firestore
      planItem.querySelector('.plan-checkbox').addEventListener('click', () => {
        db.collection('plans').doc(doc.id).delete();
        planItem.remove();
      });
    });
  }).catch(err => console.error("Error fetching plans:", err));
}

// =======================
// INITIAL LOAD
// =======================
window.addEventListener('DOMContentLoaded', displayPlans);

// =======================
// HAMBURGER MENU TOGGLE
// =======================
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('active');
  hamburger.classList.toggle('open');
});
