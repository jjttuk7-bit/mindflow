// Mindflow Chrome Extension - Popup Script

const CONFIG = {
  SUPABASE_URL: "https://goewynhlhlybtcsuaknk.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZXd5bmhsaGx5YnRjc3Vha25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTkzOTQsImV4cCI6MjA4NzczNTM5NH0.SDmCY88cEV6dI0ZlCYxhebpbkciaYzZKCXFDiz4Y-kY",
  API_BASE: "https://mindflow-five-eta.vercel.app",
};

// ── State ──
let session = null;

// ── DOM Elements ──
const loginScreen = document.getElementById("loginScreen");
const saveScreen = document.getElementById("saveScreen");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const btnSave = document.getElementById("btnSave");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const noteInput = document.getElementById("note");
const pageTitleEl = document.getElementById("pageTitle");
const pageUrlEl = document.getElementById("pageUrl");
const statusEl = document.getElementById("status");
const loginErrorEl = document.getElementById("loginError");
const userInfoEl = document.getElementById("userInfo");

// ── Supabase Auth (REST API) ──

async function supabaseSignIn(email, password) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CONFIG.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.msg || "Login failed");
  }

  return res.json();
}

async function supabaseRefreshToken(refreshToken) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CONFIG.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) return null;
  return res.json();
}

// ── Session Management ──

async function loadSession() {
  const stored = await chrome.storage.local.get(["session"]);
  if (!stored.session) return null;

  const s = stored.session;

  // Check if token is expired (with 60s buffer)
  if (s.expires_at && s.expires_at * 1000 < Date.now() + 60000) {
    // Try refresh
    const refreshed = await supabaseRefreshToken(s.refresh_token);
    if (refreshed) {
      await saveSession(refreshed);
      return refreshed;
    }
    // Refresh failed, clear session
    await clearSession();
    return null;
  }

  return s;
}

async function saveSession(s) {
  session = s;
  await chrome.storage.local.set({ session: s });
}

async function clearSession() {
  session = null;
  await chrome.storage.local.remove(["session"]);
}

// ── UI ──

function showLogin() {
  loginScreen.style.display = "block";
  saveScreen.style.display = "none";
  btnLogout.style.display = "none";
  loginErrorEl.style.display = "none";
  emailInput.value = "";
  passwordInput.value = "";
}

function showSave() {
  loginScreen.style.display = "none";
  saveScreen.style.display = "block";
  btnLogout.style.display = "inline-block";
  statusEl.className = "status";
  statusEl.style.display = "none";
  btnSave.disabled = false;

  if (session && session.user) {
    userInfoEl.textContent = session.user.email;
  }

  loadCurrentTab();
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

// ── Tab Info ──

async function loadCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      pageTitleEl.textContent = tab.title || "Untitled";
      pageUrlEl.textContent = tab.url || "";
      pageTitleEl.dataset.url = tab.url || "";
      pageTitleEl.dataset.title = tab.title || "";
    }
  } catch {
    pageTitleEl.textContent = "Unable to get page info";
  }
}

// ── Event Handlers ──

btnLogin.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    loginErrorEl.textContent = "Please enter email and password.";
    loginErrorEl.style.display = "block";
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = "Logging in...";
  loginErrorEl.style.display = "none";

  try {
    const data = await supabaseSignIn(email, password);
    await saveSession(data);
    showSave();
  } catch (err) {
    loginErrorEl.textContent = err.message;
    loginErrorEl.style.display = "block";
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Login";
  }
});

// Allow Enter key to submit login
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnLogin.click();
});

emailInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") passwordInput.focus();
});

btnLogout.addEventListener("click", async () => {
  await clearSession();
  showLogin();
});

btnSave.addEventListener("click", async () => {
  const url = pageTitleEl.dataset.url;
  const title = pageTitleEl.dataset.title;
  const note = noteInput.value.trim();

  if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
    showStatus("Cannot save browser internal pages.", "error");
    return;
  }

  btnSave.disabled = true;
  btnSave.textContent = "Saving...";
  showStatus("Saving to Mindflow...", "loading");

  try {
    // Ensure fresh token
    session = await loadSession();
    if (!session) {
      showLogin();
      return;
    }

    const res = await fetch(`${CONFIG.API_BASE}/api/extension/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ url, title, note: note || undefined }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        await clearSession();
        showLogin();
        return;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Save failed (${res.status})`);
    }

    const data = await res.json();
    showStatus(`Saved! "${data.title || title}"`, "success");
    btnSave.textContent = "Saved!";
    noteInput.value = "";

    // Auto-close after 2 seconds
    setTimeout(() => window.close(), 2000);
  } catch (err) {
    showStatus(err.message, "error");
    btnSave.textContent = "Save to Mindflow";
    btnSave.disabled = false;
  }
});

// ── Init ──

(async () => {
  session = await loadSession();
  if (session) {
    showSave();
  } else {
    showLogin();
  }
})();
