import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import {
  fetchFavoriteCourseIdsForCurrentUser,
  isFavoriteCourse,
  readFavoriteCourseIds,
  saveFavoriteCourseIds,
  setFavoriteCourseStateForCurrentUser,
  syncLocalFavoriteCoursesToDatabase,
  toggleFavoriteCourseId,
} from "../utils/favoriteCourses";

export function useFavoriteCourses() {
  const { user } = useAuth();
  const [favoriteCourseIds, setFavoriteCourseIds] = useState(() => readFavoriteCourseIds());
  const favoriteCourseIdsRef = useRef(favoriteCourseIds);

  useEffect(() => {
    favoriteCourseIdsRef.current = favoriteCourseIds;
  }, [favoriteCourseIds]);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      const localFavorites = readFavoriteCourseIds();

      if (!user?.id) {
        if (!cancelled) {
          favoriteCourseIdsRef.current = localFavorites;
          setFavoriteCourseIds(localFavorites);
        }
        return;
      }

      await syncLocalFavoriteCoursesToDatabase(localFavorites);
      const remoteFavorites = await fetchFavoriteCourseIdsForCurrentUser();
      const nextFavorites = remoteFavorites ?? localFavorites;

      if (!cancelled) {
        favoriteCourseIdsRef.current = nextFavorites;
        setFavoriteCourseIds(nextFavorites);
        saveFavoriteCourseIds(nextFavorites);
      }
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const toggleFavoriteCourse = useCallback(
    async (courseId) => {
      const optimisticFavorites = toggleFavoriteCourseId(
        favoriteCourseIdsRef.current,
        courseId,
      );

      favoriteCourseIdsRef.current = optimisticFavorites;
      setFavoriteCourseIds(optimisticFavorites);
      saveFavoriteCourseIds(optimisticFavorites);

      if (!user?.id) {
        return;
      }

      const nextIsFavorite = optimisticFavorites.has(String(courseId));
      const remoteFavorites = await setFavoriteCourseStateForCurrentUser(
        courseId,
        nextIsFavorite,
      );

      if (remoteFavorites) {
        favoriteCourseIdsRef.current = remoteFavorites;
        setFavoriteCourseIds(remoteFavorites);
        saveFavoriteCourseIds(remoteFavorites);
      }
    },
    [user?.id],
  );

  return {
    favoriteCourseIds,
    isFavorite: (courseId) => isFavoriteCourse(favoriteCourseIds, courseId),
    toggleFavoriteCourse,
  };
}
