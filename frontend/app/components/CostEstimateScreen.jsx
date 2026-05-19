"use client";

import { memo, useCallback, useRef, useState } from "react";
import { Mic, Send, Volume2 } from "lucide-react";

import {
  costBodyOptions,
  costFlowSteps,
  treatmentCostDetails,
  treatmentCosts,
  treatmentOptions,
} from "../constants";
import BackButton from "./BackButton";
import StepLabel from "./StepLabel";

// 챗봇 Q&A 매핑
const COST_QA = [
  {
    keywords: ["mri", "MRI"],
    answer: "MRI는 의사가 진찰 후 필요하다고 판단해야 급여 적용이 됩니다. 첫 방문엔 보통 X-ray를 먼저 찍습니다. 급여 MRI는 부위에 따라 본인부담 약 2~10만원대예요.",
  },
  {
    keywords: ["보험", "건강보험", "급여"],
    answer: "건강보험 적용 시 의원 외래는 30% 본인부담입니다. 65세 이상은 일부 항목에서 더 낮게 적용돼요. 비급여 항목은 전액 본인 부담입니다.",
  },
  {
    keywords: ["약국", "약값", "처방약", "처방전"],
    answer: "병원 처방전으로 약국에서 받는 약값은 진료비와 별도입니다. 30일치 기준 보통 5천~3만원대이며, 약 종류에 따라 크게 다릅니다.",
  },
  {
    keywords: ["주사", "뼈주사", "프롤로"],
    answer: "주사 치료비는 종류마다 크게 다릅니다. 기본 근육주사는 몇천원, 뼈주사나 프롤로 치료는 수만원~수십만원까지 차이가 납니다.",
  },
  {
    keywords: ["물리치료", "재활", "전기치료", "열치료"],
    answer: "기본 물리치료(열치료, 전기치료)는 1일 기준 65세 이상 약 1천~2천원대입니다. 횟수와 종류는 주치의와 상담하세요.",
  },
  {
    keywords: ["야간", "공휴일", "주말", "저녁"],
    answer: "야간·공휴일에는 진료비가 약 30% 추가됩니다. 가급적 주간 평일에 방문하시는 게 비용을 아낄 수 있어요.",
  },
  {
    keywords: ["입원", "입원비"],
    answer: "입원은 외래보다 본인부담 계산이 복잡합니다. 급여 항목 기준 20~60%이며 상급병실·비급여는 별도로 청구돼요.",
  },
  {
    keywords: ["한방", "한의원", "침", "뜸"],
    answer: "한의원은 건강보험 적용 항목이 다릅니다. 침·뜸은 일부 급여 적용되며 본인부담은 약 1천~3천원대예요. 단, 한의원마다 비급여 항목이 다를 수 있어요.",
  },
];

