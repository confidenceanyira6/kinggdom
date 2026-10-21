import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, TabLayout, PlainLayout } from './components/AppLayout';
import { Spinner } from './components/ui';
import { ArenaRuntime } from './arena/ArenaRuntime';
import { useSessionSync } from './hooks/useSessionSync';
import { isSupabaseConfigured } from './lib/supabase';
import { useApp } from './store/useApp';

// Every screen is code-split so the first load stays small as the app grows.
const Splash = lazy(() => import('./pages/Splash'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const SignUp = lazy(() => import('./pages/SignUp'));
const LogIn = lazy(() => import('./pages/LogIn'));
const Setup = lazy(() => import('./pages/Setup'));
const Home = lazy(() => import('./pages/Home'));
const Discover = lazy(() => import('./pages/Discover'));
const Search = lazy(() => import('./pages/Search'));
const Play = lazy(() => import('./pages/Play'));
const PlayMode = lazy(() => import('./pages/PlayMode'));
const GameRouter = lazy(() => import('./pages/GameRouter'));
const Live = lazy(() => import('./pages/Live'));
const LiveStream = lazy(() => import('./pages/LiveStream'));
const WatchMatch = lazy(() => import('./pages/WatchMatch'));
const StartStream = lazy(() => import('./pages/StartStream'));
const Profile = lazy(() => import('./pages/Profile'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Store = lazy(() => import('./pages/Store'));
const SendGift = lazy(() => import('./pages/SendGift'));
const Menu = lazy(() => import('./pages/Menu'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Chat = lazy(() => import('./pages/Chat'));
const ChatThread = lazy(() => import('./pages/ChatThread'));
const Friends = lazy(() => import('./pages/Friends'));
const Community = lazy(() => import('./pages/Community'));
const Tournaments = lazy(() => import('./pages/Tournaments'));
const TournamentDetails = lazy(() => import('./pages/TournamentDetails'));
const CreateTournament = lazy(() => import('./pages/CreateTournament'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const CreatePost = lazy(() => import('./pages/CreatePost'));
const Referral = lazy(() => import('./pages/Referral'));
const Admin = lazy(() => import('./pages/Admin'));
const Arena = lazy(() => import('./pages/Arena'));
const ArenaCompetition = lazy(() => import('./pages/ArenaCompetition'));
const ArenaLive = lazy(() => import('./pages/ArenaLive'));
const ArenaMatch = lazy(() => import('./pages/ArenaMatch'));
const AdminArena = lazy(() => import('./pages/AdminArena'));

function Toaster() {
  const msg = useApp((s) => s.toastMsg);
  return msg ? <div className='toast'>{msg}</div> : null;
}

export default function App() {
  const theme = useApp((s) => s.theme);
  useSessionSync();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (!isSupabaseConfigured) {
    return (
      <div className='shell'>
        <div className='center-screen' style={{ padding: 24, textAlign: 'center' }}>
          Kinggdom is not connected to its backend yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Vercel project settings, then redeploy.
        </div>
      </div>
    );
  }

  return (
    <div className='shell'>
      <Suspense fallback={<div className='center-screen'><Spinner /></div>}>
        <Routes>
          <Route path='/' element={<Splash />} />
          <Route path='/onboarding' element={<Onboarding />} />
          <Route path='/signup' element={<SignUp />} />
          <Route path='/login' element={<LogIn />} />

          <Route element={<RequireAuth />}>
            <Route path='/setup' element={<Setup />} />

            <Route element={<TabLayout />}>
              <Route path='/home' element={<Home />} />
              <Route path='/discover' element={<Discover />} />
              <Route path='/play' element={<Play />} />
              <Route path='/live' element={<Live />} />
              <Route path='/chat' element={<Chat />} />
              <Route path='/profile' element={<Profile />} />
              <Route path='/menu' element={<Menu />} />
            </Route>

            <Route element={<PlainLayout />}>
              <Route path='/search' element={<Search />} />
              <Route path='/play/:game' element={<PlayMode />} />
              <Route path='/game/:game' element={<GameRouter />} />
              <Route path='/live/start' element={<StartStream />} />
              <Route path='/live/:id' element={<LiveStream />} />
              <Route path='/watch/:id' element={<WatchMatch />} />
              <Route path='/u/:username' element={<Profile />} />
              <Route path='/profile/edit' element={<EditProfile />} />
              <Route path='/wallet' element={<Wallet />} />
              <Route path='/store' element={<Store />} />
              <Route path='/gift' element={<SendGift />} />
              <Route path='/settings' element={<Settings />} />
              <Route path='/notifications' element={<Notifications />} />
              <Route path='/chat/:id' element={<ChatThread />} />
              <Route path='/friends' element={<Friends />} />
              <Route path='/community' element={<Community />} />
              <Route path='/tournaments' element={<Tournaments />} />
              <Route path='/tournaments/new' element={<CreateTournament />} />
              <Route path='/tournaments/:id' element={<TournamentDetails />} />
              <Route path='/leaderboard' element={<Leaderboard />} />
              <Route path='/create-post' element={<CreatePost />} />
              <Route path='/referral' element={<Referral />} />
              <Route path='/admin' element={<Admin />} />
              <Route path='/admin/arena' element={<AdminArena />} />
              <Route path='/arena' element={<Arena />} />
              <Route path='/arena/live' element={<ArenaLive />} />
              <Route path='/arena/match/:id' element={<ArenaMatch />} />
              <Route path='/arena/:compId' element={<ArenaCompetition />} />
            </Route>
          </Route>

          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </Suspense>
      <ArenaRuntime />
      <Toaster />
    </div>
  );
}
