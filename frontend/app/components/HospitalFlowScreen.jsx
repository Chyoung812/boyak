"use client";

import { memo } from "react";
import {
  ArrowUp,
  Building2,
  CheckCircle,
  Clock,
  MapPin,
  Mic,
  Navigation,
  Volume2,
} from "lucide-react";

import { hospitalFlowSteps, hospitalStepKeys, nearbyHospitals, symptomOptions } from "../constants";
import BackButton from "./BackButton";
import StepHeader from "./StepHeader";
import FlowPanel from "./FlowPanel";

function HospitalFlowScreen({
  step,
  selectedSymptom,
  hospital,
  onBack,
  onStepChange,
  onSelectSymptom,
  onSelectHospital,
  onSpeak,
}) {
  const currentIndex = hospitalStepKeys.indexOf(step);
  const currentStepLabel = hospitalFlowSteps[currentIndex] ?? hospitalFlowSteps[0];
  const recommendedDepartment =
    selectedSymptom === "두통" ? "신경과 또는 가정의학과" : "정형외과 또는 통증의학과";

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
            onSpeak("증상을 말하거나 선택하면 진료과를 추천하고, 주변 병원 후보를 보여준 뒤 실제 길찾기는 카카오맵 링크로 연결합니다.")
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
          onSpeak={() => onSpeak("어디가 아프세요? 허리, 무릎, 어깨, 두통 중에서 말하거나 큰 버튼을 선택해주세요.")}
        />
      )}

      {step === "results" && (
        <HospitalResultsPanel
          hospitals={nearbyHospitals}
          symptom={selectedSymptom}
          department={recommendedDepartment}
          onSelectHospital={onSelectHospital}
          onSpeak={() =>
            onSpeak(`${selectedSymptom ?? "입력한 증상"}에는 ${recommendedDepartment}를 추천합니다. 가까운 병원을 거리순으로 보여드릴게요.`)
          }
        />
      )}

      {step === "select" && (
        <HospitalSelectPanel
          hospital={hospital}
          onStepChange={onStepChange}
          onSpeak={onSpeak}
        />
      )}

      {step === "route" && (
        <RouteGuidePanel
          hospital={hospital}
          onArrive={() => onStepChange("arrived")}
          onSpeak={() =>
            onSpeak(`${hospital.name}까지 안내 중입니다. 200미터 직진하세요. 남은 거리는 520미터, 약 8분입니다.`)
          }
        />
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

function SymptomSelectPanel({ selectedSymptom, onSelect, onSpeak }) {
  return (
    <div className="mx-auto max-w-[560px] rounded-[30px] border-2 border-boyak-line bg-white px-7 py-8 shadow-soft sm:px-9 sm:py-10 lg:max-w-[720px] lg:px-6 lg:py-5">
      <div className="mb-8 flex items-start justify-between gap-4 lg:mb-4">
        <h2 className="text-center text-3xl font-black leading-relaxed sm:text-4xl lg:text-2xl">
          어디가 아프세요?
          <br />
          말하거나 선택해주세요
        </h2>
        <button
          className="grid size-16 shrink-0 place-items-center rounded-full text-boyak-ink lg:size-11"
          type="button"
          aria-label="증상 선택 안내 듣기"
          onClick={onSpeak}
        >
          <Volume2 className="size-11 lg:size-8" strokeWidth={2.3} aria-hidden="true" />
        </button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-5 sm:gap-7 lg:mb-4 lg:gap-3" aria-label="증상 선택지">
        {symptomOptions.map((symptom) => {
          const isSelected = selectedSymptom === symptom;
          return (
            <button
              key={symptom}
              className={`min-h-32 rounded-2xl border-2 px-4 text-3xl font-black shadow-sm transition active:scale-[0.98] sm:min-h-36 sm:text-4xl lg:min-h-20 lg:text-2xl ${
                isSelected ? "border-boyak-green bg-[#EDF9F1] text-boyak-green" : "border-[#30343B] bg-white text-boyak-ink"
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

      <button
        className="mb-5 inline-flex min-h-[112px] w-full items-center justify-center gap-5 rounded-2xl border-2 border-[#30343B] bg-white px-8 text-3xl font-black active:scale-[0.99] lg:mb-3 lg:min-h-14 lg:text-xl"
        type="button"
        onClick={onSpeak}
      >
        <Mic className="size-14 text-boyak-muted lg:size-8" strokeWidth={2.4} aria-hidden="true" />
        말하기
      </button>

      {selectedSymptom && (
        <div className="rounded-xl bg-[#EDF9F1] p-5 text-center text-xl font-extrabold leading-relaxed text-boyak-green lg:p-3 lg:text-lg">
          {selectedSymptom} 통증에 맞는 병원을 찾는 중이에요.
        </div>
      )}
    </div>
  );
}

function HospitalResultsPanel({ hospitals, symptom, department, onSelectHospital, onSpeak }) {
  return (
    <div className="mx-auto max-w-[720px] rounded-[30px] border-2 border-boyak-line bg-white px-7 py-8 shadow-soft sm:px-9 sm:py-10 lg:max-w-none lg:px-5 lg:py-5">
      <div className="mb-8 flex items-start justify-between gap-4 lg:mb-4 lg:gap-3">
        <div>
          <p className="mb-3 text-xl font-black text-boyak-green lg:mb-1 lg:text-lg">
            {symptom ? `${symptom} 증상 분석 결과` : "AI 증상 분석 결과"}
          </p>
          <h2 className="text-3xl font-black leading-relaxed sm:text-4xl lg:text-2xl">
            {department}를 추천해요
          </h2>
          <p className="mt-3 text-xl font-bold leading-relaxed text-boyak-muted lg:mt-1 lg:text-lg">
            가까운 병원을 거리순으로 보여드릴게요.
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
          <article key={h.name} className="rounded-3xl border-2 border-[#30343B] bg-white p-6 lg:p-4">
            <div className="mb-5 flex items-start justify-between gap-4 lg:mb-3 lg:gap-3">
              <div>
                <p className="mb-2 text-lg font-black text-boyak-green lg:mb-1 lg:text-base">거리순 {index + 1}번째</p>
                <h3 className="text-3xl font-black leading-tight lg:text-2xl">
                  {h.name}
                  <span className="mt-2 block text-xl text-boyak-muted lg:text-base">{h.department}</span>
                </h3>
              </div>
              <span className="rounded-xl bg-[#EDF9F1] px-4 py-2 text-lg font-black text-boyak-green lg:px-3 lg:py-2 lg:text-sm">
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
              </p>
            </div>
            <button
              className="min-h-20 w-full rounded-2xl bg-boyak-green px-6 text-2xl font-black text-white lg:min-h-14 lg:text-lg"
              type="button"
              onClick={() => onSelectHospital(index)}
            >
              이 병원 선택
            </button>
          </article>
        ))}

        <button
          className="inline-flex min-h-[96px] items-center justify-center gap-5 rounded-2xl border-2 border-[#30343B] bg-white px-8 text-3xl font-black lg:col-span-3 lg:min-h-14 lg:text-xl"
          type="button"
          onClick={onSpeak}
        >
          <Mic className="size-12 lg:size-8" strokeWidth={2.4} aria-hidden="true" />
          말하기
        </button>
      </div>
    </div>
  );
}

function HospitalSelectPanel({ hospital, onStepChange, onSpeak }) {
  return (
    <div className="mx-auto max-w-[560px] rounded-[30px] border-2 border-boyak-line bg-white px-7 py-8 shadow-soft sm:px-9 sm:py-10 lg:max-w-[720px] lg:px-5 lg:py-5">
      <StepHeader
        icon={<Building2 className="size-12 text-boyak-green" />}
        title="병원을 선택했어요"
        onSpeak={() => onSpeak(`${hospital.name} 상세 정보입니다. ${hospital.status}이며 ${hospital.route}로 이동할 수 있어요.`)}
      />
      <article className="rounded-3xl border-2 border-[#30343B] bg-white p-7 lg:p-5">
        <p className="mb-3 text-xl font-black text-boyak-green lg:mb-2 lg:text-lg">{hospital.department}</p>
        <h2 className="mb-5 text-4xl font-black leading-tight lg:mb-3 lg:text-3xl">{hospital.name}</h2>
        <p className="text-2xl font-extrabold text-boyak-muted lg:text-lg">
          {hospital.walk} ({hospital.distance}) · {hospital.route}
        </p>
        <p className="mt-4 inline-flex rounded-xl bg-[#EDF9F1] px-5 py-3 text-xl font-black text-boyak-green lg:mt-3 lg:px-4 lg:py-2 lg:text-base">
          {hospital.status}
        </p>
      </article>
      <a
        className="mt-6 flex min-h-[96px] w-full items-center justify-center rounded-2xl bg-boyak-green px-7 text-center text-3xl font-black text-white lg:mt-4 lg:min-h-14 lg:text-xl"
        href={hospital.mapUrl || `https://map.kakao.com/link/search/${encodeURIComponent(hospital.name)}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => onSpeak(`${hospital.name} 길찾기를 카카오맵에서 엽니다.`)}
      >
        카카오맵으로 길찾기
      </a>
    </div>
  );
}

function RouteGuidePanel({ hospital, onArrive, onSpeak }) {
  return (
    <div className="mx-auto max-w-[560px] overflow-hidden rounded-[30px] border-2 border-boyak-line bg-white shadow-soft lg:max-w-[760px]">
      <div className="flex items-start justify-between gap-4 px-7 py-8 sm:px-9 lg:px-5 lg:py-4">
        <h2 className="text-center text-3xl font-black leading-relaxed sm:text-4xl lg:text-2xl">
          안내를 시작합니다
        </h2>
        <button
          className="grid size-16 shrink-0 place-items-center rounded-full text-boyak-ink lg:size-11"
          type="button"
          aria-label="경로 안내 음성으로 듣기"
          onClick={onSpeak}
        >
          <Volume2 className="size-11 lg:size-8" strokeWidth={2.3} aria-hidden="true" />
        </button>
      </div>

      <div className="relative h-[360px] bg-[#EFF1F4] lg:h-[190px]">
        <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(90deg,rgba(255,255,255,.9)_2px,transparent_2px),linear-gradient(rgba(255,255,255,.9)_2px,transparent_2px)] [background-size:72px_72px]" />
        <div className="absolute left-[22%] top-[62%] size-12 rounded-full border-[7px] border-[#424850] bg-white" />
        <div className="absolute right-[16%] top-[22%] grid size-14 place-items-center rounded-full bg-[#424850] text-white">
          <MapPin className="size-10" fill="currentColor" aria-hidden="true" />
        </div>
        <div className="absolute left-[28%] top-[47%] h-9 w-[28%] rounded-l-full border-b-[14px] border-l-[14px] border-[#5B616B]" />
        <div className="absolute left-[50%] top-[29%] h-[92px] w-9 border-r-[14px] border-[#5B616B]" />
        <div className="absolute left-[56%] top-[29%] h-9 w-[28%] rounded-r-full border-r-[14px] border-t-[14px] border-[#5B616B]" />
      </div>

      <div className="m-7 rounded-3xl border-2 border-boyak-line bg-white p-7 lg:m-4 lg:p-4">
        <p className="mb-7 inline-flex items-center gap-5 text-3xl font-black lg:mb-3 lg:gap-3 lg:text-xl">
          <ArrowUp className="size-16 lg:size-10" strokeWidth={2.8} aria-hidden="true" />
          200m 직진하세요
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-boyak-line pt-5 text-xl font-extrabold text-boyak-muted lg:pt-3 lg:text-base">
          <span>남은 거리 520m</span>
          <span aria-hidden="true">|</span>
          <span className="inline-flex items-center gap-2">
            <Clock className="size-6 lg:size-5" aria-hidden="true" />약 8분
          </span>
        </div>
        <p className="mt-4 text-lg font-bold text-boyak-muted lg:mt-2 lg:text-base">목적지: {hospital.name}</p>
      </div>

      <div className="grid gap-4 px-7 pb-7 lg:grid-cols-2 lg:gap-3 lg:px-4 lg:pb-4">
        <button
          className="inline-flex min-h-[96px] w-full items-center justify-center gap-5 rounded-2xl bg-boyak-green px-8 text-3xl font-black text-white lg:min-h-14 lg:text-xl"
          type="button"
          onClick={onSpeak}
        >
          <Mic className="size-12 lg:size-8" strokeWidth={2.4} aria-hidden="true" />
          말하기
        </button>
        <button
          className="inline-flex min-h-[86px] w-full items-center justify-center gap-4 rounded-2xl border-2 border-[#30343B] bg-white px-8 text-2xl font-black lg:min-h-14 lg:text-xl"
          type="button"
          onClick={onArrive}
        >
          <CheckCircle className="size-9 text-boyak-green lg:size-7" aria-hidden="true" />
          도착했어요
        </button>
      </div>
    </div>
  );
}

export default memo(HospitalFlowScreen);
