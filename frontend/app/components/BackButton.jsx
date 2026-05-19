import { ChevronLeft } from "lucide-react";

export default function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 flex items-center gap-1 text-boyak-muted hover:text-boyak-ink transition-colors text-lg font-bold lg:text-sm"
      aria-label="이전 화면으로 돌아가기"
    >
      <ChevronLeft className="size-6 lg:size-4" strokeWidth={2.5} aria-hidden="true" />
      뒤로
    </button>
  );
}
