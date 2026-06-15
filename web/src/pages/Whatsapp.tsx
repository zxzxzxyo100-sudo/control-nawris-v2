import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Send, Copy } from 'lucide-react';

interface Shipment {
  id: number;
  tracking_code: string;
  customer_name: string | null;
  customer_phone: string | null;
  branch_name: string | null;
  delay_days: number | null;
}
interface Template {
  id: number;
  name: string;
  content: string | null;
}

/** يستبدل متغيّرات القالب العربية بقيم الطرد. */
function fillTemplate(body: string, s: Shipment | null): string {
  const today = new Date().toISOString().slice(0, 10);
  return body
    .replace(/{كود}/g, s?.tracking_code || '—')
    .replace(/{عميل}/g, s?.customer_name || '—')
    .replace(/{هاتف_عميل}/g, s?.customer_phone || '—')
    .replace(/{أيام}/g, String(s?.delay_days ?? 0))
    .replace(/{فرع}/g, s?.branch_name || '—')
    .replace(/{تاريخ}/g, today);
}

function normPhone(p: string): string {
  return p.replace(/\D/g, '');
}

export default function Whatsapp() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [tplId, setTplId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.select<Shipment>(
        'shipments',
        'select=id,tracking_code,customer_name,customer_phone,branch_name,delay_days&limit=500',
      ),
      api.select<Template>('wa_templates', 'select=id,name,content&limit=200'),
    ])
      .then(([s, t]) => {
        setShipments(s);
        setTemplates(t);
        if (t.length) setTplId(t[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذّر التحميل'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      shipments
        .filter((s) =>
          [s.tracking_code, s.customer_name, s.customer_phone]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .slice(0, 50),
    [shipments, search],
  );

  const template = templates.find((t) => t.id === tplId) || null;
  const message = fillTemplate(template?.content || '', selected);

  function openWhatsapp() {
    const phone = normPhone(selected?.customer_phone || '');
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      navigator.clipboard.writeText(message).catch(() => {});
      alert('لا يوجد رقم هاتف — تم نسخ الرسالة للحافظة');
    }
  }

  if (loading) return <p className="text-slate-400">جارٍ التحميل…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">واتساب</h1>
      {error && <p className="text-red-600 text-sm mb-3">❌ {error}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* اختيار الطرد */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm text-slate-600 mb-2">اختر طرداً</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
            placeholder="بحث بالكود أو الاسم أو الهاتف…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-72 overflow-y-auto border rounded-lg divide-y">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`w-full text-right p-2 text-sm hover:bg-slate-50 ${
                  selected?.id === s.id ? 'bg-violet-50' : ''
                }`}
              >
                <span className="font-mono">{s.tracking_code}</span> · {s.customer_name || '—'} ·{' '}
                {s.customer_phone || 'بلا هاتف'}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-3 text-center text-slate-400 text-sm">لا نتائج</div>
            )}
          </div>
        </div>

        {/* القالب والمعاينة */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm text-slate-600 mb-2">القالب</label>
          {templates.length === 0 ? (
            <p className="text-sm text-amber-600 mb-3">
              لا توجد قوالب — أضِفها من تبويب «البيانات الثابتة».
            </p>
          ) : (
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
              value={tplId ?? ''}
              onChange={(e) => setTplId(Number(e.target.value))}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <label className="block text-sm text-slate-600 mb-2">المعاينة</label>
          <pre className="bg-slate-50 border rounded-lg p-3 text-sm whitespace-pre-wrap min-h-32 mb-3">
            {selected ? message || '—' : 'اختر طرداً لعرض الرسالة'}
          </pre>

          <div className="flex gap-2">
            <button
              onClick={openWhatsapp}
              disabled={!selected || !template}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm transition"
            >
              <Send size={16} /> فتح واتساب
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(message).catch(() => {});
              }}
              disabled={!selected || !template}
              className="flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 rounded-lg px-4 py-2 text-sm transition"
            >
              <Copy size={16} /> نسخ
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-3">
            المتغيّرات المتاحة في القالب: {'{كود} {عميل} {هاتف_عميل} {أيام} {فرع} {تاريخ}'}
          </p>
        </div>
      </div>
    </div>
  );
}
