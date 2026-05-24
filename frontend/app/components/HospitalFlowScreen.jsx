"use client";

import { memo, useState, useCallback, useRef } from "react";
import {
  Building2,
  CheckCircle,
  MapPin,
  Mic,
  Navigation,
  Volume2,
  Star,
} from "lucide-react";

import { hospitalFlowSteps, hospitalStepKeys, nearbyHospitals, symptomOptions } from "../constants";
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
  onBack,
  onStepChange,
  onSelectSymptom,
  onSelectHospital,
  onSpeak,
}) {
  const currentIndex = hospitalStepKeys.indexOf(step);
  const currentStepLabel = hospitalFlowSteps[currentIndex] ?? hospitalFlowSteps[0];
  const displayHospitals = hospitals.length > 0 ? hospitals : nearbyHospitals;
  const recommendedDepartment =
    department || (selectedSymptom === "두통" ? "신경과 또는 가정의학과" : "정형외과 또는 통증의학과");

  return (
    <section aria-labelledby="hospital-flow-title">
      <BackButton onClick={onBack} />
      <div className="mb-8 flex flex-wrap items-center gap-4 text-boyak-green lg:mb-3 lg:gap-3">
        <span className="grid size-14 place-items-center rounded-full bg-boyak-green text-white lg:size-10">
          <MapPin className="size-9 lg:size-6" aria-hidden="true" />
        </span>
        <h1 id="hospital-flow-title" className="text-3xl font-black leading-tight sm:text-4xl lg:text-2xl">
          길찾기 병원·약국 추천 흐름
        </h1>
        <button
          className="ml-auto grid size-16 place-items-center rounded-full text-boyak-ink lg:size-11"
          type="button"
          aria-label="길찾기 흐름 음성 안내 듣기"
          onClick={() =>
            onSpeak("증상을 말하거나 선택하면 진료과를 추천하고, 계단이 없는 평지 경로 위주로 가까운 병원을 안내합니다.")
          }
        >
          <Volume2 className="size-11 lg:size-8" strokeWidth={2.3} aria-hidden="true" />
        </button>
      </div>

      {/* Mobile step indicator */}
      <div className="mb-6 rounded-2xl border border-[#BFE5CB] bg-[#EDF9F1] p-4 md:hidden" aria-label="현재 길찾기 단계">
        <p className="text-base font-black text-boyak-muted">현재 진행 단계</p>
        <p className="mt-1 text-2xl font-black text-boyak-green">
          {currentIndex + 1} / {hospitalFlowSteps.length} {currentStepLabel}
        </p>
      </div>

      {/* Desktop step bar */}
      <div className="mb-8 hidden gap-3 md:grid md:grid-cols-5 lg:mb-3 lg:gap-2" aria-label="길찾기 단계">
        {hospitalFlowSteps.map((label, index) => (
          <button
            key={label}
            className={`min-h-16 rounded-2xl border px-3 text-base font-black lg:min-h-11 lg:rounded-xl lg:px-2 lg:text-sm ${
              index <= currentIndex
                ? "border-boyak-green bg-[#EDF9F1] text-boyak-green"
                : "border-boyak-line bg-white text-boyak-muted"
            }`}
            type="button"
            onClick={() => onStepChange(hospitalStepKeys[index])}
          >
            <span className="mr-2 inline-grid size-7 place-items-center rounded-full bg-boyak-green text-sm text-white lg:size-5 lg:text-xs">
              {index + 1}
            </span>
            {label}
          </button>
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
          symptom={selectedSymptom}
          department={recommendedDepartment}
          onSelectHospital={onSelectHospital}
          onSpeak={() =>
            onSpeak(
              `${selectedSymptom ?? "입력한 증상"}에는 ${recommendedDepartment}를 추천합니다. 계단이 없는 평지 경로 위주로 가장 가기 편한 병원을 첫 번째로 보여드려요.`
            )
          }
        />
      )}

      {step === "select" && (
        <HospitalSelectPanel hospital={hospital} onStepChange={onStepChange} onSpeak={onSpeak} />
      )}

      {step === "route" && (
        <NavigationMap hospital={hospital} onArrive={() => onStepChange("arrived")} onSpeak={onSpeak} />
      )}

      {step === "arrived" && (
        <FlowPanel
          icon={<CheckCircle className="size-14 text-boyak-green" aria-hidden="true" />}
          title="도착했어요"
          body="도착 안내와 함께 길안내 만족도를 남길 수 있는 화면입니다."
          primaryLabel="처음으로"
          onPrimary={onBack}
          onSpeak={() => onSpeak("목적지에 도착했어요. 길안내가 편했는지 평가해주세요.")}
        />
      )}
    </section>
  );
}

// ─── 증상 입력 패널 ────────────────────────────────────────────────────────────
function SymptomSelectPanel({ selectedSymptom, onSelect, onSpeak }) {
  const [voicePhase, setVoicePhase] = useState("idle"); // "idle" | "listening" | "confirm"
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const speechDetectedRef = useRef(false);

  const keyword = extractKeyword(transcript);
  const confirmMsg = keyword
    ? `${keyword} 통증에 맞는 병원을 찾아드릴까요?`
    : `"${transcript}" 증상으로 병원을 찾아드릴까요?`;

  const toggleVoice = useCallback(async () => {
    if (voicePhase === "listening") {
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      return;
    }

    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // 무음 감지: 말이 끝나면 자동 정지
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      analyser.fftSize = 512;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      speechDetectedRef.current = false;

      const SPEECH_THRESHOLD = 15;
      const SILENCE_MS = 1500;

      const checkSilence = () => {
        if (mediaRecorderRef.current?.state !== "recording") return;
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        if (avg > SPEECH_THRESHOLD) {
          speechDetectedRef.current = true;
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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
        audioContextRef.current?.close();
        audioContextRef.current = null;
        stream.getTracks().forEach((track) => track.stop());

        setVoicePhase("idle");
        onSpeak("목소리를 분석하고 있어요. 잠시만 기다려주세요.");
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");

        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001";
          const res = await fetch(`${API_BASE_URL}/api/ai/stt`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.ok && data.text) {
            setTranscript(data.text);
            setVoicePhase("confirm");
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
    } catch (e) {
      onSpeak("마이크 접근 권한이 없거나 지원하지 않는 기기입니다.");
    }
  }, [voicePhase, onSpeak]);

  const handleConfirm = () => onSelect(transcript);
  const handleRetry = () => {
    setVoicePhase("idle");
    setTranscript("");
  };

  // ── 확인 화면 ──
  if (voicePhase === "confirm") {
    return (
      <div className="mx-auto max-w-[560px] rounded-[30px] border-2 border-boyak-line bg-white px-7 py-8 shadow-soft sm:px-9 sm:py-10 lg:max-w-[720px] lg:px-6 lg:py-6">
        <p className="mb-3 text-xl font-black text-boyak-muted lg:text-lg">제가 들은 내용</p>
        <div className="mb-7 rounded-2xl bg-[#F0F7FF] px-6 py-5 text-3xl font-black text-boyak-blue lg:mb-5 lg:text-2xl">
          &ldquo;{transcript}&rdquo;
        </div>
        <p className="mb-8 text-3xl font-black leading-relaxed sm:text-4xl lg:mb-5 lg:text-2xl">
          {confirmMsg}
        </p>
        <div className="grid grid-cols-2 gap-4 lg:gap-3">
          <button
            className="min-h-[96px] rounded-2xl border-2 border-[#30343B] bg-white text-3xl font-black transition active:scale-[0.98] lg:min-h-14 lg:text-xl"
            type="button"
            onClick={handleRetry}
          >
            아니오
          </button>
          <button
            className="min-h-[96px] rounded-2xl bg-boyak-green text-3xl font-black text-white transition active:scale-[0.98] lg:min-h-14 lg:text-xl"
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
    <div className="mx-auto max-w-[560px] rounded-[30px] border-2 border-boyak-line bg-white px-7 py-8 shadow-soft sm:px-9 sm:py-10 lg:max-w-[720px] lg:px-6 lg:py-5">
      <div className="mb-8 flex items-start justify-between gap-4 lg:mb-5">
        <h2 className="text-3xl font-black leading-relaxed sm:text-4xl lg:text-2xl">
          어디가 불편하신가요?
        </h2>
        <button
          className="grid size-16 shrink-0 place-items-center rounded-full text-boyak-ink lg:size-11"
          type="button"
          aria-label="안내 듣기"
          onClick={() => onSpeak("어디가 불편하신가요? 말하기 버튼을 누르고 자유롭게 말씀해 주세요.")}
        >
          <Volume2 className="size-11 lg:size-8" strokeWidth={2.3} aria-hidden="true" />
        </button>
      </div>

      {/* 큰 말하기 버튼 */}
      <button
        className={`mb-6 flex min-h-[150px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 px-8 text-3xl font-black transition active:scale-[0.99] lg:mb-4 lg:min-h-20 lg:gap-2 lg:text-xl ${
          voicePhase === "listening"
            ? "border-boyak-green bg-[#EDF9F1] text-boyak-green"
            : "border-[#30343B] bg-white"
        }`}
        type="button"
        onClick={toggleVoice}
      >
        <Mic
          className={`size-14 lg:size-8 ${voicePhase === "listening" ? "animate-pulse text-boyak-green" : "text-boyak-muted"}`}
          strokeWidth={2.4}
          aria-hidden="true"
        />
        {voicePhase === "listening" ? "듣는 중... (완료 시 한 번 더 누르세요)" : "말하기"}
      </button>

      {/* 구분선 */}
      <div className="mb-5 flex items-center gap-3 lg:mb-3">
        <div className="h-px flex-1 bg-boyak-line" />
        <span className="text-base font-bold text-boyak-muted">또는 바로 선택</span>
        <div className="h-px flex-1 bg-boyak-line" />
      </div>

      {/* 빠른 선택 버튼 */}
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:gap-3" aria-label="증상 빠른 선택">
        {symptomOptions.map((symptom) => {
          const isSelected = selectedSymptom === symptom;
          return (
            <button
              key={symptom}
              className={`min-h-24 rounded-2xl border-2 px-4 text-2xl font-black shadow-sm transition active:scale-[0.98] sm:min-h-28 sm:text-3xl lg:min-h-16 lg:text-xl ${
                isSelected
                  ? "border-boyak-green bg-[#EDF9F1] text-boyak-green"
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
function HospitalResultsPanel({ hospitals, isLoading, symptom, department, onSelectHospital, onSpeak }) {
  return (
    <div className="mx-auto max-w-[720px] rounded-[30px] border-2 border-boyak-line bg-white px-7 py-8 shadow-soft sm:px-9 sm:py-10 lg:max-w-none lg:px-5 lg:py-5">
      <div className="mb-8 flex items-start justify-between gap-4 lg:mb-4 lg:gap-3">
        <div>
          <p className="mb-3 text-xl font-black text-boyak-green lg:mb-1 lg:text-lg">
            {symptom ? `${symptom} 증상 분석 결과` : "AI 증상 분석 결과"}
          </p>
          <h2 className="text-3xl font-black leading-relaxed sm:text-4xl lg:text-2xl">
            {isLoading ? "분석 중..." : `${department}를 추천해요`}
          </h2>
          <p className="mt-3 text-xl font-bold leading-relaxed text-boyak-muted lg:mt-1 lg:text-lg">
            {isLoading
              ? "계단·경사를 확인하며 가장 편한 경로 순으로 정렬하고 있어요."
              : "계단이 적고 거리 짧은 순으로 정렬했어요."}
          </p>
        </div>
        <button
          className="grid size-16 shrink-0 place-items-center rounded-full text-boyak-ink lg:size-11"
          type="button"
          aria-label="추천 병원 음성으로 듣기"
          onClick={onSpeak}
        >
          <Volume2 className="size-11 lg:size-8" strokeWidth={2.3} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3 lg:gap-3">
        {hospitals.map((h, index) => (
          <article
            key={h.name}
            className={`rounded-3xl border-2 bg-white p-6 lg:p-4 ${
              h.recommendedForWalking ? "border-boyak-green" : "border-[#30343B]"
            }`}
          >
            <div className="mb-5 flex items-start justify-between gap-4 lg:mb-3 lg:gap-3">
              <div>
                {h.recommendedForWalking ? (
                  <p className="mb-2 inline-flex items-center gap-1 rounded-lg bg-boyak-green px-3 py-1 text-base font-black text-white lg:mb-1 lg:text-sm">
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
              <span
                className={`shrink-0 rounded-xl px-4 py-2 text-lg font-black lg:px-3 lg:py-2 lg:text-sm ${
                  h.recommendedForWalking
                    ? "bg-[#EDF9F1] text-boyak-green"
                    : "bg-[#F5F5F5] text-boyak-muted"
                }`}
              >
                {h.status}
              </span>
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
                  <span className={`ml-1 text-lg lg:text-sm ${h.isFlat ? "text-boyak-green" : "text-boyak-muted"}`}>
                    {h.isFlat ? "· 계단 없음" : `· 계단 ${h.stairs}개`}
                  </span>
                )}
              </p>
            </div>
            <button
              className={`min-h-20 w-full rounded-2xl px-6 text-2xl font-black text-white lg:min-h-14 lg:text-lg ${
                h.recommendedForWalking ? "bg-boyak-green" : "bg-[#5B616B]"
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
    <div className="mx-auto max-w-[560px] rounded-[30px] border-2 border-boyak-line bg-white px-7 py-8 shadow-soft sm:px-9 sm:py-10 lg:max-w-[720px] lg:px-5 lg:py-5">
      <StepHeader
        icon={<Building2 className="size-12 text-boyak-green" />}
        title="병원을 선택했어요"
        onSpeak={() =>
          onSpeak(
            `${hospital.name} 상세 정보입니다. ${hospital.route}이며 계단 ${hospital.stairs ?? 0}개 경로예요.`
          )
        }
      />
      <article className="rounded-3xl border-2 border-[#30343B] bg-white p-7 lg:p-5">
        <p className="mb-3 text-xl font-black text-boyak-green lg:mb-2 lg:text-lg">{hospital.department}</p>
        <h2 className="mb-5 text-4xl font-black leading-tight lg:mb-3 lg:text-3xl">{hospital.name}</h2>
        <p className="text-2xl font-extrabold text-boyak-muted lg:text-lg">
          {hospital.walk} ({hospital.distance}) · {hospital.route}
        </p>
        {hospital.stairs !== undefined && (
          <p className={`mt-3 text-xl font-bold lg:text-base ${hospital.isFlat ? "text-boyak-green" : "text-boyak-muted"}`}>
            {hospital.isFlat ? "✓ 계단 없는 평지 경로" : `계단 ${hospital.stairs}개 포함`}
          </p>
        )}
        <p className="mt-4 inline-flex rounded-xl bg-[#EDF9F1] px-5 py-3 text-xl font-black text-boyak-green lg:mt-3 lg:px-4 lg:py-2 lg:text-base">
          {hospital.status}
        </p>
      </article>
      <button
        className="mt-6 min-h-[96px] w-full rounded-2xl bg-boyak-green px-7 text-3xl font-black text-white lg:mt-4 lg:min-h-14 lg:text-xl"
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
