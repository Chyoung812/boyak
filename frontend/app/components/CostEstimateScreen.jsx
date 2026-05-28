"use client";

import { memo, useCallback, useRef, useState } from "react";
import { Calculator, Mic, Send } from "lucide-react";

import {
  API_BASE_URL,
  costFlowSteps,
  treatmentCostDetails,
  treatmentCosts,
  treatmentOptions,
} from "../constants";
import BackButton from "./BackButton";
import StepLabel from "./StepLabel";

function formatCostBotText(data) {
  const sourceText = data?.sources?.length ? `\n\n참고 데이터: ${data.sources.join(", ")}` : "";
  const disclaimer = data?.disclaimer ? `\n\n※ ${data.disclaimer}` : "";
  return `${data?.answer ?? "답변을 만들지 못했어요."}${sourceText}${disclaimer}`;
}

function fallbackCostAnswer(question) {
  return `"${question}" 질문은 병원 원무과/건강보험공단(1577-1000)에 확인이 필요해요. 추가 검사·치료는 급여/비급여, 1회 금액, 예상 횟수, 급여 대안을 물어보세요.`;
}

function CostEstimateScreen({
  step,
  selectedTreatment,
  onBack,
  onStepChange,
  onSelectTreatment,
  onSpeak,
  apiBaseUrl = API_BASE_URL,
}) {
  const costStepKeys = ["estimate", "chat"];
  const currentIndex = Math.max(0, costStepKeys.indexOf(step));
  const currentStepLabel = costFlowSteps[currentIndex] ?? costFlowSteps[0];
  const selectedCost = treatmentCosts[selectedTreatment];
  const selectedDetail = treatmentCostDetails[selectedTreatment] ?? treatmentCostDetails["기타 문의"];

  const [messages, setMessages] = useState([
    { role: "bot", text: "궁금한 병원비를 입력하거나 말해주세요. 예: MRI도 건강보험 돼요?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "MRI 급여 기준",
    "수가기준 데이터가 뭐예요?",
    "진료과 통계는 초진비로 써도 돼요?",
    "비급여면 실손 되나요?",
  ]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const sendMessage = useCallback(async (text) => {
    const userText = text.trim();
    if (!userText || isChatLoading) return;
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setChatInput("");
    setIsChatLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/costs/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userText,
          body: "통증",
          treatment: selectedTreatment,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const answer = formatCostBotText(data);
      setMessages((prev) => [...prev, { role: "bot", text: answer }]);
      if (Array.isArray(data.suggested_questions) && data.suggested_questions.length) {
        setSuggestedQuestions(data.suggested_questions.slice(0, 4));
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "bot", text: fallbackCostAnswer(userText) }]);
    } finally {
      setIsChatLoading(false);
    }
  }, [apiBaseUrl, selectedTreatment, isChatLoading]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      return true;
    }
    return false;
  }, []);

  const handleBack = useCallback(() => {
    stopRecording();
    onBack();
  }, [onBack, stopRecording]);

  const toggleVoice = useCallback(async () => {
    if (isListening) {
      stopRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        onSpeak("목소리를 분석하고 있어요. 잠시만 기다려주세요.");
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");

        try {
          const res = await fetch(`${apiBaseUrl}/api/ai/stt`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.ok && data.text) {
            setChatInput(data.text);
            sendMessage(data.text);
          } else {
            onSpeak("음성 분석에 실패했어요. 다시 시도해 주세요.");
          }
        } catch (e) {
          onSpeak("서버 오류가 발생했어요. 다시 시도해 주세요.");
        } finally {
          mediaRecorderRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      onSpeak("말씀하신 뒤 마이크 버튼을 한 번 더 눌러주세요.");
    } catch (e) {
      setIsListening(false);
      onSpeak("마이크 접근 권한이 없거나 지원하지 않는 기기입니다.");
    }
  }, [apiBaseUrl, isListening, onSpeak, sendMessage, stopRecording]);

  return (
    <section className="cost-shell lg:flex lg:h-full lg:flex-col" aria-labelledby="cost-title">
      <BackButton onClick={handleBack} />
      <div className="mb-5 flex flex-wrap items-center gap-3 text-[#ff5600] lg:mb-4">
        <span className="grid size-12 place-items-center rounded-[14px] bg-[#ff5600] text-white shadow-[0_10px_24px_rgba(255,86,0,0.22)] lg:size-10">
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
          <div
            key={label}
            className={`flex min-h-14 items-center rounded-[18px] border px-4 text-base font-black transition lg:min-h-12 lg:px-3 lg:text-sm ${
              index <= currentIndex
                ? "border-[#ff5600] bg-[#fff1e8] text-[#ff5600] shadow-[0_8px_22px_rgba(255,86,0,0.10)]"
                : "border-[#dedbd6] bg-white/80 text-[#7b7b78]"
            }`}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            <span className="mr-3 inline-grid size-7 place-items-center rounded-full bg-[#ff5600] text-sm text-white lg:size-6 lg:text-xs">
              {index + 1}
            </span>
            {label}
          </div>
        ))}
      </div>

      <div className="lg:flex lg:min-h-0 lg:flex-1 lg:items-start lg:justify-center">
        {step === "estimate" && (
          <section
            className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-[32px] border border-[#dedbd6] bg-[#faf9f6] p-5 shadow-[0_24px_70px_rgba(17,17,17,0.10)] lg:p-6"
            aria-labelledby="cost-step-1"
          >
            <StepLabel number="1" title="병원비 안내" />
            <div className="mb-6 rounded-[28px] bg-white px-6 py-7 text-center shadow-[inset_0_0_0_1px_rgba(222,219,214,0.85)]">
              <p className="mb-3 text-sm font-black tracking-[0.18em] text-[#ff5600]">FIRST VISIT COST</p>
              <h2 id="cost-step-1" className="mx-auto max-w-3xl text-4xl font-black leading-tight tracking-[-0.045em] text-[#111111] lg:text-4xl">
                통증 첫 방문, 경우의 수만 쉽게
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-lg font-extrabold leading-relaxed text-[#626260] lg:text-base">
                흔한 기본 흐름을 하나로 정리했어요. 병원 창구 결제 기준이며 약국 약값은 제외했어요.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="grid content-start gap-3">
                {treatmentOptions.map((treatment) => {
                  const isSelected = selectedTreatment === treatment;
                  const detail = treatmentCostDetails[treatment];
                  return (
                    <button
                      key={treatment}
                      className={`group min-h-[82px] rounded-[22px] border px-5 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(17,17,17,0.08)] active:scale-[0.985] lg:min-h-[74px] lg:py-3 ${
                        isSelected
                          ? "border-[#ff5600] bg-[#fff1e8] text-[#ff5600] shadow-[0_12px_28px_rgba(255,86,0,0.12)]"
                          : "border-[#dedbd6] bg-white text-[#111111]"
                      }`}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onSelectTreatment(treatment)}
                    >
                      <span className="block text-2xl font-black leading-tight tracking-[-0.03em] lg:text-xl">{treatment}</span>
                      <span className="mt-2 block text-base font-extrabold leading-snug text-[#626260] lg:text-sm">
                        {detail?.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[28px] border border-[#bfe8d0] bg-white p-5 shadow-[0_18px_50px_rgba(22,128,77,0.10)] lg:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-2xl font-black tracking-[-0.03em] text-[#111111] lg:text-2xl">
                    병원 창구 예상 비용
                  </h3>
                  <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-sm font-black text-[#16804D]">급여 기준</span>
                </div>
                <div className="mb-4 rounded-[24px] bg-gradient-to-br from-[#e9fff2] to-[#f7fffb] p-6 text-center text-4xl font-black leading-tight tracking-[-0.045em] text-[#16804D] shadow-[inset_0_0_0_1px_rgba(191,232,208,0.9)] lg:p-6 lg:text-4xl">
                  {selectedCost}
                </div>
                <div className="mb-4 rounded-[22px] border border-[#bfe8d0] bg-[#fbfffd] p-5 lg:p-4">
                  <p className="text-xl font-black tracking-[-0.02em] text-[#111111] lg:text-lg">{selectedTreatment}</p>
                  <p className="mt-2 text-lg font-extrabold leading-relaxed text-[#16804D] lg:text-base">
                    {selectedDetail.range}
                  </p>
                  <p className="mt-2 text-base font-bold leading-relaxed text-[#626260] lg:text-sm">
                    {selectedDetail.note}
                  </p>
                </div>
                <dl className="grid gap-2 text-lg font-extrabold lg:text-base">
                  {[
                    "진찰만",
                    "진찰 + X-ray + 처방전 받을 수 있음",
                    "진찰 + X-ray + 물리치료 + 처방전 받을 수 있음",
                  ].map((item) => (
                    <div key={item} className="flex justify-between gap-4 rounded-[16px] bg-[#f7f6f3] px-4 py-3 lg:py-2.5">
                      <dt>{item}</dt>
                      <dd className="text-right text-[#ff5600]">{treatmentCosts[item]}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 rounded-[18px] bg-[#f1f4fa] p-4 text-lg font-bold leading-relaxed text-[#626260] lg:p-3 lg:text-base">
                  주사, 추가 촬영, 특수치료, 야간/공휴일 가산은 별도 확인이 필요해요.
                </p>
                <div className="mt-4 flex justify-center">
                  <button
                    className="min-h-16 w-full max-w-sm rounded-[18px] bg-[#111111] px-5 text-xl font-black text-white shadow-[0_14px_28px_rgba(17,17,17,0.18)] transition hover:-translate-y-0.5 hover:bg-[#ff5600] lg:min-h-14 lg:text-lg"
                    type="button"
                    onClick={() => onStepChange("chat")}
                  >
                    급여·비급여 챗봇 연결하기
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {step === "chat" && (
          <section
            className="mx-auto w-full max-w-[860px] overflow-hidden rounded-[32px] border border-[#dedbd6] bg-[#faf9f6] p-5 shadow-[0_24px_70px_rgba(17,17,17,0.10)] lg:p-6"
            aria-labelledby="cost-step-2"
          >
            <StepLabel number="2" title="급여·비급여 챗봇" />
            <div className="mb-5 rounded-[28px] bg-white px-6 py-6 text-center shadow-[inset_0_0_0_1px_rgba(222,219,214,0.85)]">
              <p className="mb-2 text-sm font-black tracking-[0.18em] text-[#ff5600]">PUBLIC DATA Q&A</p>
              <h2 id="cost-step-2" className="text-3xl font-black leading-tight tracking-[-0.04em] text-[#111111] lg:text-4xl">
                급여·비급여 챗봇
              </h2>
              <p className="mt-3 text-base font-extrabold text-[#626260]">
                DB/공공데이터에 있는 급여·비급여 정보 안에서만 답하도록 제한해요.
              </p>
            </div>

            <div className="mb-4 flex max-h-[340px] flex-col gap-3 overflow-y-auto rounded-[24px] border border-[#dedbd6] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(250,249,246,0.9)] lg:max-h-[260px]">
              {messages.map((msg, i) => (
                <div key={`${msg.role}-${i}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-[20px] px-4 py-3 text-lg font-bold leading-relaxed lg:text-base ${
                      msg.role === "user"
                        ? "bg-[#ff5600] text-white shadow-[0_10px_24px_rgba(255,86,0,0.18)]"
                        : "bg-[#f7f6f3] text-[#111111]"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-[20px] bg-[#f7f6f3] px-4 py-3 text-lg font-black text-[#626260] lg:text-base">
                    DB/공공데이터 기준으로 확인 중...
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 rounded-[22px] border border-[#dedbd6] bg-white p-2 shadow-[0_14px_32px_rgba(17,17,17,0.06)]">
              <input
                className={`flex-1 rounded-[16px] border px-4 py-3 text-xl font-bold outline-none lg:text-lg ${
                  isListening ? "border-[#ff5600] bg-[#fff1e8]" : "border-[#dedbd6] bg-[#faf9f6] focus:border-[#ff5600]"
                }`}
                type="text"
                placeholder="예: MRI도 건강보험 돼요?"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(chatInput)}
              />
              <button
                className={`rounded-[16px] px-4 py-3 text-white transition ${isListening ? "bg-red-500" : "bg-[#626260]"}`}
                type="button"
                onClick={toggleVoice}
                aria-label="음성 입력"
              >
                <Mic className={`size-7 ${isListening ? "animate-pulse" : ""}`} strokeWidth={2.4} />
              </button>
              <button
                className="rounded-[16px] bg-[#111111] px-4 py-3 text-white transition hover:bg-[#ff5600] disabled:opacity-40"
                type="button"
                disabled={!chatInput.trim() || isChatLoading}
                onClick={() => sendMessage(chatInput)}
                aria-label="전송"
              >
                <Send className="size-7" strokeWidth={2.4} />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  className="rounded-full border border-[#dedbd6] bg-white px-4 py-2 text-lg font-black text-[#111111] transition hover:border-[#ff5600] hover:text-[#ff5600] lg:text-base"
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
              onClick={() => onStepChange("estimate")}
            >
              다른 경우 확인
            </button>
          </section>
        )}
      </div>
    </section>
  );
}

export default memo(CostEstimateScreen);
