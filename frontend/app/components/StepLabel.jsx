"use client";

import { memo } from "react";

function StepLabel({ number, title }) {
  return (
    <p className="mb-5 inline-flex items-center gap-3 text-xl font-black lg:mb-3 lg:text-base">
      <span className="grid size-9 place-items-center rounded-full bg-boyak-orange text-white lg:size-7 lg:text-sm">
        {number}
      </span>
      {title}
    </p>
  );
}

export default memo(StepLabel);
