import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Shipment {
  id: number;
  tracking_code: string;
  customer_name: string | null;
  customer_phone: string | null;
  branch_name: string | null;
  status: string | null;
  delay_days: number | null;
}

export default function Shipments() {
  const [rows, setRows] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.select<Shipment>(
        'shipments',
        'select=id,tracking_code,customer_name,customer_phone,branch_name,status,delay_days&order=delay_days.desc&limit=500',
      );
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر تحميل الطرود');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) =>
    [r.tracking_code, r.customer_name, r.customer_phone]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">الطرود</h1>
        <input
          className="border rounded-lg px-3 py-1.5 text-sm w-64"
          placeholder="بحث بالكود أو الاسم أو الهاتف…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-red-600 text-sm mb-3">❌ {error}</p>}
      {loading ? (
        <p className="text-slate-400">جارٍ التحميل…</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="text-right p-3">كود التتبع</th>
                <th className="text-right p-3">العميل</th>
                <th className="text-right p-3">الهاتف</th>
                <th className="text-right p-3">الفرع</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">أيام التأخير</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-mono">{r.tracking_code}</td>
                  <td className="p-3">{r.customer_name || '—'}</td>
                  <td className="p-3">{r.customer_phone || '—'}</td>
                  <td className="p-3">{r.branch_name || '—'}</td>
                  <td className="p-3">{r.status || '—'}</td>
                  <td className="p-3">{r.delay_days ?? 0}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    لا توجد طرود
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
