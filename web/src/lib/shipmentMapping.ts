// تعيين رؤوس أعمدة Excel العربية/الإنجليزية إلى حقول جدول الطرود
// نفس منطق المنظومة القديمة: نجرّب عدة أسماء بديلة لكل حقل.

export type RawRow = Record<string, unknown>;

/** يُرجع أول قيمة غير فارغة من بين أسماء الأعمدة المحتملة. */
function pick(row: RawRow, ...keys: string[]): string {
  for (const k of keys) {
    for (const actual of Object.keys(row)) {
      if (actual.trim() === k) {
        const v = row[actual];
        if (v !== null && v !== undefined && String(v).trim() !== '') {
          return String(v).trim();
        }
      }
    }
  }
  return '';
}

/** توحيد رقم الهاتف: أرقام فقط. */
function normPhone(v: string): string {
  return v.replace(/\D/g, '');
}

/** حساب أيام التأخير من تاريخ التسليم (نص أو رقم Excel التسلسلي). */
function delayFromDate(raw: string | number): number | null {
  if (raw === '' || raw === null || raw === undefined) return null;
  let d: Date | null = null;
  if (typeof raw === 'number') {
    d = new Date((raw - 25569) * 86400 * 1000);
  } else {
    const cleaned = String(raw).trim();
    d = new Date(cleaned);
    if (isNaN(d.getTime())) {
      const parts = cleaned.split(/[/\-.]/);
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const mon = parseInt(parts[1]) - 1;
        let yr = parseInt(parts[2]);
        if (yr < 100) yr += 2000;
        d = new Date(yr, mon, day);
      }
    }
  }
  if (!d || isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  return diff >= 0 ? diff : 0;
}

const STATUS_MAP: Record<string, string> = {
  'مع المندوب': 'with_driver',
  'مؤجلة مع المندوب': 'with_driver',
  'في الشركة': 'in_company',
  مرتجع: 'returned',
  'تم التسليم': 'delivered',
  محول: 'transferred',
  with_driver: 'with_driver',
  in_company: 'in_company',
  delivered: 'delivered',
  returned: 'returned',
  transferred: 'transferred',
};

export interface MappedShipment {
  tracking_code: string;
  customer_name: string;
  customer_phone: string;
  branch_name: string;
  region_name: string;
  status: string;
  delay_days: number;
  upload_date: string;
  api_source: string;
}

/** يحوّل صفّاً خاماً من Excel إلى صف جاهز للرفع. */
export function mapRow(row: RawRow, index: number, forceStatus?: string): MappedShipment {
  const code =
    pick(row, 'الكود', 'كود الطرد', 'tracking_code', 'Code', 'ParcelCode') ||
    `P-${Date.now()}-${index}`;

  let days = parseInt(pick(row, 'عدد الايام المتأخرة', 'التأخير (أيام)', 'التأخير', 'delay_days', 'الأيام')) || 0;
  const deliveryRaw =
    pick(row, 'تاريخ الإرسال', 'تاريخ التسليم للمندوب', 'تاريخ التسليم', 'تاريخ الاستلام', 'delivery_date');
  const computed = delayFromDate(deliveryRaw);
  if (computed !== null) days = computed;

  const rawStatus = pick(row, 'الحالة', 'status', 'Status') || 'with_driver';

  const today = new Date().toISOString().slice(0, 10);

  return {
    tracking_code: code,
    customer_name: pick(row, 'العميل', 'المرسل', 'اسم العميل', 'customer_name', 'ClientName', 'SenderName') || '—',
    customer_phone:
      normPhone(pick(row, 'رقم المستلم 1', 'المستلم', 'هاتف العميل', 'customer_phone', 'ReceiverPhone')) || '—',
    branch_name: pick(row, 'الفرع الحالى', 'الفرع', 'branch_name', 'Branch'),
    region_name: pick(row, 'المنطقة', 'المدينة', 'region_name', 'City'),
    status: forceStatus || STATUS_MAP[rawStatus.trim()] || 'with_driver',
    delay_days: days,
    upload_date: today,
    api_source: 'manual',
  };
}

/** يزيل التكرار حسب كود التتبع. */
export function dedupeByCode(rows: MappedShipment[]): MappedShipment[] {
  const seen = new Set<string>();
  const out: MappedShipment[] = [];
  for (const r of rows) {
    if (seen.has(r.tracking_code)) continue;
    seen.add(r.tracking_code);
    out.push(r);
  }
  return out;
}
