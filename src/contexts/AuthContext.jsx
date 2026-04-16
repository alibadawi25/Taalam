import { useEffect, useMemo, useState } from "react";
import {
  cacheProfile,
  ensureProfileForUser,
  getCurrentSession,
  readCachedProfile,
  signOutCurrentUser,
} from "../authService";
import { AuthContext } from "./authContext";
import { syncLocalLessonProgressToDatabase } from "../lessonProgressService";
import { supabase } from "../supabaseClient";
import { syncLocalFavoriteCoursesToDatabase } from "../utils/favoriteCourses";

function buildFallbackProfile(user, cachedProfile) {
  if (cachedProfile?.id) {
    return cachedProfile;
  }

  if (!user?.id) {
    return null;
  }

  const metadata = user.user_metadata || {};

  return {
    id: user.id,
    email: user.email ?? null,
    full_name: metadata.full_name || metadata.name || null,
    avatar_url: metadata.avatar_url || null,
    created_at: null,
    updated_at: null,
  };
}

function getDisplayName(user, profile) {
  const emailName = user?.email?.split("@")?.[0];
  return (
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    emailName ||
    "حسابك"
  );
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAuthState(nextSession) {
      if (isMounted) {
        setSession(nextSession);
      }

      if (!nextSession?.user) {
        if (isMounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        const cachedProfile = readCachedProfile(nextSession.user.id);
        setProfile(buildFallbackProfile(nextSession.user, cachedProfile));
        setLoading(false);
      }

      void (async () => {
        try {
          const nextProfile = await ensureProfileForUser(nextSession.user);
          if (nextProfile) {
            cacheProfile(nextProfile);
          }

          if (isMounted) {
            setProfile((current) => nextProfile || current);
          }
        } catch (error) {
          console.warn("Failed to hydrate user profile after auth", error);
        }
      })();

      void Promise.allSettled([
        syncLocalLessonProgressToDatabase(),
        syncLocalFavoriteCoursesToDatabase(),
      ]);
    }

    async function bootstrap() {
      try {
        const currentSession = await getCurrentSession();
        await loadAuthState(currentSession);
      } catch (error) {
        console.error("Failed to restore auth session", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadAuthState(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAuthenticated: Boolean(session?.user),
      displayName: getDisplayName(session?.user, profile),
      signOut: signOutCurrentUser,
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
