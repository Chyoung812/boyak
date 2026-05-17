"use client";

import { memo } from "react";
import { ChevronLeft } from "lucide-react";

function BackButton({ onClick }) {
  return (
    <button
      className="mb-7 inline-flex min-h-12 items-center gap-2 rounded-lg text-xl font-black text-boyak-blue lg:mb-3 lg:min-h-9 lg:text-lg"
      type="button"
      onClick={onClick}
    >
      <ChevronLeft className="size-7 lg:size-6" aria-hidden="true" />
      처음으로
    </button>
  );
}

export default memo(BackButton);
