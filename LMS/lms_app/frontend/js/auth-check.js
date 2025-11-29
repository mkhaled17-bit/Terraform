// Run this script on every page load
(function() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role"); // 'admin' or 'user'
  const current = window.location.pathname;

  // Not logged in → always go to /auth
  if (!token) {
    if (current !== '/auth') {
      window.location.href = '/auth';
    }
    return;
  }

  // Logged in → root goes to dashboard based on role
  if (current === '/' || current === '/index.html') {
    if (role === 'admin') window.location.href = '/admin';
    else window.location.href = '/dashboard';
  }

  // Prevent access to wrong dashboard
  if (role === 'user' && current === '/admin') {
    window.location.href = '/dashboard';
  }

  if (role === 'admin' && current === '/dashboard') {
    window.location.href = '/admin';
  }
})();
