import { useEffect } from 'react';
import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ProtectedRoute } from './components/ui';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Animals from './pages/Animals';
import AnimalDetail from './pages/AnimalDetail';
import AnimalForm from './pages/AnimalForm';
import Apply from './pages/Apply';
import ApplicationDetail from './pages/ApplicationDetail';
import MapPage from './pages/MapPage';
import Shelters from './pages/Shelters';
import ShelterProfile from './pages/ShelterProfile';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import CheckInDetail from './pages/CheckInDetail';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const hideFooter = pathname.startsWith('/messages');
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}

const only = (roles, element) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;
const signedIn = (element) => <ProtectedRoute>{element}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/animals" element={<Animals />} />
        <Route path="/animals/new" element={only(['shelter'], <AnimalForm />)} />
        <Route path="/animals/:id" element={<AnimalDetail />} />
        <Route path="/animals/:id/edit" element={only(['shelter', 'admin'], <AnimalForm />)} />
        <Route path="/animals/:id/apply" element={only(['adopter'], <Apply />)} />
        <Route path="/applications/:id" element={signedIn(<ApplicationDetail />)} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/shelters" element={<Shelters />} />
        <Route path="/shelters/:id" element={<ShelterProfile />} />
        <Route path="/messages" element={signedIn(<Messages />)} />
        <Route path="/messages/:id" element={signedIn(<Messages />)} />
        <Route path="/notifications" element={signedIn(<Notifications />)} />
        <Route path="/checkins/:id" element={signedIn(<CheckInDetail />)} />
        <Route path="/profile" element={signedIn(<Profile />)} />
        <Route path="/dashboard" element={signedIn(<Dashboard />)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
