"use client";

import { memo, useState, useCallback } from "react";
import {
  Building2,
  CheckCircle,
  MapPin,
  Mic,
  Navigation,
  Star,
} from "lucide-react";

import { API_BASE_URL, hospitalFlowSteps, hospitalStepKeys, nearbyHospitals, symptomOptions } from "../constants";
import BackButton from "./BackButton";
import StepHeader from "./StepHeader";
import FlowPanel from "./FlowPanel";
import NavigationMap from "./NavigationMap";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";

function HospitalFlowScreen({
  step,
  selectedSymptom,
  hospital,
  hospitals = [],
  department = "",
  isLoading = false,
  loadingMessage = "",
  locationStatus = null,
  locationQuery = "",
  isAddressSearching = false,
  onBack,
  onGoHome,
  onStepChange,
  onSelectSymptom,
  onSelectHospital,
  onLocationQueryChange,
  onRetryLocation,
  onSearchLocation,
  onSpeak,
  onStopSpeak,
  onLocationChange,
  relocatedHospitals = [],
  isRelocatingHospital = false,
  onRelocatedHospitalSelect,
}) {
  const currentIndex = hospitalStepKeys.indexOf(step);
  const currentStepLabel = hospitalFlowSteps[currentIndex] ?? hospitalFlowSteps[0];
  const displayHospitals = isLoading ? [] : (hospitals.length > 0 ? hospitals : nearbyHospitals);
  const recommendedDepartment =
    department || (selectedSymptom === "두통" ? "신경과 또는 가정의학과" : "정형외과 또는 통증의학과");

  return (
    <section className="flex w-full flex-1 flex-col lg:min-h-0" aria-labelledby="hospital-flow-title">
      <BackButton onClick={onBack} />
      <div className="mb-8 flex flex-wrap items-center gap-4 text-boyak-blue lg:mb-2 lg:gap-3">
        <span className="grid size-14 place-items-center rounded-full bg-boyak-blue text-white lg:size-10">
          <MapPin className="size-9 lg:size-6" aria-hidden="true" />
        </span>
        <h1 id="hospital-flow-title" className="text-3xl font-black leading-tight sm:text-4xl lg:text-2xl">
          길찾기 병원·약국 추천 흐름
        </h1>
      </div>

      {/* Mobile step indicator */}
      <div className="mb-6 rounded-2xl border border-[#C8DAF7] bg-[#EDF4FF] p-4 md:hidden" aria-label="현재 길찾기 단계">
        <p className="text-base font-black text-boyak-muted">현재 진행 단계</p>
        <p className="mt-1 text-2xl font-black text-boyak-blue">
          {currentIndex + 1} / {hospitalFlowSteps.length} {currentStepLabel}
        </p>
      </div>

      {/* Desktop step bar */}
      <div className="mb-8 hidden w-full shrink-0 gap-3 md:grid md:grid-cols-5 lg:mb-4 lg:gap-2" aria-label="길찾기 단계">
        {hospitalFlowSteps.map((label, index) => (
          <div
            key={label}
            className={`flex min-h-16 w-full items-center justify-center rounded-2xl border px-4 text-center text-base font-black leading-tight lg:min-h-12 lg:px-3 lg:text-base xl:min-h-14 xl:text-lg ${
              index <= currentIndex
                ? "border-boyak-blue bg-[#EDF4FF] text-boyak-blue"
                : "border-boyak-line bg-white text-boyak-muted"
            }`}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            <span className="mr-2 inline-grid size-7 shrink-0 place-items-center rounded-full bg-boyak-blue text-sm text-white lg:size-6 lg:text-sm xl:size-7">
              {index + 1}
            </span>
            {label}
          </div>
        ))}
      </div>

      {step === "input" && (
        <SymptomSelectPanel
          selectedSymptom={selectedSymptom}
          onSelect={onSelectSymptom}
          onSpeak={onSpeak}
          onStopSpeak={onStopSpeak}
        />
      )}

      {step === "results" && (
        <HospitalResultsPanel
          hospitals={displayHospitals}
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          locationStatus={locationStatus}
          locationQuery={locationQuery}
          isAddressSearching={isAddressSearching}
          symptom={selectedSymptom}
          department={recommendedDepartment}
          onSelectHospital={onSelectHospital}
          onLocationQueryChange={onLocationQueryChange}
          onRetryLocation={onRetryLocation}
          onSearchLocation={onSearchLocation}
          onSpeak={onSpeak}
          onStopSpeak={onStopSpeak}
        />
      )}

      {step === "select" && (
        <HospitalSelectPanel hospital={hospital} onStepChange={onStepChange} onSpeak={onSpeak} />
      )}

      {step === "route" && (
        <NavigationMap
          hospital={hospital}
          onArrive={() => onStepChange("arrived")}
          onSpeak={onSpeak}
          onLocationChange={onLocationChange}
          relocatedHospitals={relocatedHospitals}
          isRelocatingHospital={isRelocatingHospital}
          onRelocatedHospitalSelect={onRelocatedHospitalSelect}
        />
      )}

      {step === "arrived" && (
        <div className="flex min-h-0 flex-1">
          <FlowPanel
            className="flex-1 justify-center"
            icon={<CheckCircle className="size-14 text-boyak-blue" aria-hidden="true" />}
            title="도착했어요"
            body="도착 안내와 함께 길안내 만족도를 남길 수 있는 화면입니다."
            primaryLabel="처음으로"
            onPrimary={onGoHome ?? onBack}
          />
        </div>
      )}
    </section>
  );
}

