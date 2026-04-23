export const AUTH_STORAGE_KEY = "vrinda.currentUser";

export const getStoredAuth = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getAuthToken = () => getStoredAuth()?.token || "";

export const setAuthSession = ({ token, user }) => {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    token: token || "",
    name: user?.name || "",
    email: user?.email || "",
    role: user?.role || "user",
    signedInAt: Date.now()
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event("vrinda-auth-changed"));
};

export const clearAuthSession = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event("vrinda-auth-changed"));
};
