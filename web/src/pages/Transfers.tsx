import CrudTable from '../components/CrudTable';

export default function Transfers() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">التحويلات</h1>
      <CrudTable
        table="transfers"
        fields={[
          { key: 'tracking_code', label: 'كود التتبع', required: true },
          { key: 'customer_name', label: 'العميل' },
          { key: 'from_branch', label: 'من فرع' },
          { key: 'to_branch', label: 'إلى فرع' },
          { key: 'status', label: 'الحالة' },
          { key: 'delay_days', label: 'أيام التأخير' },
          { key: 'note', label: 'ملاحظة', type: 'textarea' },
        ]}
      />
    </div>
  );
}
