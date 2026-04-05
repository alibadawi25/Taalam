import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const LandingPage = lazy(() => import("./pages/LandingPage"));

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense
            fallback={<main style={{ padding: "2rem" }}>جاري التحميل...</main>}
          >
            <LandingPage />
          </Suspense>
        }
      />
      <Route
        path="/home"
        element={
          <Suspense
            fallback={<main style={{ padding: "2rem" }}>جاري التحميل...</main>}
          >
            <LandingPage />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

export default App;
