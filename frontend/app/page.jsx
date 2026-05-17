"use client";

import { useCallback, useRef, useState } from "react";
import {
  HomeIcon,
  Hospital,
  Map,
  Pill,
  Settings,
  Volume2,
} from "lucide-react";

import { featureCards, nearbyHospitals, treatmentCosts } from "./constants";
import MedicineFlowScreen from "./components/MedicineFlowScreen";
import HospitalFlowScreen from "./components/HospitalFlowScreen";
import CostEstimateScreen from "./components/CostEstimateScreen";

const featureIconMap = { medicine: Pill, hospital: Map, cost: Hospital };

export default function Home() {
  const [view, setView] = useState("home");
  const [medicineStep, setMedicineStep] = useState("capture");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [hasHerbalMedicine, setHasHerbalMedicine] = useState(null);
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [hospitalStep, setHospitalStep] = useState("input");
  const [hospitalIndex, setHospitalIndex] = useState(0);
  const [costStep, setCostStep] = useState("body");
  const [selectedCostBody, setSelectedCostBody] = useState("허리");
  const [selectedTreatment, setSelectedTreatment] = useState("X-ray 검사");
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const speak = useCallback((message) => {
    if (!("speechSynthesis" in window)) {
      alert("이 브라우저에서는 음성 안내를 지원하지 않아요.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "ko-KR";
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleImage = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setMedicineStep("ocr");
  }, []);

  const goHome = useCallback(() => {
    setView("home");
    setMedicineStep("capture");
    setHospitalStep("input");
    setCostStep("body");
  }, []);

  const getGlobalVoiceGuide = useCallback(() => {
    if (view === "medicine") {
      if (medicineStep === "capture") return "약 봉투 또는 처방전을 촬영해주세요. 아래의 사진 촬영 버튼을 누르면 카메라 권한 확인 후 촬영할 수 있어요.";
      if (medicineStep === "review") return "인식된 약 이름과 조제일자를 확인해주세요. 집에 있는 다른 약도 추가할 수 있어요.";
      if (medicineStep === "herbal") return "한약을 함께 드시는지 예 또는 아니오로 알려주세요.";
      if (medicineStep === "result") return "약 복용 안전 확인 결과를 안내합니다. 주의 문구가 있으면 약사나 의사에게 확인하세요.";
      return "약 복용 안전 확인을 진행하고 있어요. 화면의 큰 파란 버튼을 눌러 다음 단계로 이동하세요.";
    }
    if (view === "hospital") {
      return "아픈 곳을 말하거나 선택하면 가까운 병원을 추천하고 교통약자에게 편한 길로 안내합니다.";
    }
    if (view === "cost") {
      if (costStep === "body") return "어떤 부위가 불편한지 선택해주세요. 어깨, 무릎, 허리 중에서 고를 수 있어요.";
      if (costStep === "treatment") return `${selectedCostBody} 통증에 대해 알고 싶은 치료나 검사를 선택해주세요.`;
      if (costStep === "estimate") return `${selectedCostBody} 부위의 ${selectedTreatment} 예상 비용은 ${treatmentCosts[selectedTreatment]} 정도예요. 병원마다 차이가 있을 수 있어요.`;
      if (costStep === "chat") return "궁금한 병원비를 말하거나, 예상 비용 안내를 음성으로 다시 들을 수 있어요.";
      return "아픈 부위와 치료 또는 검사를 선택하면 예상 병원비를 안내합니다.";
    }
    return "보약은 약 복용 확인, 병원 길찾기, 병원비 확인을 도와드려요. 필요한 큰 버튼을 눌러 시작하세요.";
  }, [view, medicineStep, costStep, selectedCostBody, selectedTreatment]);

  const handleMedicineBack = useCallback(() => {
    if (medicineStep === "capture") setView("home");
    else setMedicineStep("capture");
  }, [medicineStep]);

  const handleHospitalBack = useCallback(() => {
    if (hospitalStep === "input") setView("home");
    else setHospitalStep("input");
  }, [hospitalStep]);

  const handleSelectSymptom = useCallback(
    (symptom) => {
      setSelectedSymptom(symptom);
      setHospitalIndex(0);
      setHospitalStep("results");
      speak(`${symptom} 증상을 입력했어요. AI가 진료과를 판단하고 거리순으로 가까운 병원을 추천합니다.`);
    },
    [speak]
  );

  const handleSelectHospital = useCallback(
    (index) => {
      setHospitalIndex(index);
      setHospitalStep("select");
      speak(`${nearbyHospitals[index].name}을 선택했어요. 길안내를 시작할 수 있어요.`);
    },
    [speak]
  );

  const handleSelectBody = useCallback(
    (body) => {
      setSelectedCostBody(body);
      speak(`${body} 부위를 선택했어요. 알고 싶은 치료나 검사를 선택해주세요.`);
    },
    [speak]
  );

  const handleSelectTreatment = useCallback(
    (treatment) => {
      setSelectedTreatment(treatment);
      speak(`${treatment} 예상 비용은 ${treatmentCosts[treatment]} 정도예요. 병원마다 차이가 있을 수 있어요.`);
    },
    [speak]
  );

  const handleCostSpeak = useCallback(() => {
    speak(
      `${selectedCostBody} 부위의 ${selectedTreatment} 예상 비용은 ${treatmentCosts[selectedTreatment]} 정도예요. 건강보험 적용 여부와 병원에 따라 차이가 있을 수 있어요.`
    );
  }, [speak, selectedCostBody, selectedTreatment]);

  const handleCostAsk = useCallback(() => {
    speak("궁금한 병원비를 말씀해주세요. 예를 들어, MRI 비용은 얼마예요 라고 말할 수 있어요.");
  }, [speak]);

  return (
    <div className="min-h-screen bg-white text-boyak-ink">
      {/* Global voice button */}
      <button
        className="fixed bottom-5 right-5 z-50 grid size-16 place-items-center rounded-full bg-boyak-blue text-white shadow-soft transition active:scale-95 sm:bottom-7 sm:right-7 sm:size-20 lg:size-[72px]"
        type="button"
        aria-label="현재 화면 음성 안내 듣기"
        onClick={() => speak(getGlobalVoiceGuide())}
      >
        <Volume2 className="size-9 sm:size-11" strokeWidth={2.6} aria-hidden="true" />
      </button>

      {/* Header */}
      <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b-[3px] border-boyak-blue px-5 py-3 sm:min-h-24 sm:px-10 lg:min-h-[72px] lg:px-20 lg:py-2 xl:px-24">
        <button
          className="inline-flex min-h-10 items-center gap-3 text-xl font-extrabold text-boyak-blue sm:text-2xl lg:min-h-9 lg:text-xl"
          type="button"
          onClick={goHome}
        >
          <span className="grid size-9 place-items-center rounded-lg bg-boyak-blue text-2xl text-white sm:size-11 sm:text-3xl lg:size-9 lg:text-2xl">
            +
          </span>
          보약
        </button>
        <nav className="flex items-center justify-end gap-2 sm:gap-4" aria-label="상단 메뉴">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-base font-black text-boyak-muted sm:min-h-14 sm:text-xl lg:min-h-10 lg:text-lg"
            type="button"
            onClick={goHome}
          >
            <HomeIcon className="size-6" aria-hidden="true" />
            <span>홈</span>
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-base font-black text-boyak-muted sm:min-h-14 sm:text-xl lg:min-h-10 lg:text-lg"
            type="button"
            onClick={() => speak("설정에서는 글자 크기와 음성 안내 방식을 조절할 수 있게 만들 예정입니다.")}
          >
            <Settings className="size-6" aria-hidden="true" />
            <span>설정</span>
          </button>
        </nav>
      </header>

      {/* Main content */}
      <main
        className={
          view === "home"
            ? "px-5 pb-4 pt-5 sm:px-10 sm:py-6 lg:h-[calc(100vh-73px)] lg:overflow-hidden lg:px-24 lg:py-6"
            : "px-5 pb-16 pt-8 sm:px-10 lg:h-[calc(100vh-73px)] lg:overflow-hidden lg:px-16 lg:py-3 xl:px-20"
        }
      >
        {view === "home" && <HomeSection onNavigate={setView} onSpeak={speak} />}

        {view === "medicine" && (
          <MedicineFlowScreen
            step={medicineStep}
            previewUrl={previewUrl}
            hasHerbalMedicine={hasHerbalMedicine}
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            onImageChange={handleImage}
            onBack={handleMedicineBack}
            onStepChange={setMedicineStep}
            onHerbalChange={setHasHerbalMedicine}
            onSpeak={speak}
          />
        )}

        {view === "hospital" && (
          <HospitalFlowScreen
            step={hospitalStep}
            selectedSymptom={selectedSymptom}
            hospital={nearbyHospitals[hospitalIndex]}
            onBack={handleHospitalBack}
            onStepChange={setHospitalStep}
            onSelectSymptom={handleSelectSymptom}
            onSelectHospital={handleSelectHospital}
            onSpeak={speak}
          />
        )}

        {view === "cost" && (
          <CostEstimateScreen
            step={costStep}
            selectedBody={selectedCostBody}
            selectedTreatment={selectedTreatment}
            onBack={() => setView("home")}
            onStepChange={setCostStep}
            onSelectBody={handleSelectBody}
            onSelectTreatment={handleSelectTreatment}
            onSpeak={handleCostSpeak}
            onAsk={handleCostAsk}
          />
        )}
      </main>
    </div>
  );
}

function HomeSection({ onNavigate, onSpeak }) {
  return (
    <section aria-labelledby="home-title">
      <div className="mb-5 sm:mb-7">
        <p className="mb-2 text-sm font-extrabold text-boyak-muted sm:text-base">독거 어르신 복약 도우미</p>
        <h1 id="home-title" className="mb-2 text-3xl font-black leading-tight sm:text-4xl">
          안녕하세요!
        </h1>
        <p className="text-xl font-bold leading-relaxed text-boyak-muted sm:text-2xl">오늘도 안전하게 약을 확인해요</p>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3 lg:gap-8" aria-label="주요 기능">
        {featureCards.map((feature) => {
          const Icon = featureIconMap[feature.id];
          return (
            <button
              key={feature.id}
              className={`${feature.color} flex min-h-[118px] flex-col items-center justify-center rounded-xl px-4 py-4 text-center text-white shadow-soft transition-transform active:scale-[0.98] sm:min-h-[170px] lg:min-h-[250px] lg:px-6 lg:py-8`}
              type="button"
              onClick={() => onNavigate(feature.id)}
            >
              <span className="mb-3 text-3xl font-black leading-none lg:mb-6 lg:text-4xl">{feature.title}</span>
              <span className="grid size-14 place-items-center rounded-full bg-[#FFE68C] text-boyak-blue sm:size-20 lg:size-24">
                <Icon className="size-8 sm:size-10 lg:size-12" strokeWidth={2.8} aria-hidden="true" />
              </span>
              <span className="mt-3 text-lg font-black leading-snug sm:text-xl lg:mt-6 lg:text-2xl">{feature.copy}</span>
            </button>
          );
        })}
      </div>

      <aside className="flex flex-col gap-4 rounded-xl border border-[#C8DAF7] bg-[#EDF4FF] p-4 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div>
          <h2 className="mb-1 text-base font-black text-boyak-blue sm:text-lg">약손 박사의 한마디:</h2>
          <p className="text-lg font-extrabold leading-relaxed sm:text-xl lg:text-2xl">
            여러 병원 약을 함께 드실 땐 꼭 확인하세요.
          </p>
        </div>
        <button
          className="min-h-14 rounded-lg bg-boyak-blue px-6 text-lg font-black text-white sm:text-xl lg:min-h-[64px] lg:px-9"
          type="button"
          onClick={() => onSpeak("여러 병원 약을 함께 드실 땐 꼭 확인하세요.")}
        >
          한마디 듣기
        </button>
      </aside>
    </section>
  );
}
