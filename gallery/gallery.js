document.addEventListener('DOMContentLoaded', () => {
  // Folders and photo grids
  const folders = document.querySelectorAll('.folder');
  const grids = document.querySelectorAll('.photo-grid');

  // Folder click
  folders.forEach(folder => {
    folder.addEventListener('click', () => {
      const folderId = folder.dataset.folder;

      // Hide all grids
      grids.forEach(grid => grid.classList.remove('show'));

      // Show clicked grid
      const grid = document.getElementById(folderId);
      if (grid) {
        grid.classList.add('show');

        // Scroll to the grid (offset for navbar)
        const navbarHeight = document.querySelector('.navbar').offsetHeight || 0;
        const y = grid.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 10;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  // LIGHTBOX
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const closeBtn = document.querySelector('.lightbox .close');

  grids.forEach(grid => {
    grid.querySelectorAll('img').forEach(img => {
      img.addEventListener('click', () => {
        lightbox.style.display = 'flex';
        lightboxImg.src = img.src;
      });
    });
  });

  // Close lightbox
  closeBtn.addEventListener('click', () => {
    lightbox.style.display = 'none';
  });

  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) {
      lightbox.style.display = 'none';
    }
  });

  // Hamburger toggle
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    hamburger.classList.toggle('open');
  });
});
