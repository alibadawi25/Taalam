import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const HomePage = lazy(() => import("./pages/HomePage"));

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<main style={{ padding: "2rem" }}>جاري التحميل...</main>}>
            <HomePage />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

export default App;
