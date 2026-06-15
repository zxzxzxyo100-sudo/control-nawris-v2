import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Stat {
  label: string;
  table: string;
  query?: string;
  value: number | null;
}

export default function Home() {
  const [stats, setStats] = useState<Stat[]>([
    { label: 'إجمالي الطرود', table: 'shipments', value: null },
    { label: 'المناديب', table: 'drivers', value: null },
    { label: 'المرتجعات', table: 'returns', value: null },
    { label: 'التحويلات', table: 'transfers', value: null },
  ]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      stats.map((s) =>
        api
          .select<{ id: number }>(s.table, 'select=id&limit=5000')
          .then((rows) => rows.length)
          .catch(() => null),
      ),
    ).then((counts) => {
      if (cancelled) return;
      setStats((prev) => prev.map((s, i) => ({ ...s, value: counts[i] })));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">لوحة التحكم</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.table} className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="text-3xl font-bold text-violet-700 mt-1">
              {s.value === null ? '…' : s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
