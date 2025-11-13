//pa calar, lo quite mejor
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  if (page === 'register') {
    const form = document.querySelector('form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      // aquí “simulas” el registro y navegas al login
      window.location.href = './index.html';
    });
  }
});