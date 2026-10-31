/* Essential interactions are independent of animation vendors. */
setTimeout(() => {
  window.__introExpired = true;
  document.documentElement.classList.remove('intro-running');
  document.getElementById('preloader')?.remove();
}, 4500);
if (document.getElementById('project-modal')) {
  import('./projects.js').then(m => m.initProjects()).catch(() => {});
}
