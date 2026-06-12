import { lazy, Suspense, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import BottomNav from './components/BottomNav.jsx';
import Toast from './components/Toast.jsx';
import IncomingRequestCard from './components/IncomingRequestCard.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import OnboardingGuide, { STEP_TABS } from './components/OnboardingGuide.jsx';
import { signOut } from './lib/auth.js';
import { getMyProfile, isProfileOnboardingComplete, saveFcmToken } from './lib/profile.js';
import { supabase } from './lib/supabaseClient.js';
import { requestPushPermission, watchTokenRefresh } from './lib/firebase.js';
import { getMyReceivedSoloRequests, acceptSoloRequest, declineSoloRequest } from './lib/solo.js';
import { getNotifications, subscribeNotifications } from './lib/notifications.js';
import { useOnboardingGuide } from './hooks/useOnboardingGuide';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const OnboardingFlow = lazy(() => import('./pages/OnboardingFlow.jsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const MePage = lazy(() => import('./pages/MePage.jsx'));
const EditProfile = lazy(() => import('./pages/EditProfile.jsx'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage.jsx'));
const WeeklyCardPage = lazy(() => import('./pages/WeeklyCardPage.jsx'));
const WeeklyExplorePage = lazy(() => import('./pages/WeeklyExplorePage.jsx'));
const SoloInboxPage = lazy(() => import('./pages/SoloInboxPage.jsx'));
const SoloChatPage = lazy(() => import('./pages/SoloChatPage.jsx'));

const PAGES = [
  'auth', 'login', 'onboarding', 'home',
  'me', 'edit_profile',
  'privacy',
  'weekly_card', 'weekly_explore',
  'solo_inbox', 'solo_chat',
];

// Pages a signed-out visitor may view. Home + Explore are open.
const PUBLIC_PAGES  = ['auth', 'login', 'privacy', 'home', 'weekly_explore'];

const AUTH_PAGES    = ['auth', 'login', 'onboarding'];
const NAV_TAB_PAGES = ['home', 'weekly_explore', 'weekly_card', 'solo_inbox', 'me'];
const ONBOARDED_PAGES = [
  'home',
  'me', 'edit_profile',
  'weekly_card', 'weekly_explore',
  'solo_inbox', 'solo_chat',
];

export default function App() {
  const [page,            setPage]            = useState('home');
  const [pageStack,       setPageStack]       = useState([]);
  const [selectedChat,    setSelectedChat]    = useState(null);
  const [currentUser,     setCurrentUser]     = useState(null);
  const [toast,           setToast]           = useState(null);
  const [authReady,       setAuthReady]       = useState(false);
  const [profileReady,    setProfileReady]    = useState(false);
  const [profile,         setProfile]         = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [inboxHasUnread, setInboxHasUnread] = useState(false);
  // Transient "X wants to hang out" card shown on incoming solo requests.
  const [incomingRequest, setIncomingRequest] = useState(null);

  // Post-signup onboarding guide (bottom sheet + tab pulse).
  const guide = useOnboardingGuide(onboardingComplete);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

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
        setPage('home');
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

  useEffect(() => {
    if (!currentUser?.id || !onboardingComplete) {
      setInboxHasUnread(false);
      return undefined;
    }

    let cancelled = false;
    const messageTypes = new Set([
      'solo_request',
      'solo_accepted',
      'plan_proposed',
      'plan_confirmed',
      'plan_guest_invited',
      'plan_guest_accepted',
      'plan_guest_declined',
    ]);

    const refreshInboxBadge = async () => {
      const [requests, notifications] = await Promise.all([
        getMyReceivedSoloRequests().catch(() => []),
        getNotifications(currentUser.id).catch(() => []),
      ]);
      if (cancelled) return;
      setInboxHasUnread(
        requests.length > 0 ||
        notifications.some((n) => !n.read && messageTypes.has(n.type)),
      );
    };

    refreshInboxBadge();
    const unsub = subscribeNotifications(currentUser.id, currentUser.id, (n) => {
      if (messageTypes.has(n.type)) setInboxHasUnread(true);
      // Pop the live request card the instant a new solo request lands.
      if (n.type === 'solo_request' && n.payload?.request_id) setIncomingRequest(n);
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [currentUser?.id, onboardingComplete]);

  useEffect(() => {
    if (page === 'solo_inbox') setInboxHasUnread(false);
  }, [page]);

  // Auto-dismiss the live request card after a few seconds.
  useEffect(() => {
    if (!incomingRequest) return undefined;
    const t = setTimeout(() => setIncomingRequest(null), 6000);
    return () => clearTimeout(t);
  }, [incomingRequest]);

  const handleAcceptIncoming = async () => {
    const reqId = incomingRequest?.payload?.request_id;
    setIncomingRequest(null);
    if (!reqId) return;
    try {
      await acceptSoloRequest(reqId);
      showToast('Request accepted! Say hi 👋', 'success');
      go('solo_inbox');
    } catch (e) {
      showToast(e?.message ?? 'Could not accept request', 'error');
    }
  };

  const handleDeclineIncoming = async () => {
    const reqId = incomingRequest?.payload?.request_id;
    setIncomingRequest(null);
    if (!reqId) return;
    try {
      await declineSoloRequest(reqId);
    } catch {
      /* best-effort — the request stays pending in the inbox */
    }
  };

  const handleViewIncoming = () => {
    setIncomingRequest(null);
    go('solo_inbox');
  };

  const go = (newPage, duo = null, reqData = null, chat = null, opts = {}) => {
    // Unauthenticated user triggering a protected action/page → send straight
    // to login (no modal). After signing in they land on home.
    if (!PUBLIC_PAGES.includes(newPage) && !currentUser) {
      setPage('login');
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
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setPageStack((prev) => {
      if (prev.length === 0) {
        setPage(currentUser ? (onboardingComplete ? 'home' : 'onboarding') : 'home');
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
    setPage('weekly_card'); // land new users straight on their first weekly card
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
    <div className="app-content" style={{ paddingBottom: !isAuthPage ? 64 : 0 }}>
      <Suspense fallback={<div className="app-loading" />}>
      <div key={page} className="page-enter">
        {page === 'auth'        && <AuthPage initialMode="signup" go={go} onLogin={setCurrentUser} showToast={showToast} />}
        {page === 'login'       && <AuthPage initialMode="login"  go={go} onLogin={setCurrentUser} showToast={showToast} />}
        {page === 'onboarding'  && <OnboardingFlow go={go} currentUser={currentUser} profile={profile} onComplete={handleOnboardingComplete} showToast={showToast} />}
        {page === 'home'        && <HomePage go={go} onLogout={handleLogout} currentUser={currentUser} profile={profile} showToast={showToast} />}
        {page === 'me'          && <MePage currentUser={currentUser} profile={profile} go={go} showToast={showToast} onLogout={handleLogout} />}
        {page === 'edit_profile'     && <EditProfile currentUser={currentUser} go={go} goBack={goBack} showToast={showToast} />}
        {page === 'privacy'          && <PrivacyPolicyPage go={go} goBack={goBack} />}
        {page === 'weekly_card'      && <WeeklyCardPage currentUser={currentUser} go={go} showToast={showToast} />}
        {page === 'weekly_explore'   && <WeeklyExplorePage currentUser={currentUser} go={go} showToast={showToast} />}
        {page === 'solo_inbox'       && <SoloInboxPage currentUser={currentUser} go={go} goBack={goBack} showToast={showToast} />}
        {page === 'solo_chat'        && (selectedChat
          ? <SoloChatPage match={selectedChat} currentUser={currentUser} go={go} goBack={goBack} showToast={showToast} />
          : fallback('Chat not found', 'home'))}
        {!PAGES.includes(page)      && <HomePage go={go} onLogout={handleLogout} currentUser={currentUser} profile={profile} showToast={showToast} />}
      </div>
      </Suspense>
      <Toast message={toast?.msg} type={toast?.type} visible={!!toast} />
      <AnimatePresence>
        {incomingRequest && currentUser && (
          <IncomingRequestCard
            key={incomingRequest.id ?? incomingRequest.payload?.request_id}
            notif={incomingRequest}
            onView={handleViewIncoming}
            onAccept={handleAcceptIncoming}
            onDecline={handleDeclineIncoming}
          />
        )}
      </AnimatePresence>
      {!isAuthPage && currentUser && onboardingComplete && guide.isActive && (
        <OnboardingGuide
          currentStep={guide.currentStep}
          navigate={(p) => go(p, null, null, null, { noStack: true })}
          advanceStep={guide.advanceStep}
          skipAll={guide.skipAll}
        />
      )}
      {/* Nav is shown to signed-out visitors too so Explore/Home stay reachable;
          protected tabs route to login via go(). */}
      {!isAuthPage && (
        <BottomNav
          activePage={activeTab ?? page}
          onNavigate={(tab) => go(tab)}
          badges={{ solo_inbox: inboxHasUnread }}
          pulseTab={guide.isActive ? STEP_TABS[guide.currentStep] : null}
        />
      )}
    </div>
  );
}
