import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Login from './pages/Login';
import Layout from './components/Layout';
import Home from './pages/Home';
import Shipments from './pages/Shipments';
import Upload from './pages/Upload';
import Drivers from './pages/Drivers';
import Master from './pages/Master';
import Placeholder from './pages/Placeholder';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        جارٍ التحميل…
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shipments" element={<Shipments />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="returns" element={<Placeholder title="المرتجعات" />} />
        <Route path="transfers" element={<Placeholder title="التحويلات" />} />
        <Route path="whatsapp" element={<Placeholder title="واتساب" />} />
        <Route path="reports" element={<Placeholder title="التقارير" />} />
        <Route path="staff" element={<Placeholder title="متابعة الموظفين" />} />
        <Route path="master" element={<Master />} />
        <Route path="upload" element={<Upload />} />
        <Route path="users" element={<Placeholder title="المستخدمون" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
