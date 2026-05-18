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

import { featureCards, nearbyHospitals, treatmentCostDetails, treatmentCosts } from "./constants";
import MedicineFlowScreen from "./components/MedicineFlowScreen";
import HospitalFlowScreen from "./components/HospitalFlowScreen";
import CostEstimateScreen from "./components/CostEstimateScreen";

const featureIconMap = { medicine: Pill, hospital: Map, cost: Hospital };
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001";

export default function Home() {
  const [view, setView] = useState("home");
  const [medicineStep, setMedicineStep] = useState("capture");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [medicinePhotoPreviews, setMedicinePhotoPreviews] = useState([]);
  const [medicineOcrResult, setMedicineOcrResult] = useState(null);
  const [medicineOcrError, setMedicineOcrError] = useState(null);
  const [isMedicineOcrLoading, setIsMedicineOcrLoading] = useState(false);
  const [medicineNormalizeResult, setMedicineNormalizeResult] = useState(null);
  const [medicineNormalizeError, setMedicineNormalizeError] = useState(null);
  const [selectedMedicineCandidates, setSelectedMedicineCandidates] = useState({});
  const [medicineSafetyResult, setMedicineSafetyResult] = useState(null);
  const [medicineSafetyError, setMedicineSafetyError] = useState(null);
  const [isMedicineSafetyLoading, setIsMedicineSafetyLoading] = useState(false);
  const [hasHerbalMedicine, setHasHerbalMedicine] = useState(null);
  const [medicineUserAge, setMedicineUserAge] = useState("");
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [hospitalStep, setHospitalStep] = useState("input");
  const [hospitalIndex, setHospitalIndex] = useState(0);
  const [costStep, setCostStep] = useState("body");
  const [selectedCostBody, setSelectedCostBody] = useState("허리");
  const [selectedTreatment, setSelectedTreatment] = useState("진찰 + X-ray + 약 처방 가능");
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
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const newPreviews = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID?.() ?? Date.now()}`,
      name: file.name,
      file,
      url: URL.createObjectURL(file),
    }));

    setMedicinePhotoPreviews((current) => {
      const next = [...current, ...newPreviews];
      setPreviewUrl(next.at(-1)?.url ?? null);
      return next;
    });
    setMedicineStep("capture");
    setMedicineOcrResult(null);
    setMedicineOcrError(null);
    setMedicineNormalizeResult(null);
    setMedicineNormalizeError(null);
    setSelectedMedicineCandidates({});
    setMedicineSafetyResult(null);
    setMedicineSafetyError(null);
    event.target.value = "";
  }, []);

  const goHome = useCallback(() => {
    setView("home");
    setMedicineStep("capture");
    setPreviewUrl(null);
    setMedicinePhotoPreviews([]);
    setMedicineOcrResult(null);
    setMedicineOcrError(null);
    setIsMedicineOcrLoading(false);
    setMedicineNormalizeResult(null);
    setMedicineNormalizeError(null);
    setSelectedMedicineCandidates({});
    setMedicineSafetyResult(null);
    setMedicineSafetyError(null);
    setIsMedicineSafetyLoading(false);
    setMedicineUserAge("");
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
      if (costStep === "estimate") return `${selectedCostBody} 부위의 ${selectedTreatment}은 ${treatmentCosts[selectedTreatment]} 정도예요. ${treatmentCostDetails[selectedTreatment]?.note ?? "병원마다 차이가 있을 수 있어요."}`;
      if (costStep === "chat") return "궁금한 병원비를 말하거나, 예상 비용 안내를 음성으로 다시 들을 수 있어요.";
      return "아픈 부위와 치료 또는 검사를 선택하면 예상 병원비를 안내합니다.";
    }
    return "보약은 약 복용 확인, 병원 길찾기, 병원비 확인을 도와드려요. 필요한 큰 버튼을 눌러 시작하세요.";
  }, [view, medicineStep, costStep, selectedCostBody, selectedTreatment]);

  const handleMedicineBack = useCallback(() => {
    if (medicineStep === "capture") setView("home");
    else setMedicineStep("capture");
  }, [medicineStep]);

  const handleMedicineAnalyze = useCallback(async () => {
    if (!medicinePhotoPreviews.length) {
      speak("먼저 약 봉투나 처방전 사진을 한 장 이상 찍어주세요.");
      return;
    }
    setIsMedicineOcrLoading(true);
    setMedicineOcrError(null);
    setMedicineOcrResult(null);
    setMedicineNormalizeResult(null);
    setMedicineNormalizeError(null);
    setSelectedMedicineCandidates({});
    setMedicineSafetyResult(null);
    setMedicineSafetyError(null);
    setMedicineStep("ocr");
    if (medicinePhotoPreviews.length === 1) {
      speak("사진 한 장을 바로 분석합니다.");
    } else {
      speak(`${medicinePhotoPreviews.length}장 사진을 한 묶음으로 모아서 분석합니다.`);
    }

    try {
      const formData = new FormData();
      medicinePhotoPreviews.forEach((photo) => formData.append("files", photo.file, photo.name));
      const response = await fetch(`${API_BASE_URL}/api/ocr/medicine-bags`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || data.ok === false) {
        throw new Error(data.reason || "OCR 분석에 실패했어요.");
      }

      const medicineNames = (data.medicine_bags || []).flatMap((bag) => bag.medicine_names || []).filter(Boolean);
      let normalizeData = null;
      if (medicineNames.length) {
        const normalizeResponse = await fetch(`${API_BASE_URL}/api/medicines/normalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ medicine_names: medicineNames }),
        });
        normalizeData = await normalizeResponse.json();
        if (!normalizeResponse.ok || normalizeData.ok === false) {
          throw new Error(normalizeData.reason || "약 후보 확인에 실패했어요.");
        }
        const initialSelected = {};
        normalizeData.items?.forEach((item, index) => {
          if (item.top_candidate) initialSelected[index] = item.top_candidate;
        });
        setSelectedMedicineCandidates(initialSelected);
      }

      setMedicineOcrResult(data);
      setMedicineNormalizeResult(normalizeData);
      setMedicineStep("review");
      speak("사진 분석이 끝났어요. 약 후보가 맞는지 확인해주세요.");
    } catch (error) {
      setMedicineOcrError(error.message || "OCR 분석에 실패했어요.");
      setMedicineNormalizeError(error.message || "약 후보 확인에 실패했어요.");
      setMedicineStep("review");
      speak("사진 분석에 실패했어요. 화면의 안내를 확인해주세요.");
    } finally {
      setIsMedicineOcrLoading(false);
    }
  }, [medicinePhotoPreviews, speak]);

  const handleMedicineResetPhotos = useCallback(() => {
    setPreviewUrl(null);
    setMedicinePhotoPreviews([]);
    setMedicineOcrResult(null);
    setMedicineOcrError(null);
    setIsMedicineOcrLoading(false);
    setMedicineNormalizeResult(null);
    setMedicineNormalizeError(null);
    setSelectedMedicineCandidates({});
    setMedicineSafetyResult(null);
    setMedicineSafetyError(null);
    setIsMedicineSafetyLoading(false);
    setMedicineUserAge("");
    speak("촬영한 사진을 비웠어요. 다시 촬영해주세요.");
  }, [speak]);

  const handleSelectMedicineCandidate = useCallback((index, candidate) => {
    setSelectedMedicineCandidates((current) => ({ ...current, [index]: candidate }));
  }, []);

  const handleRunMedicineSafetyCheck = useCallback(async () => {
    const selected = (medicineNormalizeResult?.items || [])
      .map((item, index) => {
        const candidate = selectedMedicineCandidates[index];
        if (!candidate) return null;
        return {
          display_name: candidate.alias || item.input,
          product_code: candidate.product_code,
          ingredient_code: candidate.ingredient_code,
        };
      })
      .filter(Boolean);

    if (!selected.length) {
      setMedicineSafetyError("선택된 약 후보가 없어요. 약 이름을 다시 확인해주세요.");
      speak("선택된 약 후보가 없어요. 약 이름을 다시 확인해주세요.");
      return;
    }

    const parsedAge = Number.parseInt(medicineUserAge, 10);
    if (!Number.isFinite(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setMedicineSafetyError("나이를 숫자로 입력해주세요.");
      speak("나이를 숫자로 입력해주세요.");
      return;
    }

    setIsMedicineSafetyLoading(true);
    setMedicineSafetyError(null);
    setMedicineSafetyResult(null);
    setMedicineStep("dur");

    try {
      const response = await fetch(`${API_BASE_URL}/api/safety/check-selected`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_medicines: selected,
          age: parsedAge,
          has_herbal_medicine: hasHerbalMedicine === true,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.ok === false) {
        throw new Error(data.reason || "DUR 분석에 실패했어요.");
      }
      setMedicineSafetyResult(data);
      setMedicineStep("result");
      speak("DUR 분석이 끝났어요. 결과를 확인해주세요.");
    } catch (error) {
      setMedicineSafetyError(error.message || "DUR 분석에 실패했어요.");
      setMedicineStep("result");
      speak("DUR 분석에 실패했어요. 화면 안내를 확인해주세요.");
    } finally {
      setIsMedicineSafetyLoading(false);
    }
  }, [hasHerbalMedicine, medicineNormalizeResult, selectedMedicineCandidates, medicineUserAge, speak]);

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
      speak(`${treatment}은 ${treatmentCosts[treatment]} 정도예요. ${treatmentCostDetails[treatment]?.note ?? "병원마다 차이가 있을 수 있어요."}`);
    },
    [speak]
  );

  const handleCostSpeak = useCallback(() => {
    speak(
      `${selectedCostBody} 부위의 ${selectedTreatment}은 ${treatmentCosts[selectedTreatment]} 정도예요. ${treatmentCostDetails[selectedTreatment]?.note ?? "건강보험 적용 여부와 병원에 따라 차이가 있을 수 있어요."}`
    );
  }, [speak, selectedCostBody, selectedTreatment]);

  const handleCostAsk = useCallback(() => {
    speak("궁금한 병원비를 말씀해주세요. 예를 들어, MRI도 건강보험이 되나요 라고 말할 수 있어요.");
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
            photoPreviews={medicinePhotoPreviews}
            ocrResult={medicineOcrResult}
            ocrError={medicineOcrError}
            normalizeResult={medicineNormalizeResult}
            normalizeError={medicineNormalizeError}
            selectedCandidates={selectedMedicineCandidates}
            safetyResult={medicineSafetyResult}
            safetyError={medicineSafetyError}
            isSafetyLoading={isMedicineSafetyLoading}
            isOcrLoading={isMedicineOcrLoading}
            hasHerbalMedicine={hasHerbalMedicine}
            userAge={medicineUserAge}
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            onImageChange={handleImage}
            onAnalyzePhotos={handleMedicineAnalyze}
            onResetPhotos={handleMedicineResetPhotos}
            onSelectCandidate={handleSelectMedicineCandidate}
            onRunSafetyCheck={handleRunMedicineSafetyCheck}
            onBack={handleMedicineBack}
            onStepChange={setMedicineStep}
            onHerbalChange={setHasHerbalMedicine}
            onAgeChange={setMedicineUserAge}
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
