import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import MyDuosSection from '../components/MyDuosSection.jsx';

export default function MyDuosPage({ currentUser, go }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar showBack onBack={() => go('me')} onLogoClick={() => go('home')} />
      <div style={{ padding: '20px 16px 104px' }}>
        <MyDuosSection currentUser={currentUser} go={go} />
      </div>
    </div>
  );
}
