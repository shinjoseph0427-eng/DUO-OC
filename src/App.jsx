import { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav.jsx';
import Toast from './components/Toast.jsx';
import HomePage from './pages/HomePage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import OnboardingFlow from './pages/OnboardingFlow.jsx';
import AuthPage from './pages/AuthPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import MePage from './pages/MePage.jsx';
import EditProfile from './pages/EditProfile.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import PublicDuoPage from './pages/PublicDuoPage.jsx';
import WeeklyCardPage from './pages/WeeklyCardPage.jsx';
import WeeklyExplorePage from './pages/WeeklyExplorePage.jsx';
import SoloExplorePage from './pages/SoloExplorePage.jsx';
import SoloInboxPage from './pages/SoloInboxPage.jsx';
import SoloChatPage from './pages/SoloChatPage.jsx';
import OnboardingGuide, { STEP_TABS } from './components/OnboardingGuide.jsx';
import { signOut } from './lib/auth.js';
import { getMyProfile, isProfileOnboardingComplete, saveFcmToken } from './lib/profile.js';
import { getConfirmedChatCount } from './lib/messages.js';
import { getNotifications } from './lib/notifications.js';
import { acceptInvite } from './lib/invites.js';
import { supabase } from './lib/supabaseClient.js';
import { requestPushPermission, watchTokenRefresh } from './lib/firebase.js';
import { useOnboardingGuide } from './hooks/useOnboardingGuide';

const PAGES = [
  'landing', 'auth', 'login', 'onboarding', 'home',
  'me', 'edit_profile',
  'privacy', 'public_duo',
  'weekly_card', 'weekly_explore',
  'solo_explore', 'solo_inbox', 'solo_chat',
];

const PUBLIC_PAGES  = ['landing', 'auth', 'login', 'privacy', 'public_duo'];

// Parse a shareable /duo/[uuid] deep link from the URL on first load.
function parsePublicDuoId() {
  if (typeof window === 'undefined') return null;
  const m = window.location.pathname.match(/^\/duo\/([0-9a-fA-F-]{36})\/?$/);
  return m ? m[1] : null;
}
const AUTH_PAGES    = ['landing', 'auth', 'login', 'onboarding'];
const NAV_TAB_PAGES = ['home', 'weekly_explore', 'weekly_card', 'solo_inbox', 'me'];
const ONBOARDED_PAGES = [
  'home',
  'me', 'edit_profile',
  'weekly_card', 'weekly_explore',
  'solo_explore', 'solo_inbox', 'solo_chat',
];

export default function App() {
  const initialPublicDuoId = parsePublicDuoId();
  const [publicDuoId]     = useState(initialPublicDuoId);
  const [page,            setPage]            = useState(initialPublicDuoId ? 'public_duo' : 'landing');
  const [pageStack,       setPageStack]       = useState([]);
  const [selectedChat,    setSelectedChat]    = useState(null);
  const [currentUser,     setCurrentUser]     = useState(null);
  const [selectedHangout, setSelectedHangout] = useState(null);
  const [toast,           setToast]           = useState(null);
  const [chatBadge,       setChatBadge]       = useState(false);
  const [authReady,       setAuthReady]       = useState(false);
  const [profileReady,    setProfileReady]    = useState(false);
  const [profile,         setProfile]         = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Post-signup onboarding guide (bottom sheet + tab pulse).
  const guide = useOnboardingGuide(onboardingComplete);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  // Capture invite token from URL on first load, then clean the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      sessionStorage.setItem('duo_oc_invite_token', token);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Auth init: read the session directly on mount so authReady is set even if
  // the INITIAL_SESSION event never fires / is delayed on a fresh first visit.
  // onAuthStateChange then keeps state in sync for later sign-in/out.
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        if (session?.user) setCurrentUser(session.user);
        setAuthReady(true); // session present or not — always unblock the app
      })
      .catch(() => { if (!cancelled) setAuthReady(true); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setCurrentUser(session?.user ?? null);
        setAuthReady(true);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setProfile(null);
        setProfileReady(true);
        setOnboardingComplete(false);
        setPageStack([]);
        setPage('landing');
        setAuthReady(true);
        window.scrollTo(0, 0);
      }
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser) {
      setProfileReady(true);
      return () => { cancelled = true; };
    }

    setProfileReady(false);
    getMyProfile(currentUser.id).then((nextProfile) => {
      if (cancelled) return;
      const complete = isProfileOnboardingComplete(nextProfile);
      setProfile(nextProfile);
      setOnboardingComplete(complete);
      setProfileReady(true);
      setPage((prev) => {
        if (!complete) return 'onboarding';
        return AUTH_PAGES.includes(prev) ? 'home' : prev;
      });
      if (complete) {
        getConfirmedChatCount(currentUser.id).then((n) => setChatBadge(n > 0)).catch(() => {});
        requestPushPermission()
          .then((token) => { if (token) saveFcmToken(currentUser.id, token); })
          .catch(() => {});
      }
    }).catch(() => {
      if (cancelled) return;
      setProfileReady(true);
      setOnboardingComplete(false);
      setPage('onboarding');
    });

    return () => { cancelled = true; };
  }, [currentUser]);

  // Keep the saved FCM token fresh (re-fetch + save when the tab regains focus).
  useEffect(() => {
    if (!currentUser?.id || !onboardingComplete) return undefined;
    return watchTokenRefresh(currentUser.id);
  }, [currentUser?.id, onboardingComplete]);

  // Surface onboarding step 3 once a homie request has been accepted. Forward-only
  // inside the hook, so it won't drag the guide backwards on later loads.
  useEffect(() => {
    if (!currentUser?.id || !onboardingComplete) return undefined;
    let cancelled = false;
    getNotifications(currentUser.id)
      .then((notifs) => {
        if (cancelled) return;
        if ((notifs ?? []).some((n) => n.type === 'homie_accepted')) {
          guide.jumpToStep(3);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser?.id, onboardingComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (newPage, duo = null, reqData = null, chat = null, hangout = null, opts = {}) => {
    // Unauthenticated user trying to access protected page
    if (!PUBLIC_PAGES.includes(newPage) && !currentUser) {
      setPage('landing');
      return;
    }
    if (currentUser && !onboardingComplete && ONBOARDED_PAGES.includes(newPage)) {
      setPage('onboarding');
      return;
    }
    // Already logged in trying to reach auth/login
    if (['auth', 'login'].includes(newPage) && currentUser) {
      setPage(onboardingComplete ? 'home' : 'onboarding');
      return;
    }
    if (!opts.noStack) setPageStack((prev) => [...prev, page]);
    if (chat)     setSelectedChat(chat);
    if (hangout)  setSelectedHangout(hangout);
    if (newPage === 'chat') setChatBadge(false);
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setPageStack((prev) => {
      if (prev.length === 0) {
        setPage(currentUser ? (onboardingComplete ? 'home' : 'onboarding') : 'landing');
        window.scrollTo(0, 0);
        return prev;
      }
      const prevPage = prev[prev.length - 1];
      setPage(prevPage);
      window.scrollTo(0, 0);
      return prev.slice(0, -1);
    });
  };

  const handleLogout = async () => {
    await signOut(); // triggers SIGNED_OUT in onAuthStateChange
  };

  const handleOnboardingComplete = async (nextProfileUpdates = {}) => {
    setProfile((prev) => ({ ...(prev ?? {}), ...nextProfileUpdates, onboarding_complete: true }));
    setPageStack([]);
    setOnboardingComplete(true);

    const pendingInvite = sessionStorage.getItem('duo_oc_invite_token');
    if (pendingInvite && currentUser) {
      sessionStorage.removeItem('duo_oc_invite_token');
      acceptInvite(pendingInvite, currentUser.id)
        .then(() => {
          setPage('home');
        })
        .catch(err => {
          console.error('Invite accept failed:', err);
          showToast('Invite link could not be used.', 'error');
          setPage('home');
        });
    } else {
      setPage('home');
    }
  };

  const fallback = (title, activePage = 'home') => (
    <PlaceholderPage go={go} title={title} activePage={activePage} onLogout={handleLogout} />
  );

  const isAuthPage = AUTH_PAGES.includes(page);
  const activeTab  = NAV_TAB_PAGES.includes(page) ? page : null;
  if (!authReady || (currentUser && !profileReady)) {
    return <div className="app-loading" />;
  }

  return (
    <div className="app-content" style={{ paddingBottom: !isAuthPage && currentUser ? 64 : 0 }}>
      <div key={page} className="page-enter">
        {page === 'landing'     && <LandingPage go={go} />}
        {page === 'auth'        && <AuthPage initialMode="signup" go={go} onLogin={setCurrentUser} showToast={showToast} />}
        {page === 'login'       && <AuthPage initialMode="login"  go={go} onLogin={setCurrentUser} showToast={showToast} />}
        {page === 'onboarding'  && <OnboardingFlow go={go} currentUser={currentUser} profile={profile} onComplete={handleOnboardingComplete} showToast={showToast} />}
        {page === 'home'        && <HomePage go={go} onLogout={handleLogout} currentUser={currentUser} profile={profile} showToast={showToast} />}
        {page === 'me'          && <MePage currentUser={currentUser} profile={profile} go={go} showToast={showToast} onLogout={handleLogout} />}
        {page === 'edit_profile'     && <EditProfile currentUser={currentUser} go={go} goBack={goBack} showToast={showToast} />}
        {page === 'privacy'          && <PrivacyPolicyPage go={go} goBack={goBack} />}
        {page === 'public_duo'       && <PublicDuoPage duoId={publicDuoId} go={go} />}
        {page === 'weekly_card'      && <WeeklyCardPage currentUser={currentUser} go={go} showToast={showToast} />}
        {page === 'weekly_explore'   && <WeeklyExplorePage currentUser={currentUser} go={go} showToast={showToast} />}
        {page === 'solo_explore'     && <SoloExplorePage currentUser={currentUser} profile={profile} go={go} showToast={showToast} />}
        {page === 'solo_inbox'       && <SoloInboxPage currentUser={currentUser} go={go} goBack={goBack} showToast={showToast} />}
        {page === 'solo_chat'        && (selectedChat
          ? <SoloChatPage match={selectedChat} currentUser={currentUser} go={go} goBack={goBack} showToast={showToast} />
          : fallback('Chat not found', 'home'))}
        {!PAGES.includes(page)      && <HomePage go={go} onLogout={handleLogout} currentUser={currentUser} profile={profile} showToast={showToast} />}
      </div>
      <Toast message={toast?.msg} type={toast?.type} visible={!!toast} />
      {!isAuthPage && currentUser && onboardingComplete && guide.isActive && (
        <OnboardingGuide
          currentStep={guide.currentStep}
          navigate={(p) => go(p, null, null, null, null, { noStack: true })}
          advanceStep={guide.advanceStep}
          skipAll={guide.skipAll}
        />
      )}
      {!isAuthPage && currentUser && (
        <BottomNav
          activePage={activeTab ?? page}
          onNavigate={(tab) => go(tab)}
          badges={{ chat: chatBadge }}
          pulseTab={guide.isActive ? STEP_TABS[guide.currentStep] : null}
        />
      )}
    </div>
  );
}
