// auth.js — Authentication & Session Management

const Auth = (() => {
  const SESSION_KEY = 'ca_session';
  const USERS_KEY   = 'ca_users';

  // Default users (pre-seeded)
  const DEFAULT_USERS = [
    { id:1, name:'Suresh Patil',   email:'admin@ksp.gov.in',    password: hashPwd('Admin@123'),   role:'Super Admin',    avatar:'SP', active:true  },
    { id:2, name:'Kavitha Reddy',  email:'analyst@ksp.gov.in',  password: hashPwd('Analyst@123'), role:'Analyst',        avatar:'KR', active:true  },
    { id:3, name:'Mohan Das',      email:'viewer@ksp.gov.in',   password: hashPwd('Viewer@123'),  role:'Viewer',         avatar:'MD', active:true  },
  ];

  // Simple deterministic hash (not cryptographic — frontend only)
  function hashPwd(pwd) {
    let h = 0x811c9dc5;
    for (let i = 0; i < pwd.length; i++) {
      h ^= pwd.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8,'0') + btoa(pwd.split('').reverse().join('')).replace(/=/g,'');
  }

  function getUsers() {
    try {
      const stored = localStorage.getItem(USERS_KEY);
      return stored ? JSON.parse(stored) : [...DEFAULT_USERS];
    } catch { return [...DEFAULT_USERS]; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getSession() {
    try {
      const s = sessionStorage.getItem(SESSION_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  function setSession(user) {
    const session = {
      id:        user.id,
      name:      user.name,
      email:     user.email,
      role:      user.role,
      avatar:    user.avatar,
      loginTime: new Date().toISOString(),
      expires:   Date.now() + 8 * 60 * 60 * 1000  // 8 hours
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function isLoggedIn() {
    const s = getSession();
    if (!s) return false;
    if (Date.now() > s.expires) { clearSession(); return false; }
    return true;
  }

  function currentUser() {
    return getSession();
  }

  function login(email, password) {
    const users = getUsers();
    const user  = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.active);
    if (!user) return { ok: false, msg: 'No active account found with this email.' };
    if (user.password !== hashPwd(password)) return { ok: false, msg: 'Incorrect password. Please try again.' };
    const session = setSession(user);
    return { ok: true, session };
  }

  function register({ name, email, password, role }) {
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, msg: 'An account with this email already exists.' };
    }
    const newUser = {
      id:       Date.now(),
      name:     name.trim(),
      email:    email.toLowerCase().trim(),
      password: hashPwd(password),
      role:     role || 'Viewer',
      avatar:   name.trim().split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
      active:   true
    };
    users.push(newUser);
    saveUsers(users);
    return { ok: true };
  }

  function resetPassword(email, newPassword) {
    const users = getUsers();
    const idx   = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) return { ok: false, msg: 'No account found with this email.' };
    users[idx].password = hashPwd(newPassword);
    saveUsers(users);
    return { ok: true };
  }

  function logout() {
    clearSession();
    window.location.href = 'login.html';
  }

  // Guard — call on every protected page
  function guard() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return null;
    }
    return currentUser();
  }

  // Seed default users if not already stored
  function init() {
    if (!localStorage.getItem(USERS_KEY)) {
      saveUsers([...DEFAULT_USERS]);
    }
  }

  init();
  return { login, register, resetPassword, logout, guard, isLoggedIn, currentUser, hashPwd, getUsers, saveUsers };
})();
