"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface SessionData {
  user: SessionUser;
}

// Global session state management
let globalSession: SessionData | null = null;
let globalIsPending = true;
let globalFetchPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSessionSnapshot(): { data: SessionData | null; isPending: boolean } {
  return { data: globalSession, isPending: globalIsPending };
}

async function fetchSession() {
  if (globalFetchPromise) return globalFetchPromise;

  globalFetchPromise = (async () => {
    try {
      globalIsPending = true;
      notifyListeners();

      const res = await fetch("/api/auth/session", {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        globalSession = data.user ? { user: data.user } : null;
      } else {
        globalSession = null;
      }
    } catch {
      globalSession = null;
    } finally {
      globalIsPending = false;
      globalFetchPromise = null;
      notifyListeners();
    }
  })();

  return globalFetchPromise;
}

// Initialize fetch on module load
if (typeof window !== "undefined") {
  fetchSession();
}

export function useSession() {
  const [snapshot, setSnapshot] = useState(getSessionSnapshot);

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = subscribe(() => {
      setSnapshot(getSessionSnapshot());
    });

    // Trigger fetch if not yet loaded
    if (globalIsPending && !globalFetchPromise) {
      fetchSession();
    }

    return () => { unsubscribe(); };
  }, []);

  return { data: snapshot.data, isPending: snapshot.isPending };
}

export async function signIn(email: string, password: string) {
  const res = await fetch("/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Sign in failed");
  }

  // Update global session
  globalSession = { user: data.user };
  globalIsPending = false;
  notifyListeners();

  return data;
}

export async function signUp(name: string, email: string, password: string) {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Sign up failed");
  }

  // Update global session
  globalSession = { user: data.user };
  globalIsPending = false;
  notifyListeners();

  return data;
}

export async function signOut() {
  try {
    await fetch("/api/auth/signout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore errors
  }

  globalSession = null;
  globalIsPending = false;
  notifyListeners();
}

// Re-export for backwards compatibility
export const authClient = {
  useSession,
  signIn: {
    email: async (
      data: { email: string; password: string },
      callbacks?: {
        onSuccess?: () => void;
        onError?: (ctx: { error: { message: string; status?: number } }) => void;
      }
    ) => {
      try {
        await signIn(data.email, data.password);
        callbacks?.onSuccess?.();
      } catch (error: any) {
        callbacks?.onError?.({
          error: { message: error.message, status: error.status },
        });
      }
    },
  },
  signUp: {
    email: async (
      data: { email: string; password: string; name: string },
      callbacks?: {
        onSuccess?: () => void;
        onError?: (ctx: { error: { message: string; status?: number } }) => void;
      }
    ) => {
      try {
        await signUp(data.name, data.email, data.password);
        callbacks?.onSuccess?.();
      } catch (error: any) {
        callbacks?.onError?.({
          error: { message: error.message, status: error.status },
        });
      }
    },
  },
  signOut,
  sendVerificationEmail: async (
    _data: { email: string; callbackURL: string },
    callbacks?: {
      onSuccess?: () => void;
      onError?: (ctx: { error: { message: string } }) => void;
    }
  ) => {
    // Stub - email verification not implemented yet
    callbacks?.onError?.({
      error: { message: "Email verification is not available yet" },
    });
  },
};

// Named exports for backward compatibility
export const {
  sendVerificationEmail,
} = authClient;

export async function requestPasswordReset(_data: { email: string; redirectTo: string }) {
  return {
    data: null,
    error: { message: "Password reset is not available yet" },
  };
}

export async function resetPassword(_data: { newPassword: string; token: string }) {
  return {
    data: null,
    error: { message: "Password reset is not available yet" },
  };
}
