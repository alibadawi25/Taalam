import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const CoursePage = lazy(() => import("./pages/CoursePage"));
const LessonPage = lazy(() => import("./pages/LessonPage"));

function LoadingFallback() {
  return (
    <main className="route-loading" dir="rtl" aria-live="polite" aria-busy="true">
      <div className="route-loading-card">
        <div className="route-loading-skeleton route-loading-skeleton--title" />
        <div className="route-loading-skeleton route-loading-skeleton--line" />
        <div className="route-loading-skeleton route-loading-skeleton--line route-loading-skeleton--line-short" />
      </div>
      <p className="route-loading-text">جاري التحميل...</p>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <LandingPage />
          </Suspense>
        }
      />
      <Route
        path="/home"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <HomePage />
          </Suspense>
        }
      />
      <Route
        path="/course/:courseId"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <CoursePage />
          </Suspense>
        }
      />
      <Route
        path="/course/:courseId/lesson/:lessonId"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <LessonPage />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

export default App;
