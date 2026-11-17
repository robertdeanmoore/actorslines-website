import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { uiGalleryAllowed } from "../../lib/theme";

const UiGalleryPage = lazy(() => import("./UiGalleryPage"));

/**
 * /_ui-gallery is a dev/preview tool with placeholder copy. On production hosts it redirects home
 * and the gallery code (a separate chunk) is never downloaded. Previews and dev builds still show it.
 */
export default function UiGalleryRoute() {
  if (!uiGalleryAllowed(window.location.hostname, import.meta.env.DEV)) return <Navigate to="/" replace />;
  return (
    <Suspense fallback={null}>
      <UiGalleryPage />
    </Suspense>
  );
}
