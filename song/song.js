document.addEventListener('DOMContentLoaded', () => {
  // Pause other audio elements when one plays
  const audios = Array.from(document.querySelectorAll('audio'));
  audios.forEach(a => {
    a.addEventListener('play', () => {
      audios.forEach(other => { if (other !== a) other.pause(); });
    });
  });
});
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});
