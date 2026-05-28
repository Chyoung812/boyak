"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TMAP_KEY = process.env.NEXT_PUBLIC_TMAP_KEY;

export default function NavigationMap({ hospital, onArrive, onSpeak, onLocationChange, relocatedHospitals = [], isRelocatingHospital = false, onRelocatedHospitalSelect }) {
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // ── 출발지 상태 ──
  const [userLoc, setUserLoc] = useState(null);   // null = 위치 확인 중
  const [isLocating, setIsLocating] = useState(true);
  const [locLabel, setLocLabel] = useState("위치 확인 중...");
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  // ── 지도/경로 상태 ──
  const [isTracking, setIsTracking] = useState(false);
  const [instruction, setInstruction] = useState("경로를 계산 중입니다...");
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeError, setRouteError] = useState(null);

  // ── refs ──
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const stepsRef = useRef([]);
  const watchIdRef = useRef(null);

  // ── Step 1: GPS 위치 획득 ──
  useEffect(() => {
    if (!navigator.geolocation) {
      const fallback = { lat: 37.566481, lon: 126.985023 };
      setUserLoc(fallback);
      setLocLabel("기본 위치 (서울시청)");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLoc(loc);
        setLocLabel("현재 위치 (GPS)");
        setIsLocating(false);
      },
      () => {
        const fallback = { lat: 37.566481, lon: 126.985023 };
        setUserLoc(fallback);
        setLocLabel("GPS 실패 — 기본 위치 사용");
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 0 }
    );
  }, []);

  // ── Step 2: 지도 초기화 (userLoc 준비된 뒤 실행) ──
  useEffect(() => {
    if (!userLoc || isLocating) return;
    if (!mapDivRef.current) return;
    if (!hospital?.lat || !hospital?.lon) {
      setRouteError("병원 위치 정보가 없습니다. 병원 검색 후 다시 시도해 주세요.");
      return;
    }

    // 기존 지도 제거 후 재생성 (출발지 변경 시에도 적용)
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    setRouteInfo(null);
    setRouteError(null);
    setInstruction("경로를 계산 중입니다...");

    let cancelled = false;

    import("leaflet").then((leaflet) => {
      if (cancelled || !mapDivRef.current) return;
      const L = leaflet.default;

      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const { lat, lon } = userLoc;
      const map = L.map(mapDivRef.current, { zoomControl: true }).setView([lat, lon], 17);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // 출발 마커
      const userIcon = L.divIcon({
        html: `<div style="width:36px;height:36px;background:#004D40;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#A5D6A7;font-size:18px;box-shadow:0 2px 6px rgba(0,0,0,0.4)">▲</div>`,
        iconSize: [36, 36], iconAnchor: [18, 18], className: "",
      });
      userMarkerRef.current = L.marker([lat, lon], { icon: userIcon })
        .bindPopup("출발지")
        .addTo(map);

      // 병원 마커
      const hospitalIcon = L.divIcon({
        html: `<div style="width:36px;height:36px;background:#d32f2f;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:20px;box-shadow:0 2px 6px rgba(0,0,0,0.4)">+</div>`,
        iconSize: [36, 36], iconAnchor: [18, 36], className: "",
      });
      L.marker([hospital.lat, hospital.lon], { icon: hospitalIcon })
        .bindPopup(hospital.name)
        .addTo(map);

      if (!TMAP_KEY) {
        setInstruction("TMap 키가 없어 경로 표시를 건너뜁니다.");
        return;
      }

      // TMap 무장애 보행자 경로 (searchOption 30)
      fetch("https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json", {
        method: "POST",
        headers: { appKey: TMAP_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          startX: String(lon), startY: String(lat),
          endX: String(hospital.lon), endY: String(hospital.lat),
          reqCoordType: "WGS84GEO", resCoordType: "WGS84GEO",
          startName: "출발", endName: hospital.name,
          searchOption: "30",
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (cancelled || !data?.features) return;
          const features = data.features;
          const totalDistance = features[0]?.properties?.totalDistance ?? 0;
          const totalTimeSec = features[0]?.properties?.totalTime ?? 0;
          const totalTime = Math.max(1, Math.ceil(totalTimeSec / 60));
          let stairs = 0;
          const steps = [];
          const latlngs = [];

          features.forEach((f) => {
            if (f.properties?.facilityType === "11") stairs++;
            if (f.geometry.type === "Point" && f.properties?.description) {
              const [cx, cy] = f.geometry.coordinates;
              steps.push({
                description: f.properties.description.replace("이동", "걸어가세요"),
                lat: cy, lon: cx,
              });
            }
            if (f.geometry.type === "LineString") {
              f.geometry.coordinates.forEach(([cx, cy]) => latlngs.push([cy, cx]));
            }
          });

          stepsRef.current = steps;
          setInstruction(steps.length > 0 ? steps[0].description : "안내 시작 버튼을 눌러 GPS 추적을 시작하세요.");
          setRouteInfo({ totalDistance, totalTime, stairs });

          if (latlngs.length > 0) {
            const poly = L.polyline(latlngs, { color: "#0088FF", weight: 6, opacity: 0.85 }).addTo(map);
            map.fitBounds(poly.getBounds(), { padding: [40, 40] });
          }
        })
        .catch(() => {
          if (!cancelled) setInstruction("경로 조회에 실패했어요. 안내 시작을 누르면 GPS 추적만 이용합니다.");
        });
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [userLoc, hospital, onSpeak, isLocating]);

  // ── GPS 실시간 추적 ──
  const startTracking = useCallback(() => {
    if (!mapRef.current || !userLoc) return;
    setIsTracking(true);
    onSpeak(`${hospital.name}까지 실시간 안내를 시작합니다.`);
    mapRef.current.setZoom(19);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: liveLat, longitude: liveLon } = position.coords;
        if (!userMarkerRef.current || !mapRef.current) return;
        userMarkerRef.current.setLatLng([liveLat, liveLon]);
        mapRef.current.setView([liveLat, liveLon]);

        if (stepsRef.current.length > 0) {
          let closest = stepsRef.current[0];
          let minDist = Infinity;
          stepsRef.current.forEach((step) => {
            const d = Math.hypot(liveLat - step.lat, liveLon - step.lon);
            if (d < minDist) { minDist = d; closest = step; }
          });
          setInstruction((prev) => {
            if (prev !== closest.description) {
              onSpeak(closest.description);
              return closest.description;
            }
            return prev;
          });
        }

        const distToTarget = Math.hypot(liveLat - hospital.lat, liveLon - hospital.lon) * 111000;
        if (distToTarget < 20) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          onSpeak("목적지 병원에 무사히 도착했습니다.");
          onArrive();
        }
      },
      (err) => console.error("GPS 오류:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  }, [hospital, onSpeak, onArrive, userLoc]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setInstruction(stepsRef.current.length > 0 ? stepsRef.current[0].description : "안내 시작 버튼을 눌러 GPS 추적을 시작하세요.");
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // ── 주소 검색으로 출발지 변경 ──
  const handleAddressSearch = useCallback(async () => {
    if (!addressInput.trim() || !TMAP_KEY) return;
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(addressInput)}&resCoordType=WGS84GEO&count=1`,
        { headers: { appKey: TMAP_KEY } }
      );
      const data = await res.json();
      const poi = data?.searchPoiInfo?.pois?.poi?.[0];
      if (poi) {
        const newLoc = {
          lat: parseFloat(poi.frontLat || poi.noorLat),
          lon: parseFloat(poi.frontLon || poi.noorLon),
        };
        setLocLabel(`출발지: ${poi.name || addressInput}`);
        setUserLoc(newLoc);   // 지도 effect 재실행됨
        setShowAddressInput(false);
        setAddressInput("");
        onLocationChange?.(newLoc);
      } else {
        alert("주소를 찾을 수 없어요. 다시 입력해 주세요.");
      }
    } catch {
      alert("주소 검색에 실패했어요.");
    } finally {
      setIsGeocoding(false);
    }
  }, [addressInput]);

  // ── 현재 위치로 복원 ──
  const resetToGps = useCallback(() => {
    setIsLocating(true);
    setLocLabel("위치 확인 중...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLoc(loc);
        setLocLabel("현재 위치 (GPS)");
        setIsLocating(false);
        setShowAddressInput(false);
        onLocationChange?.(loc);
      },
      () => {
        setLocLabel("GPS 실패");
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 0 }
    );
  }, []);

  // 확대 시 Leaflet 지도 크기 재계산
  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 50);
    return () => clearTimeout(timer);
  }, [isMapExpanded]);

  const wrapperClass = isMapExpanded
    ? "fixed inset-2 z-[9999] flex flex-col overflow-hidden rounded-[24px] border-2 border-boyak-line bg-white shadow-2xl"
    : "mx-auto w-full overflow-hidden rounded-[30px] border-2 border-boyak-line bg-white shadow-soft lg:flex lg:h-[calc(100dvh-450px)] lg:min-h-[280px] lg:flex-col";

  const mapHeightClass = isMapExpanded ? "flex-1 min-h-0" : "h-[320px] lg:min-h-0 lg:flex-1";

  return (
    <div className={wrapperClass}>
      {/* 안내 바 */}
      <div className="flex items-center gap-4 bg-[#004D40] px-6 py-5 text-white lg:px-7 lg:py-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-[#00796B] text-3xl lg:size-16 lg:text-3xl">
          ⬆️
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-black lg:text-2xl">
            {isLocating ? "위치 확인 중..." : instruction}
          </p>
          {routeInfo && (
            <p className="mt-1 text-base font-bold text-[#80CBC4] lg:text-lg">
              {routeInfo.totalDistance}m · 약 {routeInfo.totalTime}분
              {routeInfo.stairs === 0 ? " · 계단 없음" : ` · 계단 ${routeInfo.stairs}개`}
            </p>
          )}
        </div>
      </div>

      {/* 출발지 선택 바 */}
      <div className="border-b border-[#E0E0E0] bg-[#F8F9FA] px-6 py-3 lg:px-7 lg:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-boyak-muted lg:text-sm">출발지</p>
            <p className="truncate text-base font-black text-boyak-ink lg:text-lg">{locLabel}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              className="rounded-lg border border-[#30343B] bg-white px-3 py-2 text-sm font-black text-boyak-ink lg:min-h-12 lg:px-5 lg:text-base"
              type="button"
              onClick={resetToGps}
            >
              현재 위치
            </button>
            <button
              className="rounded-lg bg-boyak-blue px-3 py-2 text-sm font-black text-white lg:min-h-12 lg:px-5 lg:text-base"
              type="button"
              onClick={() => setShowAddressInput((v) => !v)}
            >
              주소 변경
            </button>
          </div>
        </div>

        {showAddressInput && (
          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-lg border border-[#30343B] px-4 py-3 text-lg font-bold outline-none focus:border-boyak-blue lg:min-h-14 lg:text-lg"
              type="text"
              placeholder="주소나 장소 이름을 입력하세요"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddressSearch()}
            />
            <button
              className="rounded-lg bg-boyak-blue px-4 py-3 text-lg font-black text-white disabled:opacity-50 lg:min-h-14 lg:px-6 lg:text-lg"
              type="button"
              disabled={isGeocoding || !addressInput.trim()}
              onClick={handleAddressSearch}
            >
              {isGeocoding ? "..." : "검색"}
            </button>
          </div>
        )}
      </div>

      {/* 지도 */}
      {routeError ? (
        <div className="flex h-[320px] w-full items-center justify-center bg-[#EFF1F4] p-8 text-center lg:min-h-0 lg:flex-1">
          <p className="text-xl font-bold text-boyak-muted">{routeError}</p>
        </div>
      ) : (
        <div className={`relative w-full ${mapHeightClass}`}>
          <div ref={mapDivRef} className="h-full w-full" />
          {/* 확대/축소 토글 버튼 */}
          {!isLocating && !isRelocatingHospital && relocatedHospitals.length === 0 && (
            <button
              type="button"
              aria-label={isMapExpanded ? "지도 축소" : "지도 확대"}
              className="absolute bottom-3 right-3 z-[400] flex items-center gap-1 rounded-lg bg-white/90 px-3 py-2 text-sm font-black text-boyak-ink shadow-md backdrop-blur-sm transition hover:bg-white"
              onClick={() => setIsMapExpanded((v) => !v)}
            >
              {isMapExpanded ? "▼ 축소" : "▲ 확대"}
            </button>
          )}
          {isLocating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#EFF1F4]">
              <div className="size-12 animate-spin rounded-full border-4 border-[#C8DAF7] border-t-boyak-blue" aria-hidden="true" />
              <p className="text-lg font-black text-boyak-muted">위치를 확인하는 중이에요...</p>
            </div>
          )}
          {(isRelocatingHospital || relocatedHospitals.length > 0) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 backdrop-blur-sm">
              {isRelocatingHospital ? (
                <>
                  <div className="size-12 animate-spin rounded-full border-4 border-[#C8DAF7] border-t-boyak-blue" aria-hidden="true" />
                  <p className="text-lg font-black text-boyak-muted">근처 병원을 찾는 중이에요...</p>
                </>
              ) : (
                <>
                  <p className="text-4xl">📍</p>
                  <p className="text-xl font-black text-boyak-ink">아래에서 새 병원을 선택해주세요</p>
                  <p className="text-base font-bold text-boyak-muted">선택하면 경로가 다시 안내됩니다</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 하단 카드 */}
      <div className="p-6 lg:p-5">
        <div className="mb-4 flex items-start justify-between gap-3 lg:mb-3">
          <div>
            <p className="text-2xl font-black lg:text-2xl">
              {(isRelocatingHospital || relocatedHospitals.length > 0) ? "병원을 다시 선택해주세요" : hospital.name}
            </p>
            <p className="mt-1 text-lg font-bold text-boyak-muted lg:text-lg">
              {(isRelocatingHospital || relocatedHospitals.length > 0)
                ? "위치가 변경되었어요. 아래 목록에서 병원을 선택하세요"
                : `${hospital.floor ? `${hospital.floor}까지` : ""} 안전한 길 안내 중`}
            </p>
          </div>
          <p className="shrink-0 text-xl font-black text-boyak-blue lg:text-xl">
            {(isRelocatingHospital || relocatedHospitals.length > 0) ? "" : routeInfo ? `예상 도보 ${routeInfo.totalTime}분` : isLocating ? "위치 확인 중" : "계산 중..."}
          </p>
        </div>

        {routeInfo && (
          <div className="mb-4 flex flex-wrap gap-3 rounded-xl bg-[#f8f9fa] px-4 py-3 text-lg font-bold lg:px-5 lg:py-3 lg:text-lg">
            <span className="text-boyak-blue">{hospital.route || "평지 위주 경로"}</span>
            <span className={routeInfo.stairs === 0 ? "text-boyak-blue" : "text-boyak-muted"}>
              {routeInfo.stairs === 0 ? "계단 없음 ✓" : `계단 ${routeInfo.stairs}개`}
            </span>
            <span className="text-boyak-muted">({routeInfo.totalDistance}m)</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            className="min-h-[80px] rounded-2xl border-2 border-[#30343B] bg-white px-4 text-xl font-black lg:min-h-20 lg:text-xl"
            type="button"
            onClick={onArrive}
          >
            🔄 안내 종료
          </button>
          <button
            className={`min-h-[80px] rounded-2xl px-4 text-2xl font-black text-white transition lg:min-h-20 lg:text-2xl ${
              isTracking ? "bg-[#d32f2f]" : "bg-boyak-blue"
            } disabled:opacity-40`}
            type="button"
            onClick={isTracking ? stopTracking : startTracking}
            disabled={!!routeError || isLocating}
          >
            {isLocating ? "위치 확인 중..." : isTracking ? "⏹ 안내 정지" : "🚀 길안내 시작"}
          </button>
        </div>
      </div>

      {/* 위치 변경 후 근처 병원 선택 패널 */}
      {(isRelocatingHospital || relocatedHospitals.length > 0) && (
        <div className="border-t-2 border-boyak-line p-6 lg:p-8">
          <p className="mb-4 text-xl font-black text-boyak-blue lg:text-2xl">
            변경된 위치 근처 병원
          </p>
          {isRelocatingHospital ? (
            <div className="flex items-center gap-3 py-4">
              <div className="size-8 animate-spin rounded-full border-4 border-boyak-line border-t-boyak-blue" aria-hidden="true" />
              <p className="text-lg font-bold text-boyak-muted">근처 병원을 찾는 중이에요...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {relocatedHospitals.map((h) => (
                <button
                  key={h.name}
                  type="button"
                  className={`flex min-h-24 items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition active:scale-[0.98] lg:min-h-28 lg:px-6 ${
                    h.recommendedForWalking ? "border-boyak-blue bg-[#EDF4FF]" : "border-[#30343B] bg-white"
                  }`}
                  onClick={() => onRelocatedHospitalSelect?.(h)}
                >
                  <div>
                    <p className="text-xl font-black lg:text-2xl">{h.name}</p>
                    <p className="mt-1 text-base font-bold text-boyak-muted lg:text-lg">
                      {h.walk} · {h.route}
                      {h.isFlat ? " · 계단 없음" : h.stairs > 0 ? ` · 계단 ${h.stairs}개` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-xl px-3 py-2 text-base font-black lg:px-5 lg:py-3 lg:text-lg ${
                    h.recommendedForWalking ? "bg-boyak-blue text-white" : "bg-[#F5F5F5] text-boyak-muted"
                  }`}>
                    선택
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
