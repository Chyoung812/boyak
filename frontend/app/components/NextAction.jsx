import { ChevronRight } from "lucide-react";

export default function NextAction({ label, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-boyak-ink py-5 text-xl font-black text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed lg:py-3 lg:text-base"
    >
      {label}
      <ChevronRight className="size-6 lg:size-4" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
