import { ChevronRight } from "lucide-react";

export default function NextAction({ label, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-6 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-boyak-ink px-6 text-2xl font-black text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 lg:min-h-24 lg:text-3xl"
    >
      {label}
      <ChevronRight className="size-7" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
