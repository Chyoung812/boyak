from datetime import date
from threading import Lock

from fastapi import HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address

# ── 한도 설정: 이 숫자만 바꾸면 됩니다 ──────────────────────────────────────
OCR_DAILY_LIMIT       = 30   # OpenAI OCR     하루 전체 최대 호출 수
AI_ROUTE_DAILY_LIMIT  = 50   # OpenAI AI라우팅 하루 전체 최대 호출 수
TMAP_DAILY_LIMIT      = 50   # TMap 병원검색   하루 전체 최대 호출 수

RATE_OCR       = "3/minute"  # IP당 OCR 속도 제한
RATE_AI_ROUTE  = "5/minute"  # IP당 AI라우팅 속도 제한
RATE_TMAP      = "5/minute"  # IP당 병원검색 속도 제한
# ─────────────────────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)


class _DailyCounter:
    def __init__(self, limit: int, name: str):
        self.limit = limit
        self.name = name
        self._count = 0
        self._date = date.today()
        self._lock = Lock()

    def check_and_increment(self) -> bool:
        """사용 가능하면 True, 한도 초과면 False."""
        with self._lock:
            today = date.today()
            if today != self._date:
                self._count = 0
                self._date = today
            if self._count >= self.limit:
                return False
            self._count += 1
            return True

    @property
    def remaining(self) -> int:
        with self._lock:
            today = date.today()
            if today != self._date:
                return self.limit
            return max(0, self.limit - self._count)


ocr_daily       = _DailyCounter(limit=OCR_DAILY_LIMIT,      name="OpenAI OCR")
ai_route_daily  = _DailyCounter(limit=AI_ROUTE_DAILY_LIMIT, name="OpenAI AI라우팅")
tmap_daily      = _DailyCounter(limit=TMAP_DAILY_LIMIT,     name="TMap 병원검색")


def require_daily(counter: _DailyCounter) -> None:
    """한도 초과 시 503을 발생시킵니다."""
    if not counter.check_and_increment():
        raise HTTPException(
            status_code=503,
            detail=(
                f"{counter.name} 하루 사용 한도({counter.limit}회)에 도달했습니다. "
                "내일 오전 0시(UTC)에 초기화됩니다."
            ),
        )
