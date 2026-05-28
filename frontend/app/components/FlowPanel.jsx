export default function FlowPanel({ icon, title, body, primaryLabel, onPrimary, className = "" }) {
  return (
    <div className={`mx-auto flex w-full flex-col items-center gap-6 rounded-[28px] border-2 border-boyak-line bg-white p-8 text-center shadow-sm lg:gap-6 lg:p-8 ${className}`}>
      {icon && <div aria-hidden="true">{icon}</div>}

      <div className="space-y-2">
        <h2 className="text-2xl font-black text-boyak-ink lg:text-2xl">{title}</h2>
        {body && <p className="text-lg text-boyak-muted lg:text-lg">{body}</p>}
      </div>

      <div className="flex w-full flex-col items-center gap-3">
        {primaryLabel && onPrimary && (
          <button
            type="button"
            onClick={onPrimary}
            className="min-h-16 w-full max-w-[420px] rounded-2xl bg-boyak-ink px-8 text-2xl font-black text-white transition-opacity hover:opacity-90 lg:min-h-24 lg:text-3xl"
          >
            {primaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
