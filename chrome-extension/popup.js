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
const btnGoogle = document.getElementById("btnGoogle");
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

// ── Google OAuth via chrome.identity ──

async function signInWithGoogle() {
  // Get the extension's redirect URL
  const redirectUrl = chrome.identity.getRedirectURL();

  // Build Supabase OAuth URL
  const params = new URLSearchParams({
    provider: "google",
    redirect_to: redirectUrl,
  });
  const authUrl = `${CONFIG.SUPABASE_URL}/auth/v1/authorize?${params}`;

  // Launch the auth flow
  const responseUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (url) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(url);
        }
      }
    );
  });

  // Parse tokens from the redirect URL hash fragment
  // Supabase returns: #access_token=...&refresh_token=...&expires_in=...&token_type=bearer
  const hashStr = responseUrl.split("#")[1];
  if (!hashStr) throw new Error("No auth data in response");

  const hashParams = new URLSearchParams(hashStr);
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const expiresIn = parseInt(hashParams.get("expires_in") || "3600");

  if (!accessToken) throw new Error("No access token received");

  // Fetch user info from Supabase
  const userRes = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: CONFIG.SUPABASE_ANON_KEY,
    },
  });

  if (!userRes.ok) throw new Error("Failed to get user info");
  const user = await userRes.json();

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user,
  };
}

// ── Storage Abstraction (chrome.storage with localStorage fallback) ──

const storage = {
  async get(keys) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return chrome.storage.local.get(keys);
    }
    const result = {};
    for (const key of keys) {
      const val = localStorage.getItem(`mf_${key}`);
      if (val) result[key] = JSON.parse(val);
    }
    return result;
  },
  async set(obj) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return chrome.storage.local.set(obj);
    }
    for (const [key, val] of Object.entries(obj)) {
      localStorage.setItem(`mf_${key}`, JSON.stringify(val));
    }
  },
  async remove(keys) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return chrome.storage.local.remove(keys);
    }
    for (const key of keys) localStorage.removeItem(`mf_${key}`);
  },
};

// ── Session Management ──

async function loadSession() {
  const stored = await storage.get(["session"]);
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
  await storage.set({ session: s });
}

async function clearSession() {
  session = null;
  await storage.remove(["session"]);
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
    if (typeof chrome !== "undefined" && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        pageTitleEl.textContent = tab.title || "Untitled";
        pageUrlEl.textContent = tab.url || "";
        pageTitleEl.dataset.url = tab.url || "";
        pageTitleEl.dataset.title = tab.title || "";
        return;
      }
    }
    // Fallback for testing outside extension
    pageTitleEl.textContent = document.title || "Test Page";
    pageUrlEl.textContent = location.href;
    pageTitleEl.dataset.url = location.href;
    pageTitleEl.dataset.title = document.title || "Test Page";
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

// Google OAuth login
btnGoogle.addEventListener("click", async () => {
  if (typeof chrome === "undefined" || !chrome.identity) {
    loginErrorEl.textContent = "Google login is only available in the Chrome extension.";
    loginErrorEl.style.display = "block";
    return;
  }

  btnGoogle.disabled = true;
  btnGoogle.textContent = "Signing in...";
  loginErrorEl.style.display = "none";

  try {
    const data = await signInWithGoogle();
    await saveSession(data);
    showSave();
  } catch (err) {
    // User closed the popup = "The user did not approve access"
    if (err.message.includes("canceled") || err.message.includes("not approve")) {
      loginErrorEl.textContent = "Sign in was cancelled.";
    } else {
      loginErrorEl.textContent = err.message;
    }
    loginErrorEl.style.display = "block";
  } finally {
    btnGoogle.disabled = false;
    btnGoogle.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg> Sign in with Google`;
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
