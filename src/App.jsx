import { useState } from 'react';
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

const PAGES = [
  'landing', 'auth', 'onboarding', 'home', 'explore',
  'duo_detail', 'request', 'match', 'hangouts', 'chat', 'chat_thread', 'me',
];

export default function App() {
  const [page, setPage]             = useState('landing');
  const [selectedDuo, setSelectedDuo] = useState(null);
  const [requestData, setRequestData] = useState({});
  const [selectedChat, setSelectedChat] = useState(null);

  const go = (newPage, duo = null, reqData = null) => {
    setSelectedDuo(duo);
    if (reqData) setRequestData(reqData);
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  const fallback = (title, activePage = 'home') => (
    <PlaceholderPage go={go} title={title} activePage={activePage} />
  );

  return (
    <div key={page} className="page-enter">
      {page === 'landing'     && <LandingPage go={go} />}
      {page === 'auth'        && <AuthPage go={go} />}
      {page === 'onboarding'  && <OnboardingFlow go={go} />}
      {page === 'home'        && <HomePage go={go} />}
      {page === 'explore'     && fallback('Explore', 'explore')}
      {page === 'duo_detail'  && (selectedDuo ? <DuoDetailPage duo={selectedDuo} go={go} /> : fallback('Duo not found'))}
      {page === 'request'     && (selectedDuo ? <RequestTwoVTwo duo={selectedDuo} go={go} /> : fallback('Duo not found'))}
      {page === 'match'       && (selectedDuo ? <MatchScreen duo={selectedDuo} requestData={requestData} go={go} /> : fallback('Match not found'))}
      {page === 'hangouts'    && <PlaceholderPage go={go} title="Hangouts" activePage="hangouts" />}
      {page === 'chat'        && <ChatListPage go={go} />}
      {page === 'chat_thread' && (selectedChat ? <ChatThreadPage chat={selectedChat} go={go} /> : fallback('Chat not found', 'chat'))}
      {page === 'me'          && <MePage go={go} />}
      {!PAGES.includes(page)  && <HomePage go={go} />}
    </div>
  );
}
