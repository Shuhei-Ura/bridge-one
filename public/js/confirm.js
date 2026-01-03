document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      const msg = form.getAttribute('data-confirm') || '本当に実行しますか？';
      if (!window.confirm(msg)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    });
  });

  // ---- button[data-confirm] 形式 ----
  document.querySelectorAll('button[data-confirm]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const msg = btn.getAttribute('data-confirm') || '本当に実行しますか？';
      if (!window.confirm(msg)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    });
  });
});