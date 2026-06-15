import CrudTable from '../components/CrudTable';

export default function Returns() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">المرتجعات</h1>
      <CrudTable
        table="returns"
        fields={[
          { key: 'tracking_code', label: 'كود التتبع', required: true },
          { key: 'customer_name', label: 'العميل' },
          { key: 'customer_phone', label: 'الهاتف' },
          { key: 'driver_name', label: 'المندوب' },
          { key: 'branch_name', label: 'الفرع' },
          { key: 'status', label: 'الحالة' },
          { key: 'delay_days', label: 'أيام التأخير' },
          { key: 'note', label: 'ملاحظة', type: 'textarea' },
        ]}
      />
    </div>
  );
}
