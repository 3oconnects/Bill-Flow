// js/pages/auth.js

function showLogin() {
  document.getElementById('auth-root').innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">Bill<span>Flow</span> Pro</div>
          <div class="auth-tagline">Smart Billing for Modern Businesses</div>
        </div>
        <div class="auth-body">
          <h2 class="auth-title">Welcome back</h2>
          <p class="auth-sub">Sign in to your billing workspace</p>
          <div class="auth-err" id="login-err"></div>
          <div class="form-group">
            <label class="form-label req">Email Address</label>
            <input class="form-input" id="l-email" type="email" placeholder="you@company.com" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label req">Password</label>
            <input class="form-input" id="l-pass" type="password" placeholder="••••••••" autocomplete="current-password">
          </div>
          <button class="btn btn-primary" style="width:100%;justify-content:center;padding:10px" id="login-btn" onclick="doLogin()">
            Sign In
          </button>
        </div>
        <div class="auth-footer">
          New to BillFlow? <a onclick="showRegister()">Create a free account →</a>
        </div>
      </div>
    </div>`;
  document.getElementById('l-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('l-email').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('l-pass').focus(); });
}

function showRegister() {
  document.getElementById('auth-root').innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">Bill<span>Flow</span> Pro</div>
          <div class="auth-tagline">Start your billing journey</div>
        </div>
        <div class="auth-body">
          <h2 class="auth-title">Create your workspace</h2>
          <p class="auth-sub">Set up your business billing in minutes</p>
          <div class="auth-err" id="reg-err"></div>
          <div class="form-group">
            <label class="form-label req">Business / Organization Name</label>
            <input class="form-input" id="r-org" placeholder="Acme Technologies Pvt Ltd">
          </div>
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="form-label req">Your Name</label>
              <input class="form-input" id="r-name" placeholder="Full name">
            </div>
            <div class="form-group">
              <label class="form-label req">Email Address</label>
              <input class="form-input" id="r-email" type="email" placeholder="you@company.com">
            </div>
          </div>
          <div class="form-row cols-2">
            <div class="form-group">
              <label class="form-label req">Password</label>
              <input class="form-input" id="r-pass" type="password" placeholder="Min 8 characters">
            </div>
            <div class="form-group">
              <label class="form-label req">Confirm Password</label>
              <input class="form-input" id="r-pass2" type="password" placeholder="Repeat password">
            </div>
          </div>
          <button class="btn btn-primary" style="width:100%;justify-content:center;padding:10px" id="reg-btn" onclick="doRegister()">
            Create Account & Continue →
          </button>
        </div>
        <div class="auth-footer">
          Already have an account? <a onclick="showLogin()">Sign in</a>
        </div>
      </div>
    </div>`;
}

async function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const pass  = document.getElementById('l-pass').value;
  const errEl = document.getElementById('login-err');
  const btn   = document.getElementById('login-btn');
  errEl.classList.remove('show');
  if (!email || !pass) { errEl.textContent = 'Please enter email and password'; errEl.classList.add('show'); return; }
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Signing in…`;
  try {
    const { user, orgId } = await API.login(email, pass);
    APP.setUser(user, orgId);
    APP.init();
  } catch(e) {
    errEl.textContent = e.message || 'Sign in failed';
    errEl.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function doRegister() {
  const orgName = document.getElementById('r-org').value.trim();
  const name    = document.getElementById('r-name').value.trim();
  const email   = document.getElementById('r-email').value.trim();
  const pass    = document.getElementById('r-pass').value;
  const pass2   = document.getElementById('r-pass2').value;
  const errEl   = document.getElementById('reg-err');
  const btn     = document.getElementById('reg-btn');
  errEl.classList.remove('show');
  if (!orgName || !name || !email || !pass) { errEl.textContent = 'All fields are required'; errEl.classList.add('show'); return; }
  if (pass !== pass2) { errEl.textContent = 'Passwords do not match'; errEl.classList.add('show'); return; }
  if (pass.length < 8) { errEl.textContent = 'Password must be at least 8 characters'; errEl.classList.add('show'); return; }
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Creating workspace…`;
  try {
    const { user, orgId } = await API.register(orgName, name, email, pass);
    APP.setUser(user, orgId);
    APP.init();
  } catch(e) {
    errEl.textContent = e.message || 'Registration failed';
    errEl.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Create Account & Continue →';
  }
}

async function doLogout() {
  try { await API.logout(); } catch {}
  APP.currentUser = null;
  document.getElementById('app-root').style.display = 'none';
  document.getElementById('auth-root').style.display = 'block';
  showLogin();
}
