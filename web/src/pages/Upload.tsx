import { useState, ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import { mapRow, dedupeByCode, MappedShipment } from '../lib/shipmentMapping';
import { UploadCloud } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'حسب ملف Excel (تلقائي)' },
  { value: 'with_driver', label: 'مع المندوب' },
  { value: 'in_company', label: 'في الشركة' },
];

export default function Upload() {
  const [rows, setRows] = useState<MappedShipment[]>([]);
  const [fileName, setFileName] = useState('');
  const [forceStatus, setForceStatus] = useState('');
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setMessage('');
    setParsing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        let raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
        // بعض الملفات تبدأ بصفّين ترويسة — جرّب التخطي إن لم نجد كوداً
        if (raw.length && !Object.keys(raw[0]).some((k) => /كود|code/i.test(k))) {
          raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', range: 2 });
        }
        const mapped = dedupeByCode(raw.map((r, i) => mapRow(r, i, forceStatus || undefined)));
        setRows(mapped);
        setMessage(`تم قراءة ${mapped.length} طرد من الملف. راجع المعاينة ثم اضغط رفع.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذّر قراءة الملف');
        setRows([]);
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => {
      setError('فشل في قراءة الملف');
      setParsing(false);
    };
    reader.readAsArrayBuffer(file);
  }

  async function doUpload() {
    if (!rows.length) return;
    setUploading(true);
    setError('');
    setMessage('');
    setProgress(0);
    const BATCH = 100;
    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        await api.insert('shipments', rows.slice(i, i + BATCH));
        setProgress(Math.min(i + BATCH, rows.length));
      }
      setMessage(`✅ تم رفع ${rows.length} طرد بنجاح.`);
      setRows([]);
      setFileName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الرفع');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold mb-4">رفع البيانات</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">حالة الطرود</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={forceStatus}
              onChange={(e) => setForceStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2 text-sm cursor-pointer transition">
            <UploadCloud size={18} />
            اختر ملف Excel
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFile}
            />
          </label>

          {fileName && <span className="text-sm text-slate-500">{fileName}</span>}
        </div>

        {parsing && <p className="text-slate-400 text-sm">جارٍ قراءة الملف…</p>}
        {message && <p className="text-emerald-600 text-sm">{message}</p>}
        {error && <p className="text-red-600 text-sm">❌ {error}</p>}

        {rows.length > 0 && (
          <>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-right p-2">الكود</th>
                    <th className="text-right p-2">العميل</th>
                    <th className="text-right p-2">الهاتف</th>
                    <th className="text-right p-2">الفرع</th>
                    <th className="text-right p-2">المنطقة</th>
                    <th className="text-right p-2">الحالة</th>
                    <th className="text-right p-2">التأخير</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r) => (
                    <tr key={r.tracking_code} className="border-t">
                      <td className="p-2 font-mono">{r.tracking_code}</td>
                      <td className="p-2">{r.customer_name}</td>
                      <td className="p-2">{r.customer_phone}</td>
                      <td className="p-2">{r.branch_name || '—'}</td>
                      <td className="p-2">{r.region_name || '—'}</td>
                      <td className="p-2">{r.status}</td>
                      <td className="p-2">{r.delay_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <div className="p-2 text-center text-slate-400 text-xs">
                  … و {rows.length - 20} صفّاً آخر (معاينة أول ٢٠ فقط)
                </div>
              )}
            </div>

            <button
              onClick={doUpload}
              disabled={uploading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg px-6 py-2 text-sm font-medium transition"
            >
              {uploading ? `جارٍ الرفع… ${progress}/${rows.length}` : `رفع ${rows.length} طرد`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
