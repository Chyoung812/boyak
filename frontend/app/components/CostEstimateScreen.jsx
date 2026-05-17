"use client";

import { memo } from "react";
import { Mic, Volume2 } from "lucide-react";

import { costBodyOptions, costFlowSteps, treatmentCosts, treatmentOptions } from "../constants";
import BackButton from "./BackButton";
import StepLabel from "./StepLabel";

function CostEstimateScreen({
  step,
  selectedBody,
  selectedTreatment,
  onBack,
  onStepChange,
  onSelectBody,
  onSelectTreatment,
  onSpeak,
  onAsk,
}) {
  const costStepKeys = ["body", "treatment", "estimate", "chat"];
  const currentIndex = costStepKeys.indexOf(step);
  const currentStepLabel = costFlowSteps[currentIndex] ?? costFlowSteps[0];
  const selectedCost = treatmentCosts[selectedTreatment];

  return (
    <section className="lg:flex lg:h-full lg:flex-col" aria-labelledby="cost-title">
      <BackButton onClick={onBack} />
      <div className="mb-8 flex flex-wrap items-center gap-4 text-boyak-orange lg:mb-3 lg:gap-3">
        <span className="grid size-14 place-items-center rounded-full bg-boyak-orange text-3xl font-black text-white lg:size-10 lg:text-2xl">
          W
        </span>
        <h1 id="cost-title" className="text-3xl font-black leading-tight sm:text-4xl lg:text-2xl">
          병원비 예상 비용 확인 흐름
        </h1>
        <button
          className="ml-auto grid size-16 place-items-center rounded-full text-boyak-ink lg:size-11"
          type="button"
          aria-label="병원비 화면 음성 안내 듣기"
          onClick={onSpeak}
        >
          <Volume2 className="size-11 lg:size-8" strokeWidth={2.3} aria-hidden="true" />
        </button>
      </div>

      {/* Mobile step indicator */}
      <div className="mb-6 rounded-2xl border border-[#FFD5B0] bg-[#FFF3E8] p-4 md:hidden" aria-label="현재 병원비 확인 단계">
        <p className="text-base font-black text-boyak-muted">현재 진행 단계</p>
        <p className="mt-1 text-2xl font-black text-boyak-orange">
          {currentIndex + 1} / {costFlowSteps.length} {currentStepLabel}
        </p>
      </div>

      {/* Desktop step bar */}
      <div className="mb-8 hidden gap-3 md:grid md:grid-cols-4 lg:mb-3 lg:gap-2" aria-label="병원비 확인 단계">
        {costFlowSteps.map((label, index) => (
          <button
            key={label}
            className={`min-h-16 rounded-2xl border px-3 text-base font-black lg:min-h-11 lg:rounded-xl lg:px-2 lg:text-sm ${
              index <= currentIndex
                ? "border-boyak-orange bg-[#FFF3E8] text-boyak-orange"
                : "border-boyak-line bg-white text-boyak-muted"
            }`}
            type="button"
            onClick={() => onStepChange(costStepKeys[index])}
          >
            <span className="mr-2 inline-grid size-7 place-items-center rounded-full bg-boyak-orange text-sm text-white lg:size-5 lg:text-xs">
              {index + 1}
            </span>
            {label}
          </button>
        ))}
      </div>

      <div className="lg:flex lg:min-h-0 lg:flex-1 lg:items-start lg:justify-center">
        {step === "body" && (
          <section
            className="mx-auto w-full max-w-[760px] rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:max-h-full lg:max-w-[840px] lg:p-5"
            aria-labelledby="cost-step-1"
          >
            <StepLabel number="1" title="부위 선택" />
            <h2 id="cost-step-1" className="mb-6 text-center text-3xl font-black leading-relaxed lg:mb-4 lg:text-3xl">
              어떤 부위가 불편하세요?
            </h2>
            <div className="grid gap-3 md:grid-cols-3 lg:gap-3">
              {costBodyOptions.map((body) => {
                const isSelected = selectedBody === body;
                return (
                  <button
                    key={body}
                    className={`min-h-28 rounded-2xl border-2 px-5 text-3xl font-black active:scale-[0.98] lg:min-h-24 lg:text-3xl ${
                      isSelected
                        ? "border-boyak-orange bg-[#FFF3E8] text-boyak-orange"
                        : "border-boyak-line bg-white text-[#27406A]"
                    }`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      onSelectBody(body);
                      onStepChange("treatment");
                    }}
                  >
                    {body}
                  </button>
                );
              })}
            </div>
            <button
              className="mt-4 inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 border-boyak-line bg-white px-5 text-xl font-black lg:min-h-14 lg:text-lg"
              type="button"
              onClick={onAsk}
            >
              <Mic className="size-8 text-boyak-orange lg:size-7" strokeWidth={2.4} aria-hidden="true" />
              말하기
            </button>
          </section>
        )}

        {step === "treatment" && (
          <section
            className="mx-auto w-full max-w-[760px] rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:max-h-full lg:max-w-[840px] lg:p-5"
            aria-labelledby="cost-step-2"
          >
            <StepLabel number="2" title="치료/검사 선택" />
            <h2 id="cost-step-2" className="mb-6 text-center text-3xl font-black leading-relaxed lg:mb-4 lg:text-3xl">
              {selectedBody} 통증, 어떤 치료를 알고 싶으세요?
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {treatmentOptions.map((treatment) => {
                const isSelected = selectedTreatment === treatment;
                const isEtc = treatment === "기타 문의";
                return (
                  <button
                    key={treatment}
                    className={`min-h-20 rounded-2xl border-2 px-5 text-left text-2xl font-black active:scale-[0.98] md:mx-0 lg:min-h-[58px] lg:text-lg ${
                      isEtc ? "md:col-span-2 md:w-full md:text-center" : ""
                    } ${
                      isSelected
                        ? "border-boyak-orange bg-[#FFF3E8] text-boyak-orange"
                        : "border-boyak-line bg-white text-boyak-ink"
                    }`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      onSelectTreatment(treatment);
                      onStepChange("estimate");
                    }}
                  >
                    {treatment}
                  </button>
                );
              })}
            </div>
            <button
              className="mt-4 block min-h-14 w-full rounded-2xl border-2 border-boyak-line bg-white px-6 text-xl font-black lg:min-h-12 lg:text-lg"
              type="button"
              onClick={() => onStepChange("body")}
            >
              부위 다시 선택
            </button>
          </section>
        )}

        {step === "estimate" && (
          <section
            className="mx-auto w-full max-w-[760px] rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:max-h-full lg:max-w-[840px] lg:p-5"
            aria-labelledby="cost-step-3"
          >
            <StepLabel number="3" title="예상 비용 안내" />
            <h2 id="cost-step-3" className="mb-4 text-center text-2xl font-black lg:text-3xl">
              예상 비용 (건강보험 적용 후)
            </h2>
            <div className="mb-4 rounded-2xl bg-[#EFFAF4] p-6 text-center text-4xl font-black leading-snug text-[#16804D] lg:p-5 lg:text-4xl">
              {selectedCost}
            </div>
            <dl className="grid gap-3 text-xl font-extrabold lg:gap-2 lg:text-base">
              {["진료비(초진)", "X-ray 검사", "물리치료(1회)"].map((item) => (
                <div key={item} className="flex justify-between gap-4 rounded-xl bg-boyak-field px-4 py-3 lg:py-2.5">
                  <dt>{item}</dt>
                  <dd>{treatmentCosts[item]}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 rounded-xl bg-[#F1F4FA] p-4 text-lg font-bold text-boyak-muted lg:p-3 lg:text-base">
              병원마다 차이가 있을 수 있어요.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                className="inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-boyak-orange px-5 text-xl font-black text-white lg:min-h-14 lg:text-lg"
                type="button"
                onClick={onSpeak}
              >
                <Volume2 className="size-7 lg:size-6" aria-hidden="true" />
                음성으로 듣기
              </button>
              <button
                className="min-h-16 rounded-2xl border-2 border-boyak-line bg-white px-5 text-xl font-black lg:min-h-14 lg:text-lg"
                type="button"
                onClick={() => onStepChange("chat")}
              >
                추가 설명 보기
              </button>
            </div>
          </section>
        )}

        {step === "chat" && (
          <section
            className="mx-auto w-full max-w-[760px] rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:max-h-full lg:max-w-[840px] lg:p-5"
            aria-labelledby="cost-step-4"
          >
            <StepLabel number="4" title="추가 설명" />
            <h2 id="cost-step-4" className="mb-4 text-center text-2xl font-black lg:text-3xl">
              챗봇에게 물어보기
            </h2>
            <div className="mb-3 rounded-2xl bg-[#EEF4FF] p-6 text-2xl font-extrabold leading-relaxed text-[#27406A] lg:p-4 lg:text-xl">
              궁금한 점이 있나요?
              <br />
              예) MRI 비용은?
            </div>
            <div className="mb-4 rounded-2xl bg-[#F4F0FF] p-6 text-2xl font-extrabold leading-relaxed text-[#27406A] lg:p-4 lg:text-xl">
              {selectedTreatment} 비용은 보험 적용 후 {selectedCost} 정도 예상돼요.
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                className="inline-flex min-h-20 w-full items-center justify-center gap-4 rounded-2xl border-2 border-boyak-line bg-white px-6 text-2xl font-black lg:min-h-14 lg:text-lg"
                type="button"
                onClick={onAsk}
              >
                <Mic className="size-10 text-boyak-orange lg:size-7" strokeWidth={2.4} aria-hidden="true" />
                말하기
              </button>
              <button
                className="inline-flex min-h-20 w-full items-center justify-center gap-4 rounded-2xl border-2 border-boyak-line bg-white px-6 text-2xl font-black lg:min-h-14 lg:text-lg"
                type="button"
                onClick={onSpeak}
              >
                <Volume2 className="size-9 text-boyak-orange lg:size-7" aria-hidden="true" />
                음성으로 듣기
              </button>
            </div>
            <button
              className="mt-3 min-h-14 w-full rounded-2xl bg-boyak-orange px-6 text-xl font-black text-white lg:min-h-12 lg:text-lg"
              type="button"
              onClick={() => onStepChange("body")}
            >
              다른 비용 확인
            </button>
          </section>
        )}
      </div>
    </section>
  );
}

export default memo(CostEstimateScreen);
