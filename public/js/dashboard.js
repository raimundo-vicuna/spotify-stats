let statusNavBar = true;
let statusButtonNav = true;
const dom = {
  navbar: document.querySelector('.sidebar'),
  toggleNavBarButton: document.querySelector('.icon-menu'),
  settingsElementLi: document.querySelector('.nav-item-settings'),
  settingsElementA: document.querySelector('.nav-item-settings .nav-link'),
  settingsElementDiv: document.querySelector('.nav-item-settings .dropdown-menu'),
  githubElement: document.querySelector('.github'),
  arrowUpElement: document.querySelector('.home'),
  dateElement: document.querySelector('#date'),
  copyrightElement: document.querySelector('.copyright')
};
function toggleSettingsNav(show) {
  dom.settingsElementLi?.classList.toggle('show', show);
  dom.settingsElementDiv?.classList.toggle('show', show);
  dom.settingsElementA?.setAttribute('aria-expanded', show ? 'true' : 'false');
  statusButtonNav = !show;
}
function showNavBar() { dom.navbar?.classList.add('active'); statusNavBar = false; }
function hideNavBar() { dom.navbar?.classList.remove('active'); statusNavBar = true; }
function reloadPage() { window.location.reload(); }
const today = new Date();
if (dom.dateElement) dom.dateElement.textContent = today.toLocaleDateString();
if (dom.copyrightElement) dom.copyrightElement.textContent = 'Copyright © RVC ' + today.getFullYear();
dom.arrowUpElement?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
dom.settingsElementA?.addEventListener('click', event => { event.preventDefault(); toggleSettingsNav(statusButtonNav); });
dom.githubElement?.addEventListener('click', () => window.open('https://github.com/raideus138/regal', '_blank', 'noopener,noreferrer'));
dom.toggleNavBarButton?.addEventListener('click', () => statusNavBar ? showNavBar() : hideNavBar());
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !statusNavBar) hideNavBar();
  if (event.key === 'F5' && !event.ctrlKey && !event.metaKey) { event.preventDefault(); reloadPage(); }
});
document.querySelector('.reload')?.addEventListener('click', event => { event.preventDefault(); reloadPage(); });