// ─── 증상 입력 패널 ────────────────────────────────────────────────────────────
function SymptomSelectPanel({ selectedSymptom, onSelect, onSpeak, onStopSpeak }) {
  const handleVoiceResult = useCallback(async (blob, interim, speechDetected) => {
    const browserText = interim.trim();

    // 발화가 전혀 감지되지 않았고 자막도 없으면, 다음 화면으로 넘기지 않고 다시 요청한다
    if (!speechDetected && !browserText) {
      onSpeak("음성이 들리지 않았어요. 다시 한번 말씀해 주세요.");
      return;
    }

    // 실시간 자막이 이미 있으면 "분석 중" 안내는 생략한다(곧 화면이 넘어가 안내가 겹침)
    if (!browserText) {
      onSpeak("목소리를 분석하고 있어요. 잠시만 기다려주세요.");
    }

    const formData = new FormData();
    formData.append("file", blob, "recording.webm");
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/stt`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok && data.text) {
        setTimeout(() => onSelect(data.text.trim()), 650);
        return;
      }
      if (browserText) {
        setTimeout(() => onSelect(browserText), 650);
      } else {
        onSpeak("음성 분석에 실패했어요. 다시 시도해 주세요.");
      }
    } catch {
      if (browserText) {
        setTimeout(() => onSelect(browserText), 650);
      } else {
        onSpeak("서버 오류가 발생했어요. 다시 시도해 주세요.");
      }
    }
  }, [onSelect, onSpeak]);

  const handleVoiceError = useCallback(() => {
    onSpeak("마이크 접근 권한이 없거나 지원하지 않는 기기입니다.");
  }, [onSpeak]);

  const { isRecording, interimText, start: toggleVoice } = useVoiceRecorder({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
    onStart: onStopSpeak,
    silenceMs: 1200,
    noSpeechMs: 4500,
    maxMs: 10000,
    liveTranscript: true,
  });

  // ── 기본 입력 화면 ──
  return (
    <div className="mx-auto flex w-full flex-col rounded-[30px] border-2 border-boyak-line bg-white px-7 py-8 shadow-soft sm:px-9 sm:py-10 lg:min-h-[430px] lg:px-8 lg:py-7 xl:min-h-[470px] xl:px-10 xl:py-8">
      <div className="mb-8 flex items-start justify-between gap-4 lg:mb-5">
        <h2 className="text-3xl font-black leading-tight text-boyak-ink sm:text-4xl lg:text-3xl xl:text-4xl">
          어디가 불편하신가요?
        </h2>
      </div>

      {/* 큰 말하기 버튼 */}
      <button
        className={`mb-7 flex min-h-[150px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 px-8 text-3xl font-black transition active:scale-[0.99] sm:text-4xl lg:mb-5 lg:min-h-[128px] lg:gap-3 lg:text-3xl xl:min-h-[146px] xl:text-4xl ${
          isRecording
            ? "border-boyak-blue bg-[#EDF4FF] text-boyak-blue"
            : "border-[#30343B] bg-white"
        }`}
        type="button"
        onClick={toggleVoice}
        disabled={isRecording}
      >
        <Mic
          className={`size-14 lg:size-10 ${isRecording ? "animate-pulse text-boyak-blue" : "text-boyak-muted"}`}
          strokeWidth={2.4}
          aria-hidden="true"
        />
        {isRecording ? (interimText || "듣는 중...") : "말하기"}
      </button>

      {/* 구분선 */}
      <div className="mb-5 flex items-center gap-3 lg:mb-4">
        <div className="h-px flex-1 bg-boyak-line" />
        <span className="text-lg font-bold text-boyak-muted lg:text-xl">또는 바로 선택</span>
        <div className="h-px flex-1 bg-boyak-line" />
      </div>

      {/* 빠른 선택 버튼 */}
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:gap-3 xl:gap-4" aria-label="증상 빠른 선택">
        {symptomOptions.map((symptom) => {
          const isSelected = selectedSymptom === symptom;
          return (
            <button
              key={symptom}
              className={`min-h-24 rounded-2xl border-2 px-4 text-2xl font-black shadow-sm transition active:scale-[0.98] sm:min-h-28 sm:text-3xl lg:min-h-[92px] lg:text-3xl xl:min-h-[104px] xl:text-4xl ${
                isSelected
                  ? "border-boyak-blue bg-[#EDF4FF] text-boyak-blue"
                  : "border-[#30343B] bg-white text-boyak-ink"
              }`}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(symptom)}
            >
              {symptom}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── 병원 결과 패널 ────────────────────────────────────────────────────────────
function HospitalResultsPanel({
  hospitals,
  isLoading,
  loadingMessage,
  locationQuery,
  isAddressSearching,
  department,
  onSelectHospital,
  onLocationQueryChange,
  onRetryLocation,
  onSearchLocation,
  onSpeak,
  onStopSpeak,
}) {
  const [isLocationTranscribing, setIsLocationTranscribing] = useState(false);

  const handleLocationResult = useCallback(async (blob) => {
    setIsLocationTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "location.webm");
      const response = await fetch(`${API_BASE_URL}/api/ai/stt`, { method: "POST", body: formData });
      const data = await response.json();
      const spokenQuery = data.text?.trim();
      if (!response.ok || !data.ok || !spokenQuery) {
        throw new Error("음성으로 주소를 듣지 못했어요. 다시 말해주세요.");
      }
      onLocationQueryChange?.(spokenQuery);
      onSearchLocation?.(spokenQuery);
    } catch (error) {
      onSpeak?.(error.message || "음성으로 주소를 듣지 못했어요. 다시 말해주세요.");
    } finally {
      setIsLocationTranscribing(false);
    }
  }, [onLocationQueryChange, onSearchLocation, onSpeak]);

  const handleLocationError = useCallback(() => {
    onSpeak?.("마이크 권한이 없어서 음성 입력을 사용할 수 없어요.");
  }, [onSpeak]);

  const {
    isRecording: isLocationListening,
    start: startLocationVoiceInput,
    stop: stopLocationVoiceInput,
  } = useVoiceRecorder({
    onResult: handleLocationResult,
    onError: handleLocationError,
    onStart: onStopSpeak,
    silenceMs: 1300,
    maxMs: 10000,
    liveTranscript: false,
  });

  const searchTypedLocation = useCallback(() => {
    stopLocationVoiceInput(true);
    onSearchLocation?.();
  }, [onSearchLocation, stopLocationVoiceInput]);

  const handleLocationVoiceInput = useCallback(() => {
    if (isLocationListening) {
      stopLocationVoiceInput();
      return;
    }
    startLocationVoiceInput();
  }, [isLocationListening, startLocationVoiceInput, stopLocationVoiceInput]);

  return (
    <div className="mx-auto flex w-full flex-1 flex-col rounded-[30px] border-2 border-boyak-line bg-white px-7 py-6 shadow-soft sm:px-9 sm:py-8 lg:min-h-0 lg:px-8 lg:py-5">
      <div className="mb-5 flex items-start justify-between gap-4 lg:mb-3 lg:gap-3">
        <h2 className="text-3xl font-black leading-tight sm:text-4xl lg:text-2xl">
          {isLoading ? (loadingMessage || "가까운 병원을 찾고 있어요.") : `${department}를 추천해요.`}
        </h2>
      </div>

      <div className="mb-4 grid gap-2 rounded-2xl border border-boyak-line bg-[#F8FAFC] p-3 lg:mb-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <button
          className="min-h-12 rounded-xl border-2 border-boyak-blue bg-white px-4 text-lg font-black text-boyak-blue transition active:scale-[0.98] disabled:opacity-50 lg:min-h-11 lg:text-base"
          type="button"
          disabled={isLoading || isAddressSearching || isLocationListening || isLocationTranscribing}
          onClick={onRetryLocation}
        >
          현재 위치 다시 확인
        </button>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            className="min-h-12 rounded-xl border-2 border-boyak-line bg-white px-4 text-lg font-bold outline-none focus:border-boyak-blue disabled:opacity-60 lg:min-h-11 lg:text-base"
            type="text"
            placeholder="주소나 장소 이름 입력"
            value={locationQuery}
            disabled={isLoading || isAddressSearching || isLocationListening || isLocationTranscribing}
            onChange={(event) => onLocationQueryChange?.(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                searchTypedLocation();
              }
            }}
          />
          <button
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 px-4 text-lg font-black transition active:scale-[0.98] disabled:opacity-50 lg:min-h-11 lg:text-base ${
              isLocationListening
                ? "border-boyak-blue bg-boyak-blue text-white"
                : "border-boyak-blue bg-white text-boyak-blue"
            }`}
            type="button"
            disabled={isLoading || isAddressSearching || isLocationTranscribing}
            onClick={handleLocationVoiceInput}
            aria-label="주소나 장소 이름 음성 입력"
          >
            <Mic className={`size-6 ${isLocationListening ? "animate-pulse" : ""}`} aria-hidden="true" />
            {isLocationListening ? "듣는 중" : isLocationTranscribing ? "확인 중" : "말하기"}
          </button>
        </div>
        <button
          className="min-h-12 rounded-xl bg-boyak-blue px-5 text-lg font-black text-white transition active:scale-[0.98] disabled:opacity-50 lg:min-h-11 lg:text-base"
          type="button"
          disabled={isLoading || isAddressSearching || isLocationListening || isLocationTranscribing || !locationQuery.trim()}
          onClick={searchTypedLocation}
        >
          {isAddressSearching ? "검색 중" : "이 위치로 찾기"}
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
          <div className="size-14 animate-spin rounded-full border-4 border-boyak-line border-t-boyak-blue" aria-hidden="true" />
          <p className="text-xl font-black text-boyak-muted">{loadingMessage || "가까운 병원을 찾는 중이에요..."}</p>
        </div>
      )}

      <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:gap-4">
        {!isLoading && hospitals.map((h, index) => (
          <article
            key={h.name}
            className={`rounded-3xl border-2 bg-white p-6 lg:flex lg:flex-col lg:p-4 ${
              h.recommendedForWalking ? "border-boyak-blue" : "border-[#30343B]"
            }`}
          >
            <div className="mb-5 flex items-start justify-between gap-4 lg:mb-3 lg:gap-3">
              <div>
                {h.recommendedForWalking ? (
                  <p className="mb-2 inline-flex items-center gap-1 rounded-lg bg-boyak-blue px-3 py-1 text-base font-black text-white lg:mb-1 lg:text-sm">
                    <Star className="size-4" fill="currentColor" aria-hidden="true" />
                    보행자 맞춤 추천
                  </p>
                ) : (
                  <p className="mb-2 text-lg font-black text-boyak-muted lg:mb-1 lg:text-base">
                    도보 거리순 {index + 1}위
                  </p>
                )}
                <h3 className="text-3xl font-black leading-tight lg:text-2xl">
                  {h.name}
                  <span className="mt-2 block text-xl text-boyak-muted lg:text-base">{h.department}</span>
                </h3>
              </div>
              {!h.recommendedForWalking && (
                <span className="shrink-0 rounded-xl bg-[#F5F5F5] px-4 py-2 text-lg font-black text-boyak-muted lg:px-3 lg:py-2 lg:text-sm">
                  {h.status}
                </span>
              )}
            </div>
            <div className="mb-5 grid gap-3 text-xl font-extrabold lg:mb-4 lg:gap-2 lg:text-base">
              <p className="inline-flex items-center gap-3">
                <Navigation className="size-7 text-boyak-muted lg:size-5" aria-hidden="true" />
                {h.walk} ({h.distance})
              </p>
              <p className="inline-flex items-center gap-3">
                <MapPin className="size-7 text-boyak-muted lg:size-5" aria-hidden="true" />
                {h.route}
                {h.stairs !== undefined && (
                  <span className={`ml-1 text-lg lg:text-sm ${h.isFlat ? "text-boyak-blue" : "text-boyak-muted"}`}>
                    {h.isFlat ? "· 계단 없음" : `· 계단 ${h.stairs}개`}
                  </span>
                )}
              </p>
            </div>
            <button
              className={`min-h-20 w-full rounded-2xl px-6 text-2xl font-black text-white lg:mt-auto lg:min-h-24 lg:text-2xl ${
                h.recommendedForWalking ? "bg-boyak-blue" : "bg-[#5B616B]"
              }`}
              type="button"
              onClick={() => onSelectHospital(index)}
            >
              이 병원 선택
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

// ─── 병원 선택 패널 ────────────────────────────────────────────────────────────
function HospitalSelectPanel({ hospital, onStepChange, onSpeak }) {
  return (
    <div className="mx-auto flex w-full flex-1 flex-col rounded-[30px] border-2 border-boyak-line bg-white px-7 py-8 shadow-soft sm:px-9 sm:py-10 lg:min-h-0 lg:px-8 lg:py-8">
      <StepHeader
        icon={<Building2 className="size-12 text-boyak-blue" />}
        title="병원을 선택했어요"
      />
      <article className="rounded-3xl border-2 border-[#30343B] bg-white p-7 lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:p-5">
        <p className="mb-3 text-xl font-black text-boyak-blue lg:mb-2 lg:text-lg">{hospital.department}</p>
        <h2 className="mb-5 text-4xl font-black leading-tight lg:mb-3 lg:text-3xl">{hospital.name}</h2>
        <p className="text-2xl font-extrabold text-boyak-muted lg:text-lg">
          {hospital.walk} ({hospital.distance}) · {hospital.route}
        </p>
        {hospital.stairs !== undefined && (
          <p className={`mt-3 text-xl font-bold lg:text-base ${hospital.isFlat ? "text-boyak-blue" : "text-boyak-muted"}`}>
            {hospital.isFlat ? "✓ 계단 없는 평지 경로" : `계단 ${hospital.stairs}개 포함`}
          </p>
        )}
        <p className="mt-4 inline-flex rounded-xl bg-[#EDF4FF] px-5 py-3 text-xl font-black text-boyak-blue lg:mt-3 lg:px-4 lg:py-2 lg:text-base">
          {hospital.status}
        </p>
      </article>
      <button
        className="mt-6 min-h-[96px] w-full rounded-2xl bg-boyak-blue px-7 text-3xl font-black text-white lg:mt-6 lg:min-h-24 lg:text-3xl"
        type="button"
        onClick={() => {
          onStepChange("route");
          onSpeak(`${hospital.name}까지 길안내를 시작합니다.`);
        }}
      >
        길안내 시작
      </button>
    </div>
  );
}

export default memo(HospitalFlowScreen);
