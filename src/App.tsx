import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { RequireAdmin, RequireAuth } from "./auth/guards";
import LandingPage from "./pages/LandingPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import AcceptInvitePage from "./pages/auth/AcceptInvitePage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import UpdatePasswordPage from "./pages/auth/UpdatePasswordPage";
import ProfilePage from "./pages/account/ProfilePage";
import KbListPage from "./pages/kb/KbListPage";
import KbArticlePage from "./pages/kb/KbArticlePage";
import NewRequestPage from "./pages/requests/NewRequestPage";
import MyRequestsPage from "./pages/requests/MyRequestsPage";
import RequestDetailPage from "./pages/requests/RequestDetailPage";
import BoardPage from "./pages/board/BoardPage";
import BoardPostPage from "./pages/board/BoardPostPage";
import AdminQueuePage from "./pages/admin/AdminQueuePage";
import AdminRequestPage from "./pages/admin/AdminRequestPage";
import AdminInvitesPage from "./pages/admin/AdminInvitesPage";
import AdminLicencesPage from "./pages/admin/AdminLicencesPage";
import AdminUserLicencesPage from "./pages/admin/AdminUserLicencesPage";
import TelemetryPage from "./pages/admin/TelemetryPage";
import LearnScriptsPage from "./pages/learn-lines/LearnScriptsPage";
import LearnPracticePage from "./pages/learn-lines/LearnPracticePage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/kb" element={<KbListPage />} />
          <Route path="/kb/:slug" element={<KbArticlePage />} />
          <Route path="/requests" element={<MyRequestsPage />} />
          <Route path="/requests/new" element={<NewRequestPage />} />
          <Route path="/requests/:id" element={<RequestDetailPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/board/:id" element={<BoardPostPage />} />
          <Route path="/learn-lines" element={<LearnScriptsPage />} />
          <Route path="/learn-lines/:scriptId" element={<LearnPracticePage />} />

          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminQueuePage />} />
            <Route path="/admin/requests/:id" element={<AdminRequestPage />} />
            <Route path="/admin/invites" element={<AdminInvitesPage />} />
            <Route path="/admin/licences" element={<AdminLicencesPage />} />
            <Route path="/admin/licences/:userId" element={<AdminUserLicencesPage />} />
            <Route path="/admin/telemetry" element={<TelemetryPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
