"use client";

import { memo, useState, useCallback, useRef } from "react";
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

// 음성에서 증상 키워드 추출 (확인 메시지 표시용)
const SYMPTOM_KEYWORDS = [
  "허리", "요통", "무릎", "어깨", "두통", "머리", "배", "소화", "기침", "가슴",
  "눈", "귀", "코", "목", "피부", "치아", "관절", "디스크", "척추", "발목",
];
function extractKeyword(text) {
  return SYMPTOM_KEYWORDS.find((kw) => text.includes(kw)) ?? null;
}

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
function SymptomSelectPanel({ selectedSymptom, onSelect, onSpeak }) {
  const [voicePhase, setVoicePhase] = useState("idle"); // "idle" | "listening" | "confirm"
  const [transcript, setTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const noSpeechTimerRef = useRef(null);
  const maxRecordingTimerRef = useRef(null);
  const speechDetectedRef = useRef(false);
  const speechRecognitionRef = useRef(null);

  const keyword = extractKeyword(transcript);
  const confirmMsg = keyword
    ? `${keyword} 통증에 맞는 병원을 찾아드릴까요?`
    : `"${transcript}" 증상으로 병원을 찾아드릴까요?`;

  const toggleVoice = useCallback(async () => {
    if (voicePhase === "listening") {
      return;
    }

    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setLiveTranscript("");

      // 무음 감지: 말이 끝나면 자동 정지
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      analyser.fftSize = 512;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      speechDetectedRef.current = false;

      const SPEECH_THRESHOLD = 15;
      const SILENCE_MS = 1200;
      const NO_SPEECH_MS = 4500;
      const MAX_RECORDING_MS = 10000;

      const checkSilence = () => {
        if (mediaRecorderRef.current?.state !== "recording") return;
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        if (avg > SPEECH_THRESHOLD) {
          speechDetectedRef.current = true;
          clearTimeout(noSpeechTimerRef.current);
          noSpeechTimerRef.current = null;
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        } else if (speechDetectedRef.current && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") {
              mediaRecorderRef.current.stop();
            }
          }, SILENCE_MS);
        }
        requestAnimationFrame(checkSilence);
      };
      requestAnimationFrame(checkSilence);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "ko-KR";
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = (event) => {
          const spokenText = Array.from(event.results)
            .map((result) => result[0]?.transcript ?? "")
            .join("")
            .trim();
          setLiveTranscript(spokenText);
        };
        recognition.onerror = () => {};
        speechRecognitionRef.current = recognition;
        try {
          recognition.start();
        } catch {
          speechRecognitionRef.current = null;
        }
      }
      noSpeechTimerRef.current = setTimeout(() => {
        if (!speechDetectedRef.current && mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, NO_SPEECH_MS);
      maxRecordingTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORDING_MS);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
        clearTimeout(noSpeechTimerRef.current);
        noSpeechTimerRef.current = null;
        clearTimeout(maxRecordingTimerRef.current);
        maxRecordingTimerRef.current = null;
        speechRecognitionRef.current?.stop();
        speechRecognitionRef.current = null;
        audioContextRef.current?.close();
        audioContextRef.current = null;
        stream.getTracks().forEach((track) => track.stop());

        setVoicePhase("idle");
        onSpeak("목소리를 분석하고 있어요. 잠시만 기다려주세요.");
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");

        try {
          const res = await fetch(`${API_BASE_URL}/api/ai/stt`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.ok && data.text) {
            const spokenText = data.text.trim();
            setTranscript(spokenText);
            setLiveTranscript("");
            setTimeout(() => onSelect(spokenText), 650);
          } else {
            onSpeak("음성 분석에 실패했어요. 다시 시도해 주세요.");
          }
        } catch (e) {
          onSpeak("서버 오류가 발생했어요. 다시 시도해 주세요.");
        }
      };

      mediaRecorder.start();
      setVoicePhase("listening");
      setTranscript("");
      setLiveTranscript("");
    } catch (e) {
      onSpeak("마이크 접근 권한이 없거나 지원하지 않는 기기입니다.");
    }
  }, [voicePhase, onSpeak, onSelect]);

  const handleConfirm = () => onSelect(transcript);
  const handleRetry = () => {
    setVoicePhase("idle");
    setTranscript("");
  };

  // ── 확인 화면 ──
  if (voicePhase === "confirm") {
    return (
      <div className="mx-auto flex w-full flex-col rounded-[30px] border-2 border-boyak-line bg-white px-7 py-8 shadow-soft sm:px-9 sm:py-10 lg:px-8 lg:py-8">
        <p className="mb-3 text-xl font-black text-boyak-muted lg:text-lg">제가 들은 내용</p>
        <div className="mb-7 rounded-2xl bg-[#F0F7FF] px-6 py-5 text-3xl font-black text-boyak-blue lg:mb-5 lg:text-2xl">
          &ldquo;{transcript}&rdquo;
        </div>
        <p className="mb-8 text-3xl font-black leading-relaxed sm:text-4xl lg:mb-5 lg:text-2xl">
          {confirmMsg}
        </p>
        <div className="grid grid-cols-2 gap-4 lg:gap-3">
          <button
            className="min-h-[96px] rounded-2xl border-2 border-[#30343B] bg-white text-3xl font-black transition active:scale-[0.98] lg:min-h-24 lg:text-2xl"
            type="button"
            onClick={handleRetry}
          >
            아니오
          </button>
          <button
            className="min-h-[96px] rounded-2xl bg-boyak-blue text-3xl font-black text-white transition active:scale-[0.98] lg:min-h-24 lg:text-2xl"
            type="button"
            onClick={handleConfirm}
          >
            네, 찾아주세요
          </button>
        </div>
      </div>
    );
  }

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
          voicePhase === "listening"
            ? "border-boyak-blue bg-[#EDF4FF] text-boyak-blue"
            : "border-[#30343B] bg-white"
        }`}
        type="button"
        onClick={toggleVoice}
        disabled={voicePhase === "listening"}
      >
        <Mic
          className={`size-14 lg:size-10 ${voicePhase === "listening" ? "animate-pulse text-boyak-blue" : "text-boyak-muted"}`}
          strokeWidth={2.4}
          aria-hidden="true"
        />
        {voicePhase === "listening" ? (liveTranscript || "듣는 중...") : "말하기"}
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
}) {
  const [isLocationListening, setIsLocationListening] = useState(false);
  const [isLocationTranscribing, setIsLocationTranscribing] = useState(false);
  const locationRecorderRef = useRef(null);
  const locationChunksRef = useRef([]);
  const locationTimerRef = useRef(null);
  const locationSilenceTimerRef = useRef(null);
  const locationAudioContextRef = useRef(null);
  const locationAnimationFrameRef = useRef(null);
  const locationSpeechDetectedRef = useRef(false);
  const locationVoiceSessionRef = useRef(0);

  const stopLocationVoiceInput = useCallback((ignoreResult = false) => {
    if (ignoreResult) locationVoiceSessionRef.current += 1;
    if (locationTimerRef.current) {
      clearTimeout(locationTimerRef.current);
      locationTimerRef.current = null;
    }
    if (locationSilenceTimerRef.current) {
      clearTimeout(locationSilenceTimerRef.current);
      locationSilenceTimerRef.current = null;
    }
    if (locationAnimationFrameRef.current) {
      cancelAnimationFrame(locationAnimationFrameRef.current);
      locationAnimationFrameRef.current = null;
    }
    if (locationRecorderRef.current?.state === "recording") {
      locationRecorderRef.current.stop();
      return;
    }
    locationAudioContextRef.current?.close();
    locationAudioContextRef.current = null;
  }, []);

  const searchTypedLocation = useCallback(() => {
    stopLocationVoiceInput(true);
    onSearchLocation?.();
  }, [onSearchLocation, stopLocationVoiceInput]);

  const handleLocationVoiceInput = useCallback(async () => {
    if (isLocationListening) {
      stopLocationVoiceInput();
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("unsupported");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 512;
      const audioBuffer = new Uint8Array(analyser.frequencyBinCount);
      audioContext.createMediaStreamSource(stream).connect(analyser);
      locationRecorderRef.current = recorder;
      locationAudioContextRef.current = audioContext;
      locationChunksRef.current = [];
      locationSpeechDetectedRef.current = false;
      const voiceSessionId = locationVoiceSessionRef.current + 1;
      locationVoiceSessionRef.current = voiceSessionId;

      const checkSpeechEnd = () => {
        if (recorder.state !== "recording") return;

        analyser.getByteFrequencyData(audioBuffer);
        const averageVolume = audioBuffer.reduce((sum, value) => sum + value, 0) / audioBuffer.length;

        if (averageVolume > 15) {
          locationSpeechDetectedRef.current = true;
          if (locationSilenceTimerRef.current) {
            clearTimeout(locationSilenceTimerRef.current);
            locationSilenceTimerRef.current = null;
          }
        } else if (locationSpeechDetectedRef.current && !locationSilenceTimerRef.current) {
          locationSilenceTimerRef.current = setTimeout(stopLocationVoiceInput, 1300);
        }

        locationAnimationFrameRef.current = requestAnimationFrame(checkSpeechEnd);
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) locationChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        if (locationTimerRef.current) {
          clearTimeout(locationTimerRef.current);
          locationTimerRef.current = null;
        }
        if (locationSilenceTimerRef.current) {
          clearTimeout(locationSilenceTimerRef.current);
          locationSilenceTimerRef.current = null;
        }
        if (locationAnimationFrameRef.current) {
          cancelAnimationFrame(locationAnimationFrameRef.current);
          locationAnimationFrameRef.current = null;
        }
        locationAudioContextRef.current?.close();
        locationAudioContextRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        setIsLocationListening(false);
        if (voiceSessionId !== locationVoiceSessionRef.current) {
          locationRecorderRef.current = null;
          return;
        }
        setIsLocationTranscribing(true);

        try {
          const audioBlob = new Blob(locationChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", audioBlob, "location.webm");

          const response = await fetch(`${API_BASE_URL}/api/ai/stt`, {
            method: "POST",
            body: formData,
          });
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
          locationRecorderRef.current = null;
        }
      };

      recorder.start();
      setIsLocationListening(true);
      locationAnimationFrameRef.current = requestAnimationFrame(checkSpeechEnd);
      locationTimerRef.current = setTimeout(stopLocationVoiceInput, 10000);
    } catch {
      setIsLocationListening(false);
      onSpeak?.("마이크 권한이 없어서 음성 입력을 사용할 수 없어요.");
    }
  }, [isLocationListening, onLocationQueryChange, onSearchLocation, onSpeak, stopLocationVoiceInput]);

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
