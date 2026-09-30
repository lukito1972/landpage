const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.site-nav');
toggle?.addEventListener('click', () => {
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!expanded));
  toggle.querySelector('span').textContent = expanded ? '+' : '−';
  menu.classList.toggle('is-open', !expanded);
});
menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menu.classList.remove('is-open');
  toggle?.setAttribute('aria-expanded', 'false');
  if (toggle) toggle.querySelector('span').textContent = '+';
}));
document.querySelector('#year').textContent = new Date().getFullYear();
