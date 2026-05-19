import { Volume2 } from "lucide-react";

export default function FlowPanel({ icon, title, body, primaryLabel, onPrimary, onSpeak }) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-[28px] border-2 border-boyak-line bg-white p-8 text-center shadow-sm lg:p-6 lg:gap-4">
      {icon && <div aria-hidden="true">{icon}</div>}

      <div className="space-y-2">
        <h2 className="text-2xl font-black text-boyak-ink lg:text-xl">{title}</h2>
        {body && <p className="text-lg text-boyak-muted lg:text-base">{body}</p>}
      </div>

      <div className="flex w-full flex-col gap-3">
        {primaryLabel && onPrimary && (
          <button
            type="button"
            onClick={onPrimary}
            className="w-full rounded-2xl bg-boyak-ink py-4 text-xl font-black text-white hover:opacity-90 transition-opacity lg:py-3 lg:text-base"
          >
            {primaryLabel}
          </button>
        )}
        {onSpeak && (
          <button
            type="button"
            onClick={onSpeak}
            className="flex items-center justify-center gap-2 w-full rounded-2xl border-2 border-boyak-line py-3 text-lg font-black text-boyak-muted hover:text-boyak-ink transition-colors lg:py-2 lg:text-sm"
            aria-label="음성으로 듣기"
          >
            <Volume2 className="size-5" aria-hidden="true" />
            음성 안내
          </button>
        )}
      </div>
    </div>
  );
}
