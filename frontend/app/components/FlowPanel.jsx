"use client";

import { memo } from "react";
import { Volume2 } from "lucide-react";

function FlowPanel({ icon, title, body, primaryLabel, onPrimary, onSpeak }) {
  return (
    <div className="rounded-[28px] border-2 border-boyak-line bg-white p-8 text-center shadow-sm lg:p-6">
      <div className="mx-auto mb-5 grid size-24 place-items-center rounded-full bg-[#EDF4FF] lg:mb-4 lg:size-16 lg:[&>svg]:size-9">
        {icon}
      </div>
      <h2 className="mb-4 text-3xl font-black lg:mb-2 lg:text-2xl">{title}</h2>
      <p className="mx-auto mb-8 max-w-2xl text-xl font-bold leading-relaxed text-boyak-muted lg:mb-5 lg:text-lg">
        {body}
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:gap-3">
        <button
          className="min-h-20 rounded-2xl bg-boyak-blue px-6 text-2xl font-black text-white lg:min-h-14 lg:text-lg"
          type="button"
          onClick={onPrimary}
        >
          {primaryLabel}
        </button>
        <button
          className="inline-flex min-h-20 items-center justify-center gap-3 rounded-2xl border-2 border-boyak-line bg-white px-6 text-2xl font-black lg:min-h-14 lg:text-lg"
          type="button"
          onClick={onSpeak}
        >
          <Volume2 className="size-8 text-boyak-blue lg:size-6" aria-hidden="true" />
          음성으로 듣기
        </button>
      </div>
    </div>
  );
}

export default memo(FlowPanel);
