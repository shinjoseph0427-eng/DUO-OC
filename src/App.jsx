import { useState, useEffect } from 'react';
import HomePage from './pages/HomePage.jsx';
import DuoDetailPage from './pages/DuoDetailPage.jsx';
import RequestTwoVTwo from './pages/RequestTwoVTwo.jsx';
import MatchScreen from './pages/MatchScreen.jsx';
import ChatListPage from './pages/ChatListPage.jsx';
import ChatThreadPage from './pages/ChatThreadPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import OnboardingFlow from './pages/OnboardingFlow.jsx';
import AuthPage from './pages/AuthPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import MePage from './pages/MePage.jsx';
import FindHomie from './pages/FindHomie.jsx';
import ProposeHangout from './pages/ProposeHangout.jsx';
import HangoutsPage from './pages/HangoutsPage.jsx';
import CounterHangout from './pages/CounterHangout.jsx';
import EditProfile from './pages/EditProfile.jsx';
import { getUser, signOut } from './lib/auth.js';
import { getMyDuo } from './lib/duos.js';

const PAGES = [
  'landing', 'auth', 'onboarding', 'home', 'explore',
  'duo_detail', 'request', 'match', 'hangouts', 'chat', 'chat_thread', 'me', 'find_homie', 'propose_hangout', 'counter_hangout', 'edit_profile',
];

const PUBLIC_PAGES = ['landing', 'auth'];

export default function App() {
  const [page, setPage]               = useState('landing');
  const [selectedDuo, setSelectedDuo] = useState(null);
  const [requestData, setRequestData] = useState({});
  const [selectedChat, setSelectedChat] = useState(null);
  const [currentUser,     setCurrentUser]     = useState(null);
  const [myDuo,           setMyDuo]           = useState(null);
  const [selectedHangout, setSelectedHangout] = useState(null);

  useEffect(() => {
    getUser().then(user => {
      if (user) {
        setCurrentUser(user);
        setPage('home');
      }
    });
  }, []);

  useEffect(() => {
    if (currentUser) {
      getMyDuo(currentUser.id).then(setMyDuo).catch(() => {});
    }
  }, [currentUser]);

  const go = (newPage, duo = null, reqData = null, chat = null, hangout = null) => {
    if (!PUBLIC_PAGES.includes(newPage) && !currentUser) {
      setPage('landing');
      return;
    }
    setSelectedDuo(duo);
    if (reqData)  setRequestData(reqData);
    if (hangout)  setSelectedHangout(hangout);
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    setPage('landing');
    window.scrollTo(0, 0);
  };

  const fallback = (title, activePage = 'home') => (
    <PlaceholderPage go={go} title={title} activePage={activePage} onLogout={handleLogout} />
  );

  return (
    <div key={page} className="page-enter">
      {page === 'landing'     && <LandingPage go={go} />}
      {page === 'auth'        && <AuthPage go={go} onLogin={setCurrentUser} />}
      {page === 'onboarding'  && <OnboardingFlow go={go} currentUser={currentUser} />}
      {page === 'home'        && <HomePage go={go} onLogout={handleLogout} currentUser={currentUser} />}
      {page === 'explore'     && fallback('Explore', 'explore')}
      {page === 'duo_detail'  && (selectedDuo ? <DuoDetailPage duo={selectedDuo} go={go} onLogout={handleLogout} /> : fallback('Duo not found'))}
      {page === 'request'     && (selectedDuo ? <RequestTwoVTwo duo={selectedDuo} go={go} /> : fallback('Duo not found'))}
      {page === 'match'       && (selectedDuo ? <MatchScreen duo={selectedDuo} requestData={requestData} go={go} /> : fallback('Match not found'))}
      {page === 'hangouts'      && <HangoutsPage currentUser={currentUser} go={go} onLogout={handleLogout} />}
      {page === 'propose_hangout' && <ProposeHangout currentUser={currentUser} duo={selectedDuo} myDuo={myDuo} go={go} />}
      {page === 'chat'        && <ChatListPage go={go} onLogout={handleLogout} />}
      {page === 'chat_thread' && (selectedChat ? <ChatThreadPage chat={selectedChat} go={go} /> : fallback('Chat not found', 'chat'))}
      {page === 'me'          && <MePage go={go} currentUser={currentUser} onLogout={handleLogout} />}
      {page === 'find_homie'      && <FindHomie currentUser={currentUser} go={go} />}
      {page === 'counter_hangout' && <CounterHangout currentUser={currentUser} hangout={selectedHangout} go={go} />}
      {page === 'edit_profile'    && <EditProfile currentUser={currentUser} go={go} />}
      {!PAGES.includes(page)      && <HomePage go={go} onLogout={handleLogout} />}
    </div>
  );
}
