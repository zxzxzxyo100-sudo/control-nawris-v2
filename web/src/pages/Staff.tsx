import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface ContactResult {
  id: number;
  result: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

interface StaffStat {
  name: string;
  total: number;
  byResult: Record<string, number>;
}

export default function Staff() {
  const [rows, setRows] = useState<ContactResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .select<ContactResult>('contact_results', 'select=id,result,updated_by,updated_at&limit=5000')
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذّر التحميل'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">جارٍ التحميل…</p>;

  const map = new Map<string, StaffStat>();
  for (const r of rows) {
    const name = r.updated_by || '—';
    if (!map.has(name)) map.set(name, { name, total: 0, byResult: {} });
    const stat = map.get(name)!;
    stat.total++;
    const res = r.result || 'غير محدد';
    stat.byResult[res] = (stat.byResult[res] || 0) + 1;
  }
  const stats = [...map.values()].sort((a, b) => b.total - a.total);
  const allResults = [...new Set(rows.map((r) => r.result || 'غير محدد'))];

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">متابعة الموظفين</h1>
      {error && <p className="text-red-600 text-sm mb-3">❌ {error}</p>}

      <p className="text-sm text-slate-500 mb-4">
        أداء الموظفين بناءً على عدد عمليات التواصل المسجّلة.
      </p>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="text-right p-3">الموظف</th>
              <th className="text-right p-3">الإجمالي</th>
              {allResults.map((r) => (
                <th key={r} className="text-right p-3">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={s.name} className="border-t hover:bg-slate-50">
                <td className="p-3 font-medium">
                  {i === 0 && '🥇 '}
                  {i === 1 && '🥈 '}
                  {i === 2 && '🥉 '}
                  {s.name}
                </td>
                <td className="p-3 font-bold text-violet-700">{s.total}</td>
                {allResults.map((r) => (
                  <td key={r} className="p-3">
                    {s.byResult[r] || 0}
                  </td>
                ))}
              </tr>
            ))}
            {stats.length === 0 && (
              <tr>
                <td colSpan={allResults.length + 2} className="p-6 text-center text-slate-400">
                  لا توجد بيانات تواصل بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
