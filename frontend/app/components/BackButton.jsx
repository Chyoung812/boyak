export default function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 flex min-h-14 items-center text-2xl font-black text-boyak-muted transition-colors hover:text-boyak-ink lg:mb-2 lg:min-h-10 lg:text-xl"
      aria-label="이전 화면으로 돌아가기"
    >
      &lt; 뒤로가기
    </button>
  );
}
