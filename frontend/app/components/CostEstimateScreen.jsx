"use client";

import { memo } from "react";
import { Calculator, Check, CircleHelp } from "lucide-react";

import {
  commonCostQuestions,
  costFlowSteps,
  treatmentCostDetails,
  treatmentCosts,
} from "../constants";
import BackButton from "./BackButton";

const COST_STEP_KEYS = ["estimate", "chat"];
const FIRST_VISIT_ITEMS = [
  "진찰만 받는 경우",
  "진찰, 엑스레이, 처방전을 받는 경우",
  "진찰, 엑스레이, 물리치료, 처방전을 받는 경우",
];

function CostEstimateScreen({
  step,
  onBack,
  onStepChange,
}) {
  const currentIndex = Math.max(0, COST_STEP_KEYS.indexOf(step));

  return (
    <section className="cost-shell lg:flex lg:h-full lg:flex-col" aria-labelledby="cost-title">
      <BackButton onClick={onBack} />
      <CostPageHeader />
      <CostTabs activeIndex={currentIndex} onStepChange={onStepChange} />

      <div className="w-full lg:min-h-0 lg:flex-1">
        {step === "estimate" && (
          <CostTabPanel id="cost-panel-estimate" labelledBy="cost-tab-estimate">
            <CostSectionHeader
              titleId="first-visit-cases"
              title="병원 첫 방문 시 예상 비용은 이렇게 달라져요"
              badge="병원 창구 결제 기준"
            />

            <div className="grid gap-5 lg:grid-cols-3 xl:gap-6">
              {FIRST_VISIT_ITEMS.map((item, index) => (
                <CostExampleCard key={item} index={index} item={item} />
              ))}
            </div>
          </CostTabPanel>
        )}

        {step === "chat" && (
          <CostTabPanel id="cost-panel-chat" labelledBy="cost-tab-chat">
            <CostSectionHeader
              titleId="chat-cost-cases"
              title="재방문, 시간대, 나이에 따라 창구 부담이 달라질 수 있어요"
            />

            <div className="grid gap-5 md:grid-cols-3 xl:gap-6">
              {commonCostQuestions.map((item, index) => (
                <CostQuestionCard key={item.title} index={index} item={item} />
              ))}
            </div>
          </CostTabPanel>
        )}
      </div>
    </section>
  );
}

function CostPageHeader() {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 text-boyak-orange lg:mb-4">
      <span className="grid size-12 place-items-center rounded-[14px] bg-boyak-orange text-white lg:size-10">
        <Calculator className="size-7 lg:size-6" strokeWidth={2.8} aria-hidden="true" />
      </span>
      <div>
        <h1 id="cost-title" className="text-3xl font-black leading-tight tracking-[-0.04em] text-[#111111] sm:text-4xl lg:text-3xl">
          병원비 예상 비용 확인
        </h1>
      </div>
    </div>
  );
}

function CostTabs({ activeIndex, onStepChange }) {
  return (
    <div className="mb-5 grid gap-3 rounded-[22px] bg-white p-2 md:grid-cols-2 lg:mb-4 lg:gap-3" role="tablist" aria-label="병원비 안내 탭">
      {costFlowSteps.map((label, index) => {
        const stepKey = COST_STEP_KEYS[index];
        const isActive = index === activeIndex;
        return (
          <button
            key={label}
            id={`cost-tab-${stepKey}`}
            className={`boyak-h4 min-h-14 rounded-[18px] border px-4 text-center font-black transition lg:px-4 ${
              isActive
                ? "border-boyak-orange bg-[#FFF3E8] text-boyak-orange"
                : "border-[#dedbd6] bg-white text-[#7b7b78]"
            }`}
            type="button"
            onClick={() => onStepChange(stepKey)}
            role="tab"
            aria-selected={isActive}
            aria-controls={`cost-panel-${stepKey}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function CostTabPanel({ id, labelledBy, children }) {
  return (
    <section
      id={id}
      className="mx-auto w-full bg-white sm:px-4 lg:px-6 xl:px-8"
      aria-labelledby={labelledBy}
      role="tabpanel"
    >
      {children}
    </section>
  );
}

function CostSectionHeader({ titleId, title, badge }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id={titleId} className="boyak-h3 flex items-start gap-2 font-black text-[#111111]">
          <Check className="mt-1 size-7 shrink-0 text-[#16804D] lg:size-6" strokeWidth={3.2} aria-hidden="true" />
          {title}
        </h2>
      </div>
      {badge && <span className="self-start rounded-full bg-[#ecfdf3] px-4 py-2 text-base font-black text-[#16804D]">{badge}</span>}
    </div>
  );
}

function CostExampleCard({ index, item }) {
  const detail = treatmentCostDetails[item];
  return (
    <article className="flex min-h-[230px] flex-col rounded-[24px] border border-[#dedbd6] bg-white p-5 text-left xl:p-6">
      <NumberedCardHeader
        number={index + 1}
        titleClassName="boyak-h4 font-black text-[#111111]"
      >
        {item}
      </NumberedCardHeader>
      <p className="whitespace-pre-line rounded-[18px] bg-[#FFF3E8] px-4 py-4 text-xl font-extrabold leading-tight text-[#4f4f4c] lg:text-lg xl:text-xl">
        {treatmentCosts[item]}
      </p>
      <p className="mt-4 text-base font-bold leading-relaxed text-[#626260]">
        {detail.note}
      </p>
    </article>
  );
}

function CostQuestionCard({ index, item }) {
  return (
    <article className="flex min-h-[280px] flex-col rounded-[24px] border border-[#dedbd6] bg-white p-5 xl:p-6">
      <NumberedCardHeader
        number={index + 1}
        align="center"
        titleAs="h3"
        titleClassName="boyak-h4 font-black text-[#111111]"
      >
        {item.title}
      </NumberedCardHeader>
      <p className="rounded-[18px] bg-[#FFF3E8] px-4 py-3 text-xl font-extrabold leading-tight text-[#4f4f4c] lg:text-lg xl:text-xl">
        {item.price}
      </p>
      <p className="mt-4 min-h-[5.25rem] text-base font-bold leading-relaxed text-[#626260]">
        {item.guide}
      </p>
      <div className="mt-5 grid grid-cols-[1.5rem_1fr] gap-x-2 rounded-[16px] bg-[#f1f4fa] p-3">
        <CircleHelp className="row-span-2 size-6 shrink-0 text-boyak-orange" aria-hidden="true" />
        <span className="self-center text-sm font-black leading-tight text-[#777a80]">창구에 이렇게 물어보세요</span>
        <p className="mt-1 text-base font-bold leading-relaxed text-[#4f4f4c]">
          {item.question}
        </p>
      </div>
    </article>
  );
}

function NumberedCardHeader({
  number,
  children,
  align = "start",
  titleAs: TitleTag = "h3",
  titleClassName = "",
}) {
  const alignmentClass = align === "center" ? "items-center" : "items-start";

  return (
    <div className={`mb-4 grid grid-cols-[2.5rem_1fr] ${alignmentClass} gap-3`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-boyak-orange text-lg font-black leading-none text-white">
        {number}
      </span>
      <TitleTag className={titleClassName}>{children}</TitleTag>
    </div>
  );
}

export default memo(CostEstimateScreen);
