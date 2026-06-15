import { useState } from 'react';
import CrudTable, { FieldDef } from '../components/CrudTable';

interface Section {
  id: string;
  label: string;
  table: string;
  fields: FieldDef[];
}

const SECTIONS: Section[] = [
  { id: 'branches', label: 'الفروع', table: 'branches', fields: [{ key: 'name', label: 'اسم الفرع', required: true }] },
  { id: 'regions', label: 'المناطق', table: 'regions', fields: [{ key: 'name', label: 'اسم المنطقة', required: true }] },
  { id: 'stores', label: 'المتاجر', table: 'stores', fields: [{ key: 'name', label: 'اسم المتجر', required: true }] },
  {
    id: 'wa_templates',
    label: 'قوالب واتساب',
    table: 'wa_templates',
    fields: [
      { key: 'name', label: 'اسم القالب', required: true },
      { key: 'content', label: 'النص', type: 'textarea' },
    ],
  },
];

export default function Master() {
  const [active, setActive] = useState(SECTIONS[0]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">البيانات الثابتة</h1>

      <div className="flex gap-2 mb-5 border-b">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s)}
            className={`px-4 py-2 text-sm border-b-2 transition ${
              active.id === s.id
                ? 'border-violet-600 text-violet-700 font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <CrudTable key={active.id} table={active.table} fields={active.fields} />
    </div>
  );
}
