"use client";

import { memo } from "react";
import { Calculator, CircleHelp } from "lucide-react";

import {
  commonCostQuestions,
  costFlowSteps,
  treatmentCostDetails,
  treatmentCosts,
  treatmentOptions,
} from "../constants";
import BackButton from "./BackButton";
import StepLabel from "./StepLabel";

function CostEstimateScreen({
  step,
  selectedTreatment,
  onBack,
  onStepChange,
  onSelectTreatment,
}) {
  const costStepKeys = ["estimate", "chat"];
  const currentIndex = Math.max(0, costStepKeys.indexOf(step));
  const currentStepLabel = costFlowSteps[currentIndex] ?? costFlowSteps[0];
  const selectedCost = treatmentCosts[selectedTreatment];
  const selectedDetail = treatmentCostDetails[selectedTreatment] ?? treatmentCostDetails["기타 문의"];

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

            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[26px] border border-[#dedbd6] bg-white p-4 lg:p-5">
                <p className="mb-3 text-sm font-black tracking-[0.16em] text-[#7b7b78]">STEP 1</p>
                <h3 className="mb-4 text-2xl font-black tracking-[-0.03em] text-[#111111] lg:text-xl">
                  먼저 내 경우를 고르세요
                </h3>
                <div className="grid gap-3">
                  {treatmentOptions.map((treatment) => {
                    const isSelected = selectedTreatment === treatment;
                    const detail = treatmentCostDetails[treatment];
                    return (
                      <button
                        key={treatment}
                        className={`group rounded-[20px] border px-5 py-4 text-left transition active:scale-[0.985] lg:py-3 ${
                          isSelected
                            ? "border-boyak-orange bg-[#FFF3E8] text-boyak-orange shadow-[0_10px_24px_rgba(240,131,18,0.10)]"
                            : "border-[#dedbd6] bg-white text-[#111111] hover:border-[#FFD5B0]"
                        }`}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onSelectTreatment(treatment)}
                      >
                        <span className="block text-xl font-black leading-tight tracking-[-0.03em] lg:text-lg">{treatment}</span>
                        <span className="mt-1.5 block text-sm font-extrabold leading-snug text-[#626260] lg:text-sm">
                          {detail?.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[26px] border border-[#bfe8d0] bg-white p-5 shadow-[0_16px_44px_rgba(22,128,77,0.08)] lg:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black tracking-[0.16em] text-[#16804D]">STEP 2</p>
                      <h3 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#111111] lg:text-xl">
                        선택한 경우 예상
                      </h3>
                    </div>
                    <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-sm font-black text-[#16804D]">급여 기준</span>
                  </div>
                  <div className="rounded-[24px] bg-gradient-to-br from-[#e9fff2] to-[#f7fffb] p-5 text-center text-3xl font-black leading-tight tracking-[-0.045em] text-[#16804D] shadow-[inset_0_0_0_1px_rgba(191,232,208,0.9)] lg:text-3xl">
                    {selectedCost}
                  </div>
                  <div className="mt-4 rounded-[20px] border border-[#bfe8d0] bg-[#fbfffd] p-4">
                    <p className="text-lg font-black text-[#111111]">{selectedTreatment}</p>
                    <p className="mt-2 text-base font-extrabold leading-relaxed text-[#16804D]">
                      {selectedDetail.range}
                    </p>
                    <p className="mt-2 text-sm font-bold leading-relaxed text-[#626260]">
                      {selectedDetail.note}
                    </p>
                  </div>
                </div>

                <div className="rounded-[26px] border border-[#dedbd6] bg-white p-5 lg:p-5">
                  <p className="mb-3 text-sm font-black tracking-[0.16em] text-[#7b7b78]">한눈에 보기</p>
                  <div className="grid gap-2">
                    {firstVisitItems.map((item) => (
                      <div key={item} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[16px] bg-[#f7f6f3] px-4 py-3">
                        <p className="min-w-0 text-base font-black leading-snug text-[#111111] lg:text-sm">{item}</p>
                        <p className="whitespace-nowrap text-base font-black text-boyak-orange lg:text-sm">{treatmentCosts[item]}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 rounded-[16px] bg-[#f1f4fa] p-3 text-base font-bold leading-relaxed text-[#626260] lg:text-sm">
                    주사, 추가 촬영, 특수치료, 야간/공휴일 가산은 병원마다 달라요.
                  </p>
                </div>

                <button
                  className="min-h-14 rounded-[18px] bg-[#111111] px-5 text-xl font-black text-white shadow-[0_14px_28px_rgba(17,17,17,0.16)] transition hover:-translate-y-0.5 hover:bg-boyak-orange lg:min-h-12 lg:text-lg"
                  type="button"
                  onClick={() => onStepChange("chat")}
                >
                  많이 물어보는 비용 보기
                </button>
              </div>
            </div>
          </section>
        )}

        {step === "chat" && (
          <section
            className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-[32px] border border-[#dedbd6] bg-[#faf9f6] p-5 shadow-[0_24px_70px_rgba(17,17,17,0.10)] lg:p-6"
            aria-labelledby="cost-step-2"
          >
            <StepLabel number="2" title="많이 물어보는 비용" />
            <IntroCard titleId="cost-step-2" eyebrow="COST QUESTIONS" title="검사·치료비, 이것만 먼저 물어보세요" body="공공데이터와 급여기준으로 자주 헷갈리는 항목을 미리 정리했어요. 실제 금액은 병원·부위·횟수에 따라 달라질 수 있어요." />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {commonCostQuestions.map((item) => (
                <article key={item.title} className="rounded-[24px] border border-[#dedbd6] bg-white p-5 shadow-[0_10px_28px_rgba(17,17,17,0.05)]">
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
                  <p className="mt-3 rounded-[16px] bg-[#f1f4fa] p-3 text-sm font-bold leading-relaxed text-[#626260]">
                    물어볼 말: {item.question}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-5 grid gap-3 rounded-[24px] border border-[#bfe8d0] bg-[#fbfffd] p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="text-xl font-black text-[#111111]">병원 창구에서 이렇게 확인하세요</h3>
                <p className="mt-2 text-base font-bold leading-relaxed text-[#626260]">
                  “이 검사는 급여인가요, 비급여인가요? 1회 금액과 예상 횟수는요? 급여 대안이 있나요?”
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
