document.addEventListener('DOMContentLoaded', () => {
  // Pause other audio elements when one plays
  const audios = Array.from(document.querySelectorAll('audio'));
  audios.forEach(a => {
    a.addEventListener('play', () => {
      audios.forEach(other => { if (other !== a) other.pause(); });
    });
  });
});
// Hamburger behavior handled globally in assets/main.js
