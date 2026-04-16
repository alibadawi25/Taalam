import { supabase } from "./supabaseClient";

const PROFILE_COLUMNS = "id, email, full_name, avatar_url, created_at, updated_at";
const PROFILE_CACHE_STORAGE_KEY = "taallam.profile_cache.v1";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readProfileCacheMap() {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeProfileCacheMap(cacheMap) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      PROFILE_CACHE_STORAGE_KEY,
      JSON.stringify(cacheMap || {}),
    );
  } catch {
    // Ignore storage quota/private mode errors.
  }
}

function normalizeCachedProfile(profile) {
  if (!profile || typeof profile !== "object") return null;

  const id = typeof profile.id === "string" ? profile.id : null;
  if (!id) return null;

  return {
    id,
    email: profile.email ?? null,
    full_name: profile.full_name ?? null,
    avatar_url: profile.avatar_url ?? null,
    created_at: profile.created_at ?? null,
    updated_at: profile.updated_at ?? null,
  };
}

export function readCachedProfile(userId) {
  if (!userId) return null;

  const cacheMap = readProfileCacheMap();
  return normalizeCachedProfile(cacheMap[userId]);
}

export function cacheProfile(profile) {
  const normalized = normalizeCachedProfile(profile);
  if (!normalized) return;

  const cacheMap = readProfileCacheMap();
  cacheMap[normalized.id] = normalized;
  writeProfileCacheMap(cacheMap);
}

function getEmailRedirectUrl() {
  const appUrl =
    import.meta.env.VITE_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (!appUrl) {
    return undefined;
  }

  return `${appUrl.replace(/\/+$/, "")}/auth`;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function fetchProfile(userId) {
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Unable to fetch profile from Supabase", error);
    return null;
  }

  if (data) {
    cacheProfile(data);
  }

  return data ?? null;
}

export async function ensureProfileForUser(user) {
  if (!user?.id) {
    return null;
  }

  const metadata = user.user_metadata || {};
  const payload = {
    id: user.id,
    email: user.email ?? null,
    full_name: metadata.full_name || metadata.name || null,
    avatar_url: metadata.avatar_url || null,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    console.warn("Unable to ensure user profile in Supabase", error);
    return null;
  }

  if (data) {
    cacheProfile(data);
  }

  return data;
}

export async function signInWithPassword({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (data) {
    cacheProfile(data);
  }

  return data;
}

export async function signUpWithPassword({ email, password, fullName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || null,
      },
      emailRedirectTo: getEmailRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getEmailRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProfile(userId, { fullName }) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const payload = {
    full_name: fullName ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function signOutCurrentUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