function getCostAnswer(question) {
  const q = (question || "").toLowerCase();
  for (const qa of COST_QA) {
    if (qa.keywords.some((kw) => q.includes(kw.toLowerCase()))) {
      return qa.answer;
    }
  }
  return `"${question}"에 대한 정확한 답변은 병원 원무과 또는 건강보험공단 콜센터(1577-1000)에서 확인하실 수 있어요.`;
}

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
  const selectedDetail = treatmentCostDetails[selectedTreatment] ?? treatmentCostDetails["기타 문의"];

  // 챗봇 상태
  const [messages, setMessages] = useState([
    { role: "bot", text: "궁금한 병원비를 입력하거나 말해주세요. 예: MRI도 건강보험 돼요?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const sendMessage = useCallback((text) => {
    const userText = text.trim();
    if (!userText) return;
    const answer = getCostAnswer(userText);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: userText },
      { role: "bot", text: answer },
    ]);
    setChatInput("");
    onSpeak(answer);
  }, [onSpeak]);

  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      onSpeak("이 브라우저는 음성 인식을 지원하지 않아요.");
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "ko-KR";
    rec.continuous = false;
    rec.interimResults = false;
    recognitionRef.current = rec;
    setIsListening(true);
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setIsListening(false);
      recognitionRef.current = null;
      sendMessage(text);
    };
    rec.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
      onSpeak("음성을 인식하지 못했어요.");
    };
    rec.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    rec.start();
  }, [sendMessage, onSpeak]);

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
            className="mx-auto w-full max-w-[760px] rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:max-w-[840px] lg:p-5"
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
            {/* 말하기 버튼 */}
            <button
              className={`mt-4 inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 px-5 text-xl font-black transition lg:min-h-14 lg:text-lg ${
                isListening
                  ? "border-boyak-orange bg-[#FFF3E8] text-boyak-orange"
                  : "border-boyak-line bg-white"
              }`}
              type="button"
              onClick={startVoice}
            >
              <Mic
                className={`size-8 lg:size-7 ${isListening ? "animate-pulse text-boyak-orange" : "text-boyak-orange"}`}
                strokeWidth={2.4}
                aria-hidden="true"
              />
              {isListening ? "듣는 중... (다시 누르면 취소)" : "말하기"}
            </button>
          </section>
        )}

        {step === "treatment" && (
          <section
            className="mx-auto w-full max-w-[760px] rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:max-w-[840px] lg:p-5"
            aria-labelledby="cost-step-2"
          >
            <StepLabel number="2" title="진료 흐름 선택" />
            <h2 id="cost-step-2" className="mb-6 text-center text-3xl font-black leading-relaxed lg:mb-4 lg:text-3xl">
              {selectedBody} 통증, 어떤 경우가 궁금하세요?
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {treatmentOptions.map((treatment) => {
                const isSelected = selectedTreatment === treatment;
                const isWide = treatment === "기타 문의" || treatment.includes("물리치료");
                const detail = treatmentCostDetails[treatment];
                return (
                  <button
                    key={treatment}
                    className={`min-h-24 rounded-2xl border-2 px-5 py-4 text-left active:scale-[0.98] md:mx-0 lg:min-h-[74px] lg:py-3 ${
                      isWide ? "md:col-span-2 md:w-full" : ""
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
                    <span className="block text-2xl font-black leading-tight lg:text-xl">{treatment}</span>
                    <span className="mt-2 block text-base font-extrabold leading-snug text-boyak-muted lg:text-sm">
                      {detail?.subtitle}
                    </span>
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
            className="mx-auto w-full max-w-[760px] rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:max-w-[840px] lg:p-5"
            aria-labelledby="cost-step-3"
          >
            <StepLabel number="3" title="예상 비용 안내" />
            <h2 id="cost-step-3" className="mb-4 text-center text-2xl font-black lg:text-3xl">
              병원 창구 예상 비용
            </h2>
            <div className="mb-4 rounded-2xl bg-[#EFFAF4] p-6 text-center text-4xl font-black leading-snug text-[#16804D] lg:p-5 lg:text-4xl">
              {selectedCost}
            </div>
            <div className="mb-4 rounded-2xl border-2 border-[#BFE8D0] bg-white p-5 lg:p-4">
              <p className="text-xl font-black text-boyak-ink lg:text-lg">{selectedTreatment}</p>
              <p className="mt-2 text-lg font-extrabold leading-relaxed text-[#16804D] lg:text-base">
                {selectedDetail.range}
              </p>
              <p className="mt-2 text-base font-bold leading-relaxed text-boyak-muted lg:text-sm">
                {selectedDetail.note}
              </p>
              <p className="mt-3 rounded-xl bg-boyak-field px-4 py-2 text-sm font-extrabold text-boyak-muted">
                근거: {selectedDetail.codes}
              </p>
            </div>
            <dl className="grid gap-3 text-lg font-extrabold lg:gap-2 lg:text-base">
              {[
                "진찰만",
                "진찰 + X-ray + 약 처방 가능",
                "진찰 + X-ray + 물리치료 + 약 처방 가능",
              ].map((item) => (
                <div key={item} className="flex justify-between gap-4 rounded-xl bg-boyak-field px-4 py-3 lg:py-2.5">
                  <dt>{item}</dt>
                  <dd className="text-right text-boyak-orange">{treatmentCosts[item]}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 rounded-xl bg-[#F1F4FA] p-4 text-lg font-bold text-boyak-muted lg:p-3 lg:text-base">
              약국 약값, 주사, 추가 촬영, 야간/공휴일 가산은 별도예요.
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
                더 궁금한 게 있어요
              </button>
            </div>
          </section>
        )}

        {step === "chat" && (
          <section
            className="mx-auto w-full max-w-[760px] rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:max-w-[840px] lg:p-5"
            aria-labelledby="cost-step-4"
          >
            <StepLabel number="4" title="추가 설명" />
            <h2 id="cost-step-4" className="mb-4 text-center text-2xl font-black lg:text-3xl">
              챗봇에게 물어보기
            </h2>

            {/* 채팅 말풍선 */}
            <div className="mb-4 flex max-h-[320px] flex-col gap-3 overflow-y-auto rounded-2xl border border-boyak-line bg-[#F8F9FA] p-4 lg:max-h-[240px]">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-lg font-bold leading-relaxed lg:text-base ${
                      msg.role === "user"
                        ? "bg-boyak-orange text-white"
                        : "bg-white text-boyak-ink shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* 입력창 */}
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border-2 border-boyak-line px-4 py-3 text-xl font-bold outline-none focus:border-boyak-orange lg:text-lg"
                type="text"
                placeholder="예: MRI도 건강보험 돼요?"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(chatInput)}
              />
              <button
                className={`rounded-xl px-4 py-3 text-white transition ${isListening ? "bg-red-500" : "bg-boyak-muted"}`}
                type="button"
                onClick={startVoice}
                aria-label="음성 입력"
              >
                <Mic className={`size-7 ${isListening ? "animate-pulse" : ""}`} strokeWidth={2.4} />
              </button>
              <button
                className="rounded-xl bg-boyak-orange px-4 py-3 text-white disabled:opacity-40"
                type="button"
                disabled={!chatInput.trim()}
                onClick={() => sendMessage(chatInput)}
                aria-label="전송"
              >
                <Send className="size-7" strokeWidth={2.4} />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {["MRI 급여 기준", "약국 약값", "야간 진료비", "물리치료비"].map((q) => (
                <button
                  key={q}
                  className="rounded-xl border border-boyak-line bg-white px-4 py-2 text-lg font-black text-boyak-ink lg:text-base"
                  type="button"
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </button>
              ))}
            </div>

            <button
              className="mt-4 min-h-14 w-full rounded-2xl bg-boyak-orange px-6 text-xl font-black text-white lg:min-h-12 lg:text-lg"
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
