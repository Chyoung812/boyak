export default function StepLabel({ number, title }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-full bg-boyak-line text-sm font-black text-boyak-ink lg:size-6 lg:text-xs">
        {number}
      </span>
      <span className="text-base font-black text-boyak-muted lg:text-sm">{title}</span>
    </div>
  );
}
