"use client";

import { memo } from "react";
import { Calculator, CircleHelp } from "lucide-react";

import {
  commonCostQuestions,
  costFlowSteps,
  treatmentCostDetails,
  treatmentCosts,
} from "../constants";
import BackButton from "./BackButton";
import StepLabel from "./StepLabel";

function CostEstimateScreen({
  step,
  onBack,
  onStepChange,
}) {
  const costStepKeys = ["estimate", "chat"];
  const currentIndex = Math.max(0, costStepKeys.indexOf(step));
  const currentStepLabel = costFlowSteps[currentIndex] ?? costFlowSteps[0];

  const firstVisitItems = [
    "진찰만",
    "진찰 + X-ray + 처방전 받을 수 있음",
    "진찰 + X-ray + 물리치료 + 처방전 받을 수 있음",
  ];

  return (
    <section className="cost-shell lg:flex lg:h-full lg:flex-col" aria-labelledby="cost-title">
      <BackButton onClick={onBack} />
      <div className="mb-5 flex flex-wrap items-center gap-3 text-boyak-orange lg:mb-4">
        <span className="grid size-12 place-items-center rounded-[14px] bg-boyak-orange text-white shadow-[0_10px_24px_rgba(240,131,18,0.18)] lg:size-10">
          <Calculator className="size-7 lg:size-6" strokeWidth={2.8} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-black tracking-[0.18em] text-[#7b7b78]">HOSPITAL COST GUIDE</p>
          <h1 id="cost-title" className="text-3xl font-black leading-tight tracking-[-0.04em] text-[#111111] sm:text-4xl lg:text-3xl">
            병원비 예상 비용 확인
          </h1>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[#FFD5B0] bg-[#FFF3E8] p-4 md:hidden" aria-label="현재 병원비 확인 단계">
        <p className="text-base font-black text-boyak-muted">현재 진행 단계</p>
        <p className="mt-1 text-2xl font-black text-boyak-orange">
          {currentIndex + 1} / {costFlowSteps.length} {currentStepLabel}
        </p>
      </div>

      <div className="mb-5 hidden gap-3 md:grid md:grid-cols-2 lg:mb-4 lg:gap-3" aria-label="병원비 확인 단계">
        {costFlowSteps.map((label, index) => (
          <button
            key={label}
            className={`flex min-h-14 items-center rounded-[18px] border px-4 text-left text-base font-black transition lg:min-h-12 lg:px-3 lg:text-sm ${
              index <= currentIndex
                ? "border-boyak-orange bg-[#FFF3E8] text-boyak-orange shadow-[0_8px_22px_rgba(240,131,18,0.09)]"
                : "border-[#dedbd6] bg-white/80 text-[#7b7b78]"
            }`}
            type="button"
            onClick={() => onStepChange(index === 0 ? "estimate" : "chat")}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            <span className="mr-3 inline-grid size-7 place-items-center rounded-full bg-boyak-orange text-sm text-white lg:size-6 lg:text-xs">
              {index + 1}
            </span>
            {label}
          </button>
        ))}
      </div>

      <div className="lg:flex lg:min-h-0 lg:flex-1 lg:items-start lg:justify-center">
        {step === "estimate" && (
          <section
            className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-[32px] border border-[#dedbd6] bg-[#faf9f6] p-5 shadow-[0_24px_70px_rgba(17,17,17,0.10)] lg:p-6"
            aria-labelledby="cost-step-1"
          >
            <StepLabel number="1" title="첫 방문 비용" />
            <IntroCard titleId="cost-step-1" />

            <section className="rounded-[28px] border border-[#dedbd6] bg-white p-5 lg:p-6" aria-labelledby="first-visit-cases">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="mb-2 text-sm font-black tracking-[0.16em] text-boyak-orange">대표 3가지 경우</p>
                  <h3 id="first-visit-cases" className="text-3xl font-black tracking-[-0.04em] text-[#111111] lg:text-2xl">
                    처음 가면 보통 이 정도만 먼저 보세요
                  </h3>
                </div>
                <span className="rounded-full bg-[#ecfdf3] px-4 py-2 text-sm font-black text-[#16804D]">병원 창구 결제 기준</span>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {firstVisitItems.map((item, index) => {
                  const detail = treatmentCostDetails[item];
                  return (
                    <article key={item} className="flex min-h-[230px] flex-col rounded-[24px] border border-[#dedbd6] bg-[#fbfaf8] p-5 shadow-[0_8px_22px_rgba(17,17,17,0.04)]">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-boyak-orange text-lg font-black text-white">
                          {index + 1}
                        </span>
                        <h4 className="text-xl font-black leading-tight tracking-[-0.03em] text-[#111111] lg:text-lg">{item}</h4>
                      </div>
                      <p className="rounded-[18px] bg-[#FFF3E8] px-4 py-4 text-2xl font-black leading-tight text-boyak-orange lg:text-xl">
                        {treatmentCosts[item]}
                      </p>
                      <p className="mt-4 text-base font-bold leading-relaxed text-[#626260] lg:text-sm">
                        {detail.note}
                      </p>
                    </article>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-3 rounded-[22px] bg-[#f1f4fa] p-4 md:grid-cols-[1fr_auto] md:items-center">
                <p className="text-base font-bold leading-relaxed text-[#626260]">
                  추가 검사·치료를 권유받으면 먼저 급여 적용 여부와 병원 창구 예상 금액을 확인하세요.
                </p>
                <button
                  className="min-h-14 rounded-[18px] bg-[#111111] px-6 text-lg font-black text-white shadow-[0_12px_24px_rgba(17,17,17,0.14)] transition hover:bg-boyak-orange"
                  type="button"
                  onClick={() => onStepChange("chat")}
                >
                  많이 물어보는 비용 보기
                </button>
              </div>
            </section>
          </section>
        )}

        {step === "chat" && (
          <section
            className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-[32px] border border-[#dedbd6] bg-[#faf9f6] p-5 shadow-[0_24px_70px_rgba(17,17,17,0.10)] lg:p-6"
            aria-labelledby="cost-step-2"
          >
            <StepLabel number="2" title="많이 물어보는 비용" />
            <IntroCard titleId="cost-step-2" eyebrow="COVERED COST QUESTIONS" title="금액이 달라지는 기준만 확인하세요" body="첫 방문 비용표에 없는 급여 기준만 따로 정리했어요. 재방문, 시간대, 나이에 따라 창구 부담이 달라질 수 있어요." />

            <div className="grid gap-4 md:grid-cols-3">
              {commonCostQuestions.map((item) => (
                <article key={item.title} className="flex min-h-[280px] flex-col rounded-[24px] border border-[#dedbd6] bg-white p-5 shadow-[0_10px_28px_rgba(17,17,17,0.05)]">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mb-1 text-sm font-black tracking-[0.12em] text-boyak-orange">{item.type}</p>
                      <h3 className="text-2xl font-black leading-tight tracking-[-0.03em] text-[#111111] lg:text-xl">{item.title}</h3>
                    </div>
                    <CircleHelp className="size-7 shrink-0 text-boyak-orange" aria-hidden="true" />
                  </div>
                  <p className="rounded-[18px] bg-[#FFF3E8] px-4 py-3 text-2xl font-black leading-tight text-boyak-orange lg:text-xl">
                    {item.price}
                  </p>
                  <p className="mt-4 text-base font-bold leading-relaxed text-[#626260] lg:text-sm">
                    {item.guide}
                  </p>
                  <p className="mt-auto rounded-[16px] bg-[#f1f4fa] p-3 text-sm font-bold leading-relaxed text-[#626260]">
                    물어볼 말: {item.question}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-5 grid gap-3 rounded-[24px] border border-[#bfe8d0] bg-[#fbfffd] p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="text-xl font-black text-[#111111]">병원 창구에서 이렇게 확인하세요</h3>
                <p className="mt-2 text-base font-bold leading-relaxed text-[#626260]">
                  “오늘은 초진/재진 중 무엇인가요? 야간·공휴일 가산이나 65세 이상 본인부담 기준이 적용되나요?”
                </p>
              </div>
              <button
                className="min-h-14 rounded-[18px] bg-boyak-orange px-6 text-lg font-black text-white"
                type="button"
                onClick={() => onStepChange("estimate")}
              >
                첫 방문 비용으로 돌아가기
              </button>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

function IntroCard({
  titleId,
  eyebrow = "FIRST VISIT COST",
  title = "통증 첫 방문, 경우의 수만 쉽게",
  body = "흔한 기본 흐름을 하나로 정리했어요. 병원 창구 결제 기준이며 약국 약값은 제외했어요.",
}) {
  return (
    <div className="mb-6 rounded-[28px] bg-white px-6 py-7 text-center shadow-[inset_0_0_0_1px_rgba(222,219,214,0.85)]">
      <p className="mb-3 text-sm font-black tracking-[0.18em] text-boyak-orange">{eyebrow}</p>
      <h2 id={titleId} className="mx-auto max-w-3xl text-4xl font-black leading-tight tracking-[-0.045em] text-[#111111] lg:text-4xl">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-3xl text-lg font-extrabold leading-relaxed text-[#626260] lg:text-base">
        {body}
      </p>
    </div>
  );
}

export default memo(CostEstimateScreen);
