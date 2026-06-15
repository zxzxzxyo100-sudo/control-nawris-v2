import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LogOut } from 'lucide-react';

const TABS = [
  { to: '/', label: '🏠 الرئيسية', end: true },
  { to: '/shipments', label: '📦 الطرود' },
  { to: '/drivers', label: '👤 المناديب' },
  { to: '/returns', label: '↩️ المرتجعات' },
  { to: '/transfers', label: '🔄 التحويلات' },
  { to: '/whatsapp', label: '💬 واتساب' },
  { to: '/reports', label: '📊 التقارير' },
  { to: '/staff', label: '👥 الموظفون' },
  { to: '/master', label: '⚙️ البيانات الثابتة' },
  { to: '/upload', label: '📥 رفع البيانات' },
  { to: '/users', label: '🔐 المستخدمون' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-white border-l shadow-sm flex flex-col">
        <div className="p-4 border-b">
          <div className="font-bold text-violet-700">النورس للشحن</div>
          <div className="text-xs text-slate-500 mt-1">{user?.name} · {user?.role}</div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? 'bg-violet-100 text-violet-700 font-medium' : 'hover:bg-slate-100'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="m-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition"
        >
          <LogOut size={16} /> تسجيل الخروج
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
