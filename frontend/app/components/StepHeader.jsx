import { Volume2 } from "lucide-react";

export default function StepHeader({ icon, title, onSpeak }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 lg:mb-4">
      <div className="flex items-center gap-3">
        {icon && <span aria-hidden="true">{icon}</span>}
        <h2 className="text-2xl font-black text-boyak-ink lg:text-xl">{title}</h2>
      </div>
      {onSpeak && (
        <button
          type="button"
          onClick={onSpeak}
          className="shrink-0 grid size-12 place-items-center rounded-full text-boyak-muted hover:text-boyak-ink transition-colors lg:size-9"
          aria-label="음성으로 듣기"
        >
          <Volume2 className="size-8 lg:size-6" strokeWidth={2.3} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
