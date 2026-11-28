
import { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import RequireAdmin from './components/Auth/RequireAdmin';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
import { AudioProvider } from './components/UI/AudioPlayer';
import { VerificationProvider } from './contexts/VerificationContext';
import { ProfileColorProvider } from './contexts/ProfileColorContext';
import { FrontendExperienceProvider } from './contexts/FrontendExperienceContext';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout/Layout';
// HomePage stays eager — it's the landing route, lazy-loading it would just
// add a network round-trip + flash of spinner for the most common path.
import HomePage from './pages/HomePage';

// Everything else is route-level code-split. The previous bundle pulled in
// every page (including the admin panel and BBCode tester) on first load,
// which made the initial JS payload much bigger than it needed to be —
// especially painful for users on slow connections (and Russia, where any
// extra round-trip already hurts).
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const PasswordResetPage = lazy(() => import('./pages/PasswordResetPage'));
const ProfileRedirect = lazy(() => import('./pages/ProfileRedirect'));
const UserPage = lazy(() => import('./pages/UserPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const RankingsPage = lazy(() => import('./pages/RankingsPage'));
const MatchmakingRankingsPage = lazy(() => import('./pages/MatchmakingRankingsPage'));
const TopPlaysPage = lazy(() => import('./pages/TopPlaysPage'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));
const TeamDetailPage = lazy(() => import('./pages/TeamDetailPage'));
const CreateTeamPage = lazy(() => import('./pages/CreateTeamPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage'));
const HowToJoinPage = lazy(() => import('./pages/HowToJoinPage'));
const BeatmapPage = lazy(() => import('./pages/BeatmapPage'));
const BeatmapsPage = lazy(() => import('./pages/BeatmapsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const WikiHubPage = lazy(() => import('./pages/wiki/WikiHubPage'));
const WikiRulesPage = lazy(() => import('./pages/wiki/WikiRulesPage'));
const WikiScoringPage = lazy(() => import('./pages/wiki/WikiScoringPage'));
const WikiToriiHaloPage = lazy(() => import('./pages/wiki/WikiToriiHaloPage'));
const WikiRestrictionsPage = lazy(() => import('./pages/wiki/WikiRestrictionsPage'));
const WikiFaqPage = lazy(() => import('./pages/wiki/WikiFaqPage'));
const WikiFeaturesPage = lazy(() => import('./pages/wiki/WikiFeaturesPage'));
const WikiEconomyPage = lazy(() => import('./pages/wiki/WikiEconomyPage'));
const ScorePage = lazy(() => import('./pages/ScorePage'));
const BBCodeTester = lazy(() => import('./components/BBCode/BBCodeTester'));
const AdminPanel = lazy(() => import('./pages/Admin/AdminPanel'));
const AdminBeatmap = lazy(() => import('./pages/Admin/AdminBeatmap'));
const AdminBeatmapRankstatus = lazy(() => import('./pages/Admin/AdminBeatmapRankstatus'));

function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4 py-12">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-card p-8 text-center shadow-elev-2">
        <p className="text-4xl font-heading font-bold text-torii">404</p>
        <h1 className="mt-2 text-xl font-heading font-bold text-text-primary">{t('app.notFound')}</h1>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex min-h-[40px] items-center rounded-xl bg-torii px-4 py-2 text-sm font-semibold text-white hover:bg-torii-hover transition-colors"
          >
            {t('nav.home', { defaultValue: 'Home' })}
          </Link>
          <Link
            to="/beatmaps"
            className="inline-flex min-h-[40px] items-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-text-primary hover:bg-white/10 transition-colors"
          >
            {t('nav.beatmaps', { defaultValue: 'Beatmaps' })}
          </Link>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ProfileColorProvider>
        <VerificationProvider>
          <AudioProvider>
            <Router>
              <FrontendExperienceProvider>
                <ScrollToTop />
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />
                    <Route path="password-reset" element={<PasswordResetPage />} />
                    <Route path="home/password-reset" element={<PasswordResetPage />} />
                    <Route path="profile" element={<ProfileRedirect />} />
                    <Route path="users/:userId" element={<UserPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="rankings" element={<RankingsPage />} />
                    <Route path="rankings/matchmaking" element={<MatchmakingRankingsPage />} />
                    <Route path="rankings/top-plays" element={<TopPlaysPage />} />
                    <Route path="teams" element={<TeamsPage />} />
                    <Route path="teams/create" element={<CreateTeamPage />} />
                    <Route path="teams/:teamId" element={<TeamDetailPage />} />
                    <Route path="teams/:teamId/edit" element={<CreateTeamPage />} />
                    <Route path="messages" element={<MessagesPage />} />
                    <Route path="friends" element={<FriendsPage />} />
                    <Route path="how-to-join" element={<HowToJoinPage />} />
                    <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="wiki" element={<WikiHubPage />} />
                    <Route path="wiki/rules" element={<WikiRulesPage />} />
                    <Route path="wiki/scoring" element={<WikiScoringPage />} />
                    <Route path="wiki/toriihalo" element={<WikiToriiHaloPage />} />
                    <Route path="wiki/restrictions" element={<WikiRestrictionsPage />} />
                    <Route path="wiki/faq" element={<WikiFaqPage />} />
                    <Route path="wiki/features" element={<WikiFeaturesPage />} />
                    <Route path="wiki/economy" element={<WikiEconomyPage />} />
                    <Route path="beatmaps/:beatmapId" element={<BeatmapPage />} />
                    <Route path="beatmapsets/:beatmapsetId" element={<BeatmapPage />} />
                    <Route path="beatmaps" element={<BeatmapsPage />} />
                    <Route path="scores/:scoreId" element={<ScorePage />} />
                    <Route path="frontend-choice" element={<Navigate to="/" replace />} />
                    <Route path="bbcode-test" element={<BBCodeTester />} />
                    <Route path="admin" element={<RequireAdmin><AdminPanel /></RequireAdmin>} />
                    <Route
                      path="admin/beatmaps"
                      element={<RequireAdmin><AdminBeatmap /></RequireAdmin>}
                    />
                    <Route
                      path="admin/beatmaps/:id"
                      element={<RequireAdmin><AdminBeatmapRankstatus /></RequireAdmin>}
                    />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </FrontendExperienceProvider>
            </Router>
          </AudioProvider>
        </VerificationProvider>
      </ProfileColorProvider>
    </AuthProvider>
  );
}

export default App;
