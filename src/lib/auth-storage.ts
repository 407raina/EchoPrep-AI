const STORAGE_KEY = "career-echo-auth";

type StoredUser = {
  id: string;
  email: string;
};

export type StoredAuth = {
  token: string;
  user: StoredUser;
};

export const getStoredAuth = (): StoredAuth | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.token || !parsed?.user?.id) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Failed to read auth state", error);
    return null;
  }
};

export const persistAuth = (auth: StoredAuth) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
};

export const clearStoredAuth = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getStoredToken = () => getStoredAuth()?.token ?? null;
