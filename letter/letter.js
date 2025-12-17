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
