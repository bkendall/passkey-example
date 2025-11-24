const { startRegistration, startAuthentication } = SimpleWebAuthnBrowser;

const statusMessage = document.getElementById('status-message');
const authSection = document.getElementById('auth-section');
const loggedInSection = document.getElementById('logged-in-section');
const userDisplay = document.getElementById('user-display');

function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  statusMessage.classList.remove('hidden');
  setTimeout(() => {
    statusMessage.classList.add('hidden');
  }, 5000);
}

function updateUI(isLoggedIn, username) {
  if (isLoggedIn) {
    authSection.classList.add('hidden');
    loggedInSection.classList.remove('hidden');
    userDisplay.textContent = username;
  } else {
    authSection.classList.remove('hidden');
    loggedInSection.classList.add('hidden');
    userDisplay.textContent = '';
  }
}

async function checkLoginStatus() {
  try {
    const res = await fetch('/me');
    const data = await res.json();
    updateUI(data.loggedIn, data.username);
  } catch (err) {
    console.error('Error checking login status:', err);
  }
}

// Registration
document.getElementById('btn-register').addEventListener('click', async () => {
  const username = document.getElementById('register-username').value;
  if (!username) {
    showStatus('Please enter a username', 'error');
    return;
  }

  try {
    // 1. Get options from server
    const resp = await fetch('/register/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Failed to get registration options');
    }

    const options = await resp.json();

    // 2. Pass options to browser authenticator
    const attResp = await startRegistration(options);

    // 3. Send response to server
    const verificationResp = await fetch('/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        response: attResp,
      }),
    });

    const verificationJSON = await verificationResp.json();

    if (verificationJSON.verified) {
      showStatus('Registration successful! You can now log in.', 'success');
    } else {
      showStatus(
        `Registration failed: ${JSON.stringify(verificationJSON)}`,
        'error'
      );
    }
  } catch (error) {
    console.error(error);
    showStatus(error.message, 'error');
  }
});

// Login
document.getElementById('btn-login').addEventListener('click', async () => {
  const username = document.getElementById('login-username').value;
  if (!username) {
    showStatus('Please enter a username', 'error');
    return;
  }

  try {
    // 1. Get options from server
    const resp = await fetch('/login/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Failed to get login options');
    }

    const options = await resp.json();

    // 2. Pass options to browser authenticator
    const asseResp = await startAuthentication(options);

    // 3. Send response to server
    const verificationResp = await fetch('/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        response: asseResp,
      }),
    });

    const verificationJSON = await verificationResp.json();

    if (verificationJSON.verified) {
      showStatus('Login successful!', 'success');
      checkLoginStatus();
    } else {
      showStatus(`Login failed: ${JSON.stringify(verificationJSON)}`, 'error');
    }
  } catch (error) {
    console.error(error);
    showStatus(error.message, 'error');
  }
});

// Logout
document.getElementById('btn-logout').addEventListener('click', async () => {
  await fetch('/logout', { method: 'POST' });
  checkLoginStatus();
  showStatus('Logged out', 'info');
});

// Initial check
checkLoginStatus();
