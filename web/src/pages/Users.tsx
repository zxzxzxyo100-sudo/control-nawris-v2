import { useEffect, useState } from 'react';
import { api, UserRow } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'مدير' },
  { value: 'employee', label: 'موظف' },
];

type EditUser = UserRow & { password?: string };

export default function Users() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<EditUser | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRows(await api.listUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر التحميل');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (user?.role !== 'admin') {
    return <p className="text-slate-500">هذه الصفحة متاحة للمدير فقط.</p>;
  }

  function startAdd() {
    setEditing({ username: '', name: '', role: 'employee', status: 'active', password: '' });
    setIsNew(true);
  }

  function startEdit(u: UserRow) {
    setEditing({ ...u, password: '' });
    setIsNew(false);
  }

  async function save() {
    if (!editing) return;
    if (!editing.username.trim() || !editing.name.trim()) {
      setError('اسم المستخدم والاسم مطلوبان');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.saveUser(editing);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: UserRow) {
    if (!confirm(`حذف المستخدم ${u.name}؟`)) return;
    setError('');
    try {
      await api.deleteUser(u.username);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحذف');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">المستخدمون</h1>
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-1.5 text-sm transition"
        >
          <Plus size={16} /> إضافة مستخدم
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">❌ {error}</p>}

      {editing && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="font-medium text-sm">{isNew ? 'مستخدم جديد' : `تعديل: ${editing.username}`}</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">اسم المستخدم</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-slate-100"
                value={editing.username}
                disabled={!isNew}
                onChange={(e) => setEditing({ ...editing, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">الاسم</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">الصلاحية</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">الحالة</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value })}
              >
                <option value="active">مفعّل</option>
                <option value="inactive">معطّل</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-600 mb-1">
                كلمة المرور {isNew ? '' : '(اتركها فارغة للإبقاء على الحالية)'}
              </label>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={editing.password ?? ''}
                onChange={(e) => setEditing({ ...editing, password: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg px-4 py-1.5 text-sm transition"
            >
              <Check size={16} /> {saving ? 'جارٍ الحفظ…' : 'حفظ'}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg px-4 py-1.5 text-sm transition"
            >
              <X size={16} /> إلغاء
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">جارٍ التحميل…</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="text-right p-3">اسم المستخدم</th>
                <th className="text-right p-3">الاسم</th>
                <th className="text-right p-3">الصلاحية</th>
                <th className="text-right p-3">الحالة</th>
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.username} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-mono">{u.username}</td>
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.role === 'admin' ? 'مدير' : 'موظف'}</td>
                  <td className="p-3">
                    <span className={u.status === 'active' ? 'text-emerald-600' : 'text-red-500'}>
                      {u.status === 'active' ? 'مفعّل' : 'معطّل'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => startEdit(u)} className="text-slate-500 hover:text-violet-600">
                        <Pencil size={16} />
                      </button>
                      {u.username !== 'admin' && (
                        <button onClick={() => remove(u)} className="text-slate-500 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
