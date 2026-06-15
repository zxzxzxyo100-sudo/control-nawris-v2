import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Shipment {
  id: number;
  branch_name: string | null;
  status: string | null;
  delay_days: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  with_driver: 'مع المندوب',
  in_company: 'في الشركة',
  delivered: 'تم التسليم',
  returned: 'مرتجع',
  transferred: 'محول',
};

function groupCount(rows: Shipment[], key: (s: Shipment) => string): [string, number][] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r) || '—';
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function BarList({ title, data, labels }: { title: string; data: [string, number][]; labels?: Record<string, string> }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="font-bold text-sm mb-3">{title}</h3>
      <div className="space-y-2">
        {data.map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between text-xs mb-0.5">
              <span>{labels?.[k] || k}</span>
              <span className="text-slate-500">{v}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded">
              <div className="h-2 bg-violet-500 rounded" style={{ width: `${(v / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-slate-400 text-sm">لا بيانات</p>}
      </div>
    </div>
  );
}

export default function Reports() {
  const [rows, setRows] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .select<Shipment>('shipments', 'select=id,branch_name,status,delay_days&limit=5000')
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذّر التحميل'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">جارٍ التحميل…</p>;

  const total = rows.length;
  const delayed = rows.filter((r) => (r.delay_days ?? 0) > 0).length;
  const avgDelay = total ? (rows.reduce((a, r) => a + (r.delay_days ?? 0), 0) / total).toFixed(1) : '0';
  const critical = rows.filter((r) => (r.delay_days ?? 0) >= 7).length;

  const cards = [
    { label: 'إجمالي الطرود', value: total },
    { label: 'متأخرة', value: delayed },
    { label: 'حرجة (٧+ أيام)', value: critical },
    { label: 'متوسط التأخير', value: avgDelay },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">التقارير</h1>
      {error && <p className="text-red-600 text-sm mb-3">❌ {error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-sm text-slate-500">{c.label}</div>
            <div className="text-3xl font-bold text-violet-700 mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <BarList title="حسب الحالة" data={groupCount(rows, (s) => s.status || '')} labels={STATUS_LABELS} />
        <BarList title="حسب الفرع" data={groupCount(rows, (s) => s.branch_name || '')} />
      </div>
    </div>
  );
}
