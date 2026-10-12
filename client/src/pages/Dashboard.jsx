import { useAuth } from '../context/AuthContext';
import AdopterDashboard from './dashboards/AdopterDashboard';
import ShelterDashboard from './dashboards/ShelterDashboard';
import AdminDashboard from './dashboards/AdminDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'shelter') return <ShelterDashboard />;
  return <AdopterDashboard />;
}
