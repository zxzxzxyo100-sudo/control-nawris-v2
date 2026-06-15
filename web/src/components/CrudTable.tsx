import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'textarea';
  required?: boolean;
}

interface Props {
  table: string;
  fields: FieldDef[];
  title?: string;
}

type Row = Record<string, any>;

/** مدير جدول عام: عرض + إضافة + تعديل + حذف لأي جدول عبر واجهة /api/data. */
export default function CrudTable({ table, fields, title }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Row | null>(null); // الصف الجاري تعديله/إضافته
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.select<Row>(table, 'order=id.desc&limit=2000');
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر التحميل');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  function startAdd() {
    const blank: Row = {};
    fields.forEach((f) => (blank[f.key] = ''));
    setEditing(blank);
    setIsNew(true);
  }

  function startEdit(row: Row) {
    setEditing({ ...row });
    setIsNew(false);
  }

  async function save() {
    if (!editing) return;
    for (const f of fields) {
      if (f.required && !String(editing[f.key] ?? '').trim()) {
        setError(`الحقل "${f.label}" مطلوب`);
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      const payload: Row = {};
      fields.forEach((f) => (payload[f.key] = editing[f.key] ?? ''));
      if (isNew) {
        await api.insert(table, payload);
      } else {
        await api.update(table, `id=eq.${editing.id}`, payload);
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    if (!confirm(`حذف هذا السجل؟`)) return;
    setError('');
    try {
      await api.remove(table, `id=eq.${row.id}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحذف');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        {title && <h2 className="text-lg font-bold">{title}</h2>}
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-1.5 text-sm transition"
        >
          <Plus size={16} /> إضافة
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">❌ {error}</p>}

      {editing && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="font-medium text-sm">{isNew ? 'سجل جديد' : 'تعديل السجل'}</div>
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-slate-600 mb-1">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  value={editing[f.key] ?? ''}
                  onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                />
              ) : (
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={editing[f.key] ?? ''}
                  onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
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
                {fields.map((f) => (
                  <th key={f.key} className="text-right p-3">
                    {f.label}
                  </th>
                ))}
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-slate-50">
                  {fields.map((f) => (
                    <td key={f.key} className="p-3">
                      {row[f.key] || '—'}
                    </td>
                  ))}
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => startEdit(row)} className="text-slate-500 hover:text-violet-600">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => remove(row)} className="text-slate-500 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={fields.length + 1} className="p-6 text-center text-slate-400">
                    لا توجد سجلات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
