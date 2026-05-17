"use client";

import { memo } from "react";
import { Volume2 } from "lucide-react";

function StepHeader({ icon, title, onSpeak }) {
  return (
    <div className="mb-7 flex items-start justify-between gap-4 lg:mb-4 lg:gap-3">
      <div className="flex items-center gap-4">
        <span className="grid shrink-0 place-items-center [&>svg]:size-12 lg:[&>svg]:size-8">
          {icon}
        </span>
        <h2 className="text-3xl font-black leading-tight lg:text-2xl">{title}</h2>
      </div>
      <button
        className="grid size-14 shrink-0 place-items-center rounded-full text-boyak-ink lg:size-10"
        type="button"
        aria-label={`${title} 음성 안내 듣기`}
        onClick={onSpeak}
      >
        <Volume2 className="size-10 lg:size-7" aria-hidden="true" />
      </button>
    </div>
  );
}

export default memo(StepHeader);
