import { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav.jsx';
import Toast from './components/Toast.jsx';
import HomePage from './pages/HomePage.jsx';
import DuoDetailPage from './pages/DuoDetailPage.jsx';
import ChatListPage from './pages/ChatListPage.jsx';
import ChatThreadPage from './pages/ChatThreadPage.jsx';
import DuoRoomPage from './pages/DuoRoomPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import OnboardingFlow from './pages/OnboardingFlow.jsx';
import AuthPage from './pages/AuthPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import MyDuosPage from './pages/MyDuosPage.jsx';
import MyDuoPage from './pages/MyDuoPage.jsx';
import FindHomie from './pages/FindHomie.jsx';
import HomieProfilePage from './pages/HomieProfilePage.jsx';
import HomieInboxPage from './pages/HomieInboxPage.jsx';
import ProposeHangout from './pages/ProposeHangout.jsx';
import HangoutsPage from './pages/HangoutsPage.jsx';
import CreatePlanPage from './pages/CreatePlanPage.jsx';
import CounterHangout from './pages/CounterHangout.jsx';
import EditProfile from './pages/EditProfile.jsx';
import EditDuoProfile from './pages/EditDuoProfile.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import FirstTimeGuide from './components/FirstTimeGuide.jsx';
import RequestModal from './components/RequestModal.jsx';
import { signOut } from './lib/auth.js';
import { getMyDuo, getMyDuos } from './lib/duos.js';
import { getMyProfile, isProfileOnboardingComplete, saveFcmToken } from './lib/profile.js';
import { getConfirmedChatCount } from './lib/messages.js';
import { acceptInvite } from './lib/invites.js';
import { supabase } from './lib/supabaseClient.js';
import { requestPushPermission } from './lib/firebase.js';
import { usePlanStatus } from './hooks/usePlanStatus';
import { useReviewPrompt } from './hooks/useReviewPrompt';

const PAGES = [
  'landing', 'auth', 'login', 'onboarding', 'home', 'explore',
  'duo_detail', 'hangouts', 'chat', 'chat_thread', 'duo_room',
  'me', 'my_duo', 'my_duos', 'find_homie', 'homie_profile', 'homie_inbox', 'propose_hangout', 'counter_hangout', 'edit_profile', 'edit_duo_profile',
  'create_plan', 'privacy',
];

const PUBLIC_PAGES  = ['landing', 'auth', 'login', 'privacy'];
const AUTH_PAGES    = ['landing', 'auth', 'login', 'onboarding'];
const NAV_TAB_PAGES = ['home', 'explore', 'hangouts', 'chat', 'me'];
const ONBOARDED_PAGES = [
  'home', 'explore', 'duo_detail', 'hangouts', 'chat',
  'chat_thread', 'duo_room', 'me', 'my_duo', 'my_duos', 'find_homie', 'homie_profile', 'homie_inbox', 'propose_hangout', 'counter_hangout',
  'edit_profile', 'edit_duo_profile', 'create_plan',
];

export default function App() {
  const [page,            setPage]            = useState('landing');
  const [pageStack,       setPageStack]       = useState([]);
  const [selectedDuo,     setSelectedDuo]     = useState(null);
  const [selectedChat,    setSelectedChat]    = useState(null);
  const [currentUser,     setCurrentUser]     = useState(null);
  const [myDuo,           setMyDuo]           = useState(null);
  const [myDuos,          setMyDuos]          = useState([]);
  const [selectedHangout, setSelectedHangout] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [toast,           setToast]           = useState(null);
  const [chatBadge,       setChatBadge]       = useState(false);
  const [authReady,       setAuthReady]       = useState(false);
  const [profileReady,    setProfileReady]    = useState(false);
  const [profile,         setProfile]         = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [showGuide,          setShowGuide]          = useState(false);

  // Auto-expire elapsed plans and fire post-hangout review prompts.
  usePlanStatus();
  useReviewPrompt();

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

  // Auth state — single source of truth via onAuthStateChange
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session?.user) {
          setCurrentUser(session.user);
          setProfileReady(false);
        }
        setAuthReady(true);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setMyDuo(null);
        setMyDuos([]);
        setProfile(null);
        setProfileReady(true);
        setOnboardingComplete(false);
        setPageStack([]);
        setPage('landing');
        setAuthReady(true);
        window.scrollTo(0, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser) {
      setProfileReady(true);
      return () => { cancelled = true; };
    }

    setProfileReady(false);
    Promise.all([
      getMyProfile(currentUser.id),
      getMyDuo(currentUser.id),
      getMyDuos(currentUser.id).catch(() => []),
    ]).then(([nextProfile, nextDuo, nextMyDuos]) => {
      if (cancelled) return;
      const complete = isProfileOnboardingComplete(nextProfile);
      setProfile(nextProfile);
      setMyDuo(nextDuo);
      setMyDuos(nextMyDuos ?? []);
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

  useEffect(() => {
    if (currentUser) {
      Promise.all([
        getMyDuo(currentUser.id),
        getMyDuos(currentUser.id).catch(() => []),
      ]).then(([nextDuo, nextMyDuos]) => {
        setMyDuo(nextDuo);
        setMyDuos(nextMyDuos ?? []);
        setOnboardingComplete(isProfileOnboardingComplete(profile));
      }).catch(() => {});
    }
  }, [currentUser, profile]);

  const go = (newPage, duo = null, reqData = null, chat = null, hangout = null) => {
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
    setPageStack((prev) => [...prev, page]);
    setSelectedDuo(duo);
    if (reqData)  setRequestData(reqData);
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

    const nextDuo = currentUser ? await refreshMyDuo() : null;
    const hasDuo = Boolean(nextDuo);
    setOnboardingComplete(true);

    const pendingInvite = sessionStorage.getItem('duo_oc_invite_token');
    if (pendingInvite && currentUser) {
      sessionStorage.removeItem('duo_oc_invite_token');
      acceptInvite(pendingInvite, currentUser.id)
        .then(async () => {
          const acceptedDuo = await refreshMyDuo();
          setPage('home');
          if (acceptedDuo) setShowGuide(true);
        })
        .catch(err => {
          console.error('Invite accept failed:', err);
          showToast('Invite link could not be used.', 'error');
          setPage('home');
        });
    } else {
      setPage(hasDuo ? 'me' : 'home');
      if (hasDuo) setShowGuide(true);
    }

    if (currentUser) getMyDuo(currentUser.id).then(setMyDuo).catch(() => {});
  };

  const refreshMyDuo = async () => {
    if (!currentUser) return null;
    const [nextDuo, nextMyDuos] = await Promise.all([
      getMyDuo(currentUser.id),
      getMyDuos(currentUser.id).catch(() => []),
    ]);
    setMyDuo(nextDuo);
    setMyDuos(nextMyDuos ?? []);
    setOnboardingComplete(isProfileOnboardingComplete(profile));
    return nextDuo;
  };

  const fallback = (title, activePage = 'home') => (
    <PlaceholderPage go={go} title={title} activePage={activePage} onLogout={handleLogout} />
  );

  const isAuthPage = AUTH_PAGES.includes(page);
  const activeTab  = NAV_TAB_PAGES.includes(page) ? page : null;
  const editDuoForRoute = page === 'edit_duo_profile' ? selectedDuo : null;
  const duoRoomDuo = selectedDuo
    ?? myDuos.find((duo) => (duo?.duo_members?.length ?? 0) >= 2)
    ?? myDuo;
  if (!authReady || (currentUser && !profileReady)) {
    return <div className="app-loading" />;
  }

  return (
    <div className="app-content" style={{ paddingBottom: !isAuthPage && currentUser ? 64 : 0 }}>
      <div key={page} className="page-enter">
        {page === 'landing'     && <LandingPage go={go} />}
        {page === 'auth'        && <AuthPage initialMode="signup" go={go} onLogin={setCurrentUser} showToast={showToast} />}
        {page === 'login'       && <AuthPage initialMode="login"  go={go} onLogin={setCurrentUser} showToast={showToast} />}
        {page === 'onboarding'  && <OnboardingFlow go={go} currentUser={currentUser} profile={profile} myDuo={myDuo} myDuos={myDuos} onComplete={handleOnboardingComplete} showToast={showToast} />}
        {page === 'home'        && <HomePage go={go} onLogout={handleLogout} currentUser={currentUser} profile={profile} myDuo={myDuo} myDuos={myDuos} onOpenPlanRequest={setSelectedRequestId} showToast={showToast} />}
        {page === 'explore'     && <ExplorePage currentUser={currentUser} go={go} showToast={showToast} />}
        {page === 'duo_detail'  && (selectedDuo
          ? <DuoDetailPage duo={selectedDuo} go={go} goBack={goBack} onLogout={handleLogout} currentUser={currentUser} myDuo={myDuo} myDuos={myDuos} showToast={showToast} />
          : fallback('Duo not found'))}
        {page === 'hangouts'    && <HangoutsPage currentUser={currentUser} myDuo={myDuo} myDuos={myDuos} go={go} onLogout={handleLogout} showToast={showToast} />}
        {page === 'create_plan' && <CreatePlanPage currentUser={currentUser} myDuo={myDuo} myDuos={myDuos} selectedDuo={selectedDuo} go={go} goBack={goBack} />}
        {page === 'propose_hangout' && <ProposeHangout currentUser={currentUser} duo={selectedDuo} myDuo={myDuo} go={go} goBack={goBack} showToast={showToast} />}
        {page === 'chat'        && <ChatListPage go={go} onLogout={handleLogout} currentUser={currentUser} />}
        {page === 'chat_thread' && (selectedChat
          ? <ChatThreadPage chat={selectedChat} go={go} goBack={goBack} currentUser={currentUser} myDuo={myDuo} />
          : fallback('Chat not found', 'chat'))}
        {page === 'duo_room'    && (duoRoomDuo
          ? <DuoRoomPage currentUser={currentUser} myDuo={duoRoomDuo} go={go} goBack={goBack} />
          : fallback('Duo not found', 'me'))}
        {page === 'me'          && <MyDuoPage currentUser={currentUser} profile={profile} myDuo={myDuo} myDuos={myDuos} go={go} goBack={goBack} refreshMyDuo={refreshMyDuo} showToast={showToast} onLogout={handleLogout} />}
        {page === 'my_duo'      && <MyDuoPage currentUser={currentUser} profile={profile} myDuo={myDuo} myDuos={myDuos} go={go} goBack={goBack} refreshMyDuo={refreshMyDuo} showToast={showToast} onLogout={handleLogout} />}
        {page === 'my_duos'     && <MyDuosPage currentUser={currentUser} myDuo={myDuo} go={go} />}
        {page === 'find_homie'      && <FindHomie currentUser={currentUser} go={go} goBack={goBack} />}
        {page === 'homie_profile'   && (selectedDuo
          ? <HomieProfilePage homie={selectedDuo} currentUser={currentUser} go={go} showToast={showToast} />
          : fallback('Homie not found'))}
        {page === 'homie_inbox'     && <HomieInboxPage currentUser={currentUser} go={go} goBack={goBack} onDuoChanged={refreshMyDuo} />}
        {page === 'counter_hangout' && <CounterHangout currentUser={currentUser} hangout={selectedHangout} go={go} goBack={goBack} />}
        {page === 'edit_profile'     && <EditProfile currentUser={currentUser} go={go} goBack={goBack} showToast={showToast} />}
        {page === 'edit_duo_profile' && <EditDuoProfile currentUser={currentUser} duo={editDuoForRoute} myDuo={myDuo} go={go} goBack={goBack} showToast={showToast} />}
        {page === 'privacy'          && <PrivacyPolicyPage go={go} goBack={goBack} />}
        {!PAGES.includes(page)      && <HomePage go={go} onLogout={handleLogout} currentUser={currentUser} profile={profile} myDuo={myDuo} myDuos={myDuos} onOpenPlanRequest={setSelectedRequestId} showToast={showToast} />}
      </div>
      <Toast message={toast?.msg} type={toast?.type} visible={!!toast} />
      {showGuide && (
        <FirstTimeGuide onDone={() => setShowGuide(false)} />
      )}
      {selectedRequestId && currentUser && (
        <RequestModal
          requestId={selectedRequestId}
          currentUserId={currentUser.id}
          showToast={showToast}
          go={go}
          onClose={() => setSelectedRequestId(null)}
        />
      )}
      {!isAuthPage && currentUser && (
        <BottomNav activePage={activeTab ?? page} onNavigate={(tab) => go(tab)} badges={{ chat: chatBadge }} />
      )}
    </div>
  );
}
