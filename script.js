// script.js – Soft Animations

// Smooth scroll for "Scroll Down" button
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});

// Fade-in animation when elements appear on screen
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('show');
    }
  });
});

document.querySelectorAll('.intro-section h2, .intro-section p').forEach(el => {
  observer.observe(el);
});

// Soft floating animation for decorative elements (if added later)
function floatSoft(selector) {
  const el = document.querySelector(selector);
  if (!el) return;

  let y = 0;
  let direction = 1;

  setInterval(() => {
    if (y >= 6) direction = -1;
    if (y <= -6) direction = 1;

    y += direction * 0.2;
    el.style.transform = `translateY(${y}px)`;
  }, 30);
}

// Example: floatSoft('.floating-heart');
// INTRO PHOTO TRANSITION
const introPhoto = document.getElementById("introPhoto");

const photos = [
  "images/p1.jpg",
  "images/p2.jpg",
  "images/p3.jpg",
  "images/p4.jpg",
  "images/p5.jpg"
];

let index = 0;

// Initial fade-in
setTimeout(() => introPhoto.classList.add("show"), 100);

// Auto transition
setInterval(() => {
  index = (index + 1) % photos.length;
  changePhoto();
}, 3000);

// Click to change
introPhoto.addEventListener("click", () => {
  index = (index + 1) % photos.length;
  changePhoto();
});

function changePhoto() {
  introPhoto.classList.remove("show");

  setTimeout(() => {
    introPhoto.src = photos[index];
    introPhoto.classList.add("show");
  }, 300);
}
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('active');
  // Animate hamburger
  hamburger.classList.toggle('open');
});