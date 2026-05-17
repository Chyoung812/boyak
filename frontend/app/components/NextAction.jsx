"use client";

import { memo } from "react";

function NextAction({ label, onClick }) {
  return (
    <button
      className="mt-7 min-h-20 w-full rounded-2xl bg-boyak-blue px-6 text-2xl font-black text-white lg:mt-4 lg:min-h-14 lg:text-lg"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default memo(NextAction);
