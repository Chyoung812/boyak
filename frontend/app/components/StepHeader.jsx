export default function StepHeader({ icon, title }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 lg:mb-4">
      <div className="flex items-center gap-3">
        {icon && <span aria-hidden="true">{icon}</span>}
        <h2 className="text-2xl font-black text-boyak-ink lg:text-xl">{title}</h2>
      </div>
    </div>
  );
}
