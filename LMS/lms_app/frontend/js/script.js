
/* ------- small helpers ------- */
const DEFAULT_BASE = 'http://localhost:5000';
const $ = id => document.getElementById(id);

function normalizeBase(input) {
  let b = (input || '').trim() || DEFAULT_BASE;
  if (!/^https?:\/\//i.test(b)) b = 'http://' + b;
  // remove trailing slashes
  b = b.replace(/\/+$/, '');
  return b;
}

function setMessage(text = '', isSuccess = false) {
  const el = $('message');
  el.textContent = text;
  el.classList.toggle('success', !!isSuccess);
}

/* ------- toggle UI ------- */
function setToggle(isSignup) {
  const container = $('toggle-text');
  container.innerHTML = '';
  const span = document.createElement('span');

  if (isSignup) {
    span.textContent = 'Already have an account? ';
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = 'Login';
    a.addEventListener('click', e => { e.preventDefault(); showLogin(true); });
    span.appendChild(a);
  } else {
    span.textContent = "Don't have an account? ";
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = 'Sign up';
    a.addEventListener('click', e => { e.preventDefault(); showSignup(true); });
    span.appendChild(a);
  }
  container.appendChild(span);
}

/* ------- show/hide forms ------- */
function showSignup(preserveMessage = false) {
  $('signup-fields').style.display = 'block';
  $('login-fields').style.display = 'none';
  $('form-title').textContent = 'Sign Up';
  setToggle(true);
  if (!preserveMessage) setMessage('');
}

function showLogin(preserveMessage = false) {
  $('signup-fields').style.display = 'none';
  $('login-fields').style.display = 'block';
  $('form-title').textContent = 'Login';
  setToggle(false);
  if (!preserveMessage) setMessage('');
}

// Initialize default view
setToggle(false);

/* ------- API helpers ------- */
async function safeParseResponse(res) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await res.json(); } catch (e) { return { message: 'Invalid JSON response' }; }
  } else {
    const text = await res.text();
    return text ? { message: text } : {};
  }
}

/* ------- Signup ------- */
async function signup() {
  setMessage('');
  const base = normalizeBase($('base-url').value);
  const username = $('signup-username').value.trim();
  const password = $('signup-password').value.trim();
  const role = $('signup-role').value;

  if (!username || !password) { setMessage('Please provide username and password.'); return; }
  if (!['admin', 'user'].includes(role)) { setMessage('Role must be admin or user.'); return; }

  try {
    const res = await fetch(`${base}/api/users/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });
    const data = await safeParseResponse(res);

    if (res.ok) {
      setMessage('Signup successful! You can login now.', true);
      $('signup-username').value = '';
      $('signup-password').value = '';
      showLogin(true);
    } else {
      const errMsg = data.error || data.message || JSON.stringify(data);
      setMessage(errMsg || 'Signup failed.');
    }
  } catch (err) {
    setMessage('Network error: ' + (err.message || err));
  }
}

/* ------- Login ------- */
async function login() {
  setMessage('');
  const baseRaw = $('base-url').value;
  const base = normalizeBase(baseRaw);
  const username = $('login-username').value.trim();
  const password = $('login-password').value.trim();

  if (!username || !password) { setMessage('Please enter username and password.'); return; }

  try {
    const res = await fetch(`${base}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await safeParseResponse(res);

    if (res.ok && data && data.token) {
      // Save token, role, and base URL
      localStorage.setItem('token', data.token);
      if (data.role) localStorage.setItem('role', data.role);
      localStorage.setItem('base_url', base);

      setMessage('Login successful — redirecting...', true);

      // Redirect based on role
      if (data.role === 'admin') {
        window.location.href = '/';
      } else {
        window.location.href = '/';
      }

    } else {
      const errMsg = (data && (data.error || data.message)) || 'Invalid credentials';
      setMessage(errMsg);
    }
  } catch (err) {
    setMessage('Network error: ' + (err.message || err));
  }
}

/* ------- Event Listeners ------- */
$('btn-signup').addEventListener('click', signup);
$('btn-login').addEventListener('click', login);

['login-username', 'login-password'].forEach(id => {
  $(id).addEventListener('keypress', e => { if (e.key === 'Enter') login(); });
});
['signup-username', 'signup-password'].forEach(id => {
  $(id).addEventListener('keypress', e => { if (e.key === 'Enter') signup(); });
});
