export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold mb-2">{title}</h1>
      <p className="text-slate-500 text-sm">
        هذه الصفحة قيد البناء — سيتم تنفيذها في مرحلة لاحقة.
      </p>
    </div>
  );
}
