import CrudTable from '../components/CrudTable';

export default function Drivers() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">المناديب</h1>
      <CrudTable
        table="drivers"
        fields={[
          { key: 'name', label: 'الاسم', required: true },
          { key: 'phone', label: 'الهاتف' },
          { key: 'branch_name', label: 'الفرع' },
        ]}
      />
    </div>
  );
}
