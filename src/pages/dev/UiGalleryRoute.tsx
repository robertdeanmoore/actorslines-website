import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { isNightTheme } from "../../lib/theme";

const UiGalleryPage = lazy(() => import("./UiGalleryPage"));

/**
 * /_ui-gallery exists only while the night theme flag is on (previews, VITE_THEME=night). Everywhere
 * else, production included, it redirects home, and the gallery code is a separate chunk that is
 * never downloaded.
 */
export default function UiGalleryRoute() {
  if (!isNightTheme()) return <Navigate to="/" replace />;
  return (
    <Suspense fallback={null}>
      <UiGalleryPage />
    </Suspense>
  );
}
