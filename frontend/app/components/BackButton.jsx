import { ChevronLeft } from "lucide-react";

export default function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 flex min-h-14 items-center gap-2 text-2xl font-black text-boyak-muted transition-colors hover:text-boyak-ink lg:mb-3 lg:text-2xl"
      aria-label="이전 화면으로 돌아가기"
    >
      <ChevronLeft className="size-8" strokeWidth={2.8} aria-hidden="true" />
      뒤로
    </button>
  );
}
