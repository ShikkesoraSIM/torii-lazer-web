
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RequireAdmin from './components/Auth/RequireAdmin';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
import { AudioProvider } from './components/UI/AudioPlayer';
import { VerificationProvider } from './contexts/VerificationContext';
import { ProfileColorProvider } from './contexts/ProfileColorContext';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/UI/LoadingSpinner';
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

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" />
    </div>
  );
}

function App() {
  const { t } = useTranslation();

  return (
    <AuthProvider>
      <ProfileColorProvider>
        <VerificationProvider>
          <AudioProvider>
            <Router>
              <ScrollToTop />
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />
                    <Route path="password-reset" element={<PasswordResetPage />} />
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
                    <Route path="bbcode-test" element={<BBCodeTester />} />
                    <Route path="admin" element={<AdminPanel />} />
                    {/* Las dos de beatmaps colgaban sueltas sin ningun control:
                        cualquiera deslogueado abria el panel de moderacion. */}
                    <Route
                      path="admin/beatmaps"
                      element={<RequireAdmin><AdminBeatmap /></RequireAdmin>}
                    />
                    <Route
                      path="admin/beatmaps/:id"
                      element={<RequireAdmin><AdminBeatmapRankstatus /></RequireAdmin>}
                    />
                    <Route
                      path="*"
                      element={
                        <div className="flex items-center justify-center h-screen">
                          <h1 className="text-2xl font-bold">{t('app.notFound')}</h1>
                        </div>
                      }
                    />
                  </Route>
                </Routes>
              </Suspense>
            </Router>
          </AudioProvider>
        </VerificationProvider>
      </ProfileColorProvider>
    </AuthProvider>
  );
}

export default App;
