"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HomeIcon,
  Hospital,
  ListChecks,
  Map,
  Pill,
  Settings,
  Type,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";

import { API_BASE_URL, doctorTips, featureCards, hospitalStepKeys, nearbyHospitals, treatmentCostDetails, treatmentCosts } from "./constants";
import MedicineFlowScreen from "./components/MedicineFlowScreen";
import HospitalFlowScreen from "./components/HospitalFlowScreen";
import CostEstimateScreen from "./components/CostEstimateScreen";
import BackButton from "./components/BackButton";

const featureIconMap = { medicine: Pill, hospital: Map, cost: Hospital };

function getPreferredKoreanVoice() {
  if (!("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  const koreanVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith("ko"));
  return (
    koreanVoices.find((voice) => /yuna|sora|female|premium|enhanced/i.test(voice.name)) ||
    koreanVoices.find((voice) => /google|microsoft|apple/i.test(voice.name)) ||
    koreanVoices[0] ||
    null
  );
}

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
  const [medicineDrugDescriptions, setMedicineDrugDescriptions] = useState(null);
  const [selectedMedicineCandidates, setSelectedMedicineCandidates] = useState({});
  const [medicineSafetyResult, setMedicineSafetyResult] = useState(null);
  const [medicineSafetyError, setMedicineSafetyError] = useState(null);
  const [isMedicineSafetyLoading, setIsMedicineSafetyLoading] = useState(false);
  const [hasHerbalMedicine, setHasHerbalMedicine] = useState(null);
  const [medicineUserAge, setMedicineUserAge] = useState("");
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [hospitalStep, setHospitalStep] = useState("input");
  const [hospitalIndex, setHospitalIndex] = useState(0);
  const [hospitals, setHospitals] = useState([]);
  const [isHospitalLoading, setIsHospitalLoading] = useState(false);
  const [hospitalDepartment, setHospitalDepartment] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedHomeMedicines, setSelectedHomeMedicines] = useState([]);
  const [costStep, setCostStep] = useState("body");
  const [selectedCostBody, setSelectedCostBody] = useState("허리");
  const [selectedTreatment, setSelectedTreatment] = useState("진찰 + X-ray + 약 처방 가능");
  const [fontSizeLevel, setFontSizeLevel] = useState("normal");
  const [voiceGuideStyle, setVoiceGuideStyle] = useState("friendly");
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const speak = useCallback((message) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "ko-KR";
    const preferredVoice = getPreferredKoreanVoice();
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 0.84;
    utterance.pitch = 0.95;
    utterance.volume = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const handleImage = useCallback((event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    stopSpeaking();

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
  }, [stopSpeaking]);

  const goHome = useCallback(() => {
    stopSpeaking();
    setView("home");
    setMedicineStep("capture");
    setPreviewUrl(null);
    setMedicinePhotoPreviews([]);
    setMedicineOcrResult(null);
    setMedicineOcrError(null);
    setIsMedicineOcrLoading(false);
    setMedicineNormalizeResult(null);
    setMedicineNormalizeError(null);
    setMedicineDrugDescriptions(null);
    setSelectedMedicineCandidates({});
    setMedicineSafetyResult(null);
    setMedicineSafetyError(null);
    setIsMedicineSafetyLoading(false);
    setMedicineUserAge("");
    setHospitalStep("input");
    setHospitals([]);
    setHospitalDepartment("");
    setIsHospitalLoading(false);
    setSelectedHomeMedicines([]);
    setCostStep("body");
  }, [stopSpeaking]);

  const getGlobalVoiceGuide = useCallback(() => {
    const isSimpleVoice = voiceGuideStyle === "simple";
    if (view === "medicine") {
      if (medicineStep === "capture") {
        return isSimpleVoice
          ? "약 봉투나 처방전 사진을 촬영해주세요."
          : "약 봉투나 처방전 사진을 촬영해주세요. 여러 장이 있으면 모두 추가한 뒤 분석 버튼을 누르면 됩니다.";
      }
      if (medicineStep === "ocr") {
        return "사진에서 약 이름과 조제 정보를 읽는 중이에요. 잠시만 기다려주세요.";
      }
      if (medicineStep === "review") {
        return isSimpleVoice
          ? "인식된 약 후보가 맞는지 확인해주세요."
          : "인식된 약 이름과 후보를 확인해주세요. 같은 성분으로 확인된 약은 자동 선택되어 있고, 후보가 여러 개면 맞는 약을 골라주세요.";
      }
      if (medicineStep === "add") {
        return isSimpleVoice
          ? "집에 있는 다른 약이 있으면 선택해주세요."
          : "집에 있는 감기약, 소화제, 영양제도 함께 확인하려면 선택해주세요. 없으면 추가 없이 계속 진행하면 됩니다.";
      }
      if (medicineStep === "herbal") {
        return isSimpleVoice
          ? "나이와 한약 복용 여부를 선택해주세요."
          : "복용하시는 분의 나이를 입력하고, 한약을 함께 드시는지 선택해주세요. 이 정보로 주의해야 할 약을 더 정확히 확인합니다.";
      }
      if (medicineStep === "dur") {
        return isSimpleVoice
          ? "약 조합과 나이별 주의사항을 확인하는 중입니다."
          : "선택한 약들을 기준으로 함께 먹으면 안 되는 조합이나 나이에 주의가 필요한 약을 확인하는 중이에요.";
      }
      if (medicineStep === "result") {
        const resultMessage = medicineSafetyResult?.tts_text || medicineSafetyResult?.message;
        return isSimpleVoice
          ? resultMessage || "DUR 분석 결과를 확인해주세요."
          : resultMessage || "DUR 분석 결과를 확인해주세요. 주의 문구가 있으면 약사나 의사에게 확인하세요.";
      }
      return isSimpleVoice ? "약 복용 확인 화면입니다." : "약 복용 안전 확인을 진행하는 화면입니다.";
    }
    if (view === "hospital") {
      const displayHospitals = hospitals.length > 0 ? hospitals : nearbyHospitals;
      const selectedHospital = displayHospitals[hospitalIndex];
      const recommendedDepartment = hospitalDepartment || selectedHospital?.department || "정형외과";

      if (hospitalStep === "input") {
        return isSimpleVoice
          ? "아픈 부위를 선택하거나 말하기 버튼으로 증상을 말씀해주세요."
          : "어디가 불편하신지 알려주세요. 부위 버튼을 누르거나, 말하기 버튼으로 증상을 말씀하시면 가까운 병원을 찾아드릴게요.";
      }
      if (hospitalStep === "results") {
        return isSimpleVoice
          ? `${recommendedDepartment} 진료를 추천해요. 첫 번째 병원이 보행자 맞춤 추천 병원입니다.`
          : `${selectedSymptom ?? "입력한 증상"}에는 ${recommendedDepartment} 진료를 추천해요. 도보 시간, 거리, 길의 형태를 보고 병원을 고르실 수 있어요. 첫 번째 병원이 보행자 맞춤 추천 병원입니다.`;
      }
      if (hospitalStep === "select" && selectedHospital) {
        return isSimpleVoice
          ? `${selectedHospital.name}입니다. ${selectedHospital.walk}, ${selectedHospital.route}입니다.`
          : `${selectedHospital.name}을 선택하셨어요. 현재 위치에서 ${selectedHospital.walk}, 거리 ${selectedHospital.distance}이고, 경로는 ${selectedHospital.route}입니다. ${selectedHospital.stairs === 0 || selectedHospital.isFlat ? "계단이 없는 평지 경로예요." : `계단 ${selectedHospital.stairs ?? 0}개가 포함된 경로예요.`} 맞으면 길안내 시작 버튼을 눌러주세요.`;
      }
      if (hospitalStep === "route" && selectedHospital) {
        return isSimpleVoice
          ? "길안내 시작 버튼을 누르면 실시간 안내를 시작합니다."
          : `${selectedHospital.name}까지 가는 길안내 화면이에요. 준비가 되면 길안내 시작 버튼을 눌러주세요. 이동 중에는 화면보다 주변 길과 신호를 먼저 확인해주세요.`;
      }
      if (hospitalStep === "arrived") {
        return isSimpleVoice
          ? "목적지에 도착했어요. 길안내가 끝났습니다."
          : "목적지에 도착했어요. 수고하셨습니다. 길안내는 끝났고, 필요하면 처음으로 돌아가 다시 병원을 찾아볼 수 있어요.";
      }
      return isSimpleVoice ? "아픈 곳을 선택해주세요." : "아픈 곳을 말하거나 선택해주세요.";
    }
    if (view === "cost") {
      if (costStep === "body") {
        return isSimpleVoice
          ? "병원비를 예상할 부위를 선택해주세요."
          : "병원비를 예상해볼 부위를 먼저 선택해주세요. 허리, 무릎, 어깨 같은 버튼을 누르거나 말하기 버튼으로 말씀하실 수 있어요.";
      }
      if (costStep === "treatment") {
        return isSimpleVoice
          ? `${selectedCostBody} 부위의 진료 흐름을 선택해주세요.`
          : `${selectedCostBody} 부위에 대해 어떤 진료를 받을지 선택하는 화면이에요. 진찰만 볼지, 엑스레이나 물리치료까지 받을지에 따라 예상 비용이 달라집니다.`;
      }
      if (costStep === "estimate") {
        return isSimpleVoice
          ? `예상 병원비는 ${treatmentCosts[selectedTreatment]} 정도예요.`
          : `${selectedTreatment}의 예상 병원비는 ${treatmentCosts[selectedTreatment]} 정도예요. ${treatmentCostDetails[selectedTreatment]?.note ?? "실제 비용은 병원과 건강보험 적용 여부에 따라 달라질 수 있어요."}`;
      }
      if (costStep === "chat") {
        return isSimpleVoice
          ? "궁금한 병원비를 입력하거나 말해보세요."
          : "추가로 궁금한 병원비를 물어볼 수 있는 화면이에요. 입력창에 질문을 쓰거나 음성 입력 버튼을 눌러 질문해보세요.";
      }
      return isSimpleVoice ? "병원비 예상 화면입니다." : "부위와 진료 흐름을 선택하면 예상 병원비를 안내합니다.";
    }
    if (view === "settings") {
      return isSimpleVoice
        ? "글자 크기와 음성 안내 방식을 바꿀 수 있어요."
        : "설정 화면입니다. 글자 크기는 보통, 크게, 아주 크게 중에서 고를 수 있고, 음성 안내 방식은 친절하게 또는 간단하게로 바꿀 수 있어요.";
    }
    return isSimpleVoice
      ? "필요한 기능을 선택해주세요."
      : "약 복용 안전 확인, 병원 길찾기, 병원비 예상 중 필요한 기능을 선택해주세요.";
  }, [view, medicineStep, costStep, selectedCostBody, selectedTreatment, hospitalStep, hospitals, hospitalIndex, hospitalDepartment, selectedSymptom, medicineSafetyResult, voiceGuideStyle]);

  const handleMedicineBack = useCallback(() => {
    stopSpeaking();
    if (medicineStep === "capture") setView("home");
    else setMedicineStep("capture");
  }, [medicineStep, stopSpeaking]);

  const handleMedicineStepChange = useCallback(
    (nextStep) => {
      stopSpeaking();
      setMedicineStep(nextStep);
    },
    [stopSpeaking]
  );

  const handleMedicineAnalyze = useCallback(async () => {
    if (!medicinePhotoPreviews.length) {
      return;
    }
    stopSpeaking();
    setIsMedicineOcrLoading(true);
    setMedicineOcrError(null);
    setMedicineOcrResult(null);
    setMedicineNormalizeResult(null);
    setMedicineNormalizeError(null);
    setSelectedMedicineCandidates({});
    setMedicineSafetyResult(null);
    setMedicineSafetyError(null);
    setMedicineStep("ocr");

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

        // 각 약의 효능 설명 가져오기: DB에서 확인된 top_candidate만 사용
        const resolvedNames = (normalizeData.items ?? [])
          .map((item) => item.top_candidate?.alias || "")
          .filter(Boolean)
          .map((name) => name.replace(/\s*[_(].*$/, "").trim())
          .filter(Boolean);
        if (resolvedNames.length) {
          fetch(`${API_BASE_URL}/api/medicines/descriptions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ medicine_names: resolvedNames }),
          })
            .then((r) => r.json())
            .then((d) => setMedicineDrugDescriptions(d.ok ? (d.descriptions || {}) : {}))
            .catch(() => setMedicineDrugDescriptions({}));
        } else {
          setMedicineDrugDescriptions({});
        }
      }

      setMedicineOcrResult(data);
      setMedicineNormalizeResult(normalizeData);
      stopSpeaking();
      setMedicineStep("review");
    } catch (error) {
      setMedicineOcrError(error.message || "OCR 분석에 실패했어요.");
      setMedicineNormalizeError(error.message || "약 후보 확인에 실패했어요.");
      stopSpeaking();
      setMedicineStep("review");
    } finally {
      setIsMedicineOcrLoading(false);
    }
  }, [medicinePhotoPreviews, stopSpeaking]);

  const handleMedicineResetPhotos = useCallback(() => {
    stopSpeaking();
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
  }, [stopSpeaking]);

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
      return;
    }

    const parsedAge = Number.parseInt(medicineUserAge, 10);
    if (!Number.isFinite(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setMedicineSafetyError("나이를 숫자로 입력해주세요.");
      return;
    }

    stopSpeaking();
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
      stopSpeaking();
      setMedicineStep("result");
    } catch (error) {
      setMedicineSafetyError(error.message || "DUR 분석에 실패했어요.");
      stopSpeaking();
      setMedicineStep("result");
    } finally {
      setIsMedicineSafetyLoading(false);
    }
  }, [hasHerbalMedicine, medicineNormalizeResult, selectedMedicineCandidates, medicineUserAge, stopSpeaking]);

  const handleToggleHomeMedicine = useCallback((medicine) => {
    setSelectedHomeMedicines((prev) =>
      prev.includes(medicine) ? prev.filter((m) => m !== medicine) : [...prev, medicine]
    );
  }, []);

  const handleHospitalBack = useCallback(() => {
    stopSpeaking();
    const currentIndex = hospitalStepKeys.indexOf(hospitalStep);
    if (currentIndex <= 0) {
      setView("home");
      return;
    }

    setHospitalStep(hospitalStepKeys[currentIndex - 1]);
  }, [hospitalStep, stopSpeaking]);

  // TMap API 결과를 UI가 쓰는 형식으로 변환
  const transformHospital = useCallback((h, dept) => ({
    name: h.name,
    department: dept,
    walk: `도보 ${h.walk_time}분`,
    distance: `${h.distance}m`,
    route: h.route_type || "평지 위주 경로",
    status: h.recommended_for_walking ? "보행자 맞춤 추천" : "진료 가능",
    stairs: h.stairs ?? 0,
    isFlat: h.is_flat ?? true,
    recommendedForWalking: h.recommended_for_walking ?? false,
    lat: h.lat,
    lon: h.lon,
    floor: h.floor || "1층",
    mapUrl: `https://map.kakao.com/link/search/${encodeURIComponent(h.name)}`,
  }), []);

  const handleSelectSymptom = useCallback(
    async (symptom) => {
      stopSpeaking();
      setSelectedSymptom(symptom);
      setHospitalIndex(0);
      setHospitalStep("results");
      setIsHospitalLoading(true);
      setHospitals([]);

      try {
        // 증상으로 진료과 분석
        const analyzeRes = await fetch(`${API_BASE_URL}/api/hospitals/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symptom }),
        });
        const analyzeData = await analyzeRes.json();
        const dept = analyzeData.department || "정형외과";
        setHospitalDepartment(dept);

        // GPS 위치 가져오기
        const pos = await new Promise((resolve) => {
          if (!navigator.geolocation) {
            resolve({ lat: 37.566481, lon: 126.985023 });
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
            () => resolve({ lat: 37.566481, lon: 126.985023 }),
            { timeout: 5000 }
          );
        });

        // 근처 병원 검색
        const nearbyRes = await fetch(`${API_BASE_URL}/api/hospitals/nearby`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ department: dept, lat: pos.lat, lon: pos.lon }),
        });
        const nearbyData = await nearbyRes.json();
        const transformed = (nearbyData.hospitals || []).map((h) => transformHospital(h, dept));
        setHospitals(transformed);
      } catch {
        // 실패시 정적 데이터로 fallback
        setHospitals([]);
      } finally {
        setIsHospitalLoading(false);
      }
    },
    [stopSpeaking, transformHospital]
  );

  const handleSelectHospital = useCallback(
    (index) => {
      stopSpeaking();
      setHospitalIndex(index);
      setHospitalStep("select");
    },
    [stopSpeaking]
  );

  const handleHospitalStepChange = useCallback(
    (nextStep) => {
      stopSpeaking();
      setHospitalStep(nextStep);
    },
    [stopSpeaking]
  );

  const handleHospitalRestart = useCallback(() => {
    stopSpeaking();
    setHospitalStep("input");
  }, [stopSpeaking]);

  const handleSelectBody = useCallback(
    (body) => {
      stopSpeaking();
      setSelectedCostBody(body);
    },
    [stopSpeaking]
  );

  const handleSelectTreatment = useCallback(
    (treatment) => {
      stopSpeaking();
      setSelectedTreatment(treatment);
    },
    [stopSpeaking]
  );

  const handleCostBack = useCallback(() => {
    stopSpeaking();
    setView("home");
  }, [stopSpeaking]);

  const handleCostStepChange = useCallback(
    (nextStep) => {
      stopSpeaking();
      setCostStep(nextStep);
    },
    [stopSpeaking]
  );

  const openSettings = useCallback(() => {
    stopSpeaking();
    setView("settings");
  }, [stopSpeaking]);

  const handleCostSpeak = useCallback(
    (message) => {
      if (typeof message === "string" && message.trim()) {
        speak(message);
        return;
      }
      speak(
        `${selectedCostBody} 부위의 ${selectedTreatment}은 ${treatmentCosts[selectedTreatment]} 정도예요. ${treatmentCostDetails[selectedTreatment]?.note ?? "건강보험 적용 여부와 병원에 따라 차이가 있을 수 있어요."}`
      );
    },
    [speak, selectedCostBody, selectedTreatment]
  );

  const handleCostAsk = useCallback(() => {
    speak("궁금한 병원비를 말씀해주세요. 예를 들어, MRI도 건강보험이 되나요 라고 말할 수 있어요.");
  }, [speak]);

  const displayHospitals = hospitals.length > 0 ? hospitals : nearbyHospitals;

  return (
    <div className={`min-h-screen bg-white text-boyak-ink font-size-${fontSizeLevel}`}>
      {/* Global voice button — 말하는 중이면 빨간 X 버튼으로 토글 */}
      <button
        className={`fixed bottom-5 right-5 z-50 grid size-16 place-items-center rounded-full text-white shadow-soft transition active:scale-95 sm:bottom-7 sm:right-7 sm:size-20 lg:size-[72px] ${
          isSpeaking ? "bg-red-500" : "bg-boyak-blue"
        }`}
        type="button"
        aria-label={isSpeaking ? "음성 끄기" : "현재 화면 음성 안내 듣기"}
        onClick={isSpeaking ? stopSpeaking : () => speak(getGlobalVoiceGuide())}
      >
        {isSpeaking
          ? <VolumeX className="size-9 sm:size-11" strokeWidth={2.6} aria-hidden="true" />
          : <Volume2 className="size-9 sm:size-11" strokeWidth={2.6} aria-hidden="true" />
        }
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
            onClick={openSettings}
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
            ? "px-5 pb-4 pt-5 sm:px-10 sm:py-6 lg:px-24 lg:py-6"
            : "px-5 pb-16 pt-8 sm:px-10 lg:overflow-y-auto lg:px-16 lg:py-3 xl:px-20"
        }
      >
        {view === "home" && <HomeSection onNavigate={setView} onSpeak={speak} />}

        {view === "settings" && (
          <SettingsScreen
            fontSizeLevel={fontSizeLevel}
            voiceGuideStyle={voiceGuideStyle}
            onBack={goHome}
            onFontSizeChange={setFontSizeLevel}
            onVoiceGuideStyleChange={setVoiceGuideStyle}
          />
        )}

        {view === "medicine" && (
          <MedicineFlowScreen
            step={medicineStep}
            previewUrl={previewUrl}
            photoPreviews={medicinePhotoPreviews}
            ocrResult={medicineOcrResult}
            ocrError={medicineOcrError}
            normalizeResult={medicineNormalizeResult}
            normalizeError={medicineNormalizeError}
            drugDescriptions={medicineDrugDescriptions}
            selectedCandidates={selectedMedicineCandidates}
            safetyResult={medicineSafetyResult}
            safetyError={medicineSafetyError}
            isSafetyLoading={isMedicineSafetyLoading}
            isOcrLoading={isMedicineOcrLoading}
            hasHerbalMedicine={hasHerbalMedicine}
            userAge={medicineUserAge}
            selectedHomeMedicines={selectedHomeMedicines}
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            onImageChange={handleImage}
            onAnalyzePhotos={handleMedicineAnalyze}
            onResetPhotos={handleMedicineResetPhotos}
            onSelectCandidate={handleSelectMedicineCandidate}
            onToggleHomeMedicine={handleToggleHomeMedicine}
            onRunSafetyCheck={handleRunMedicineSafetyCheck}
            onBack={handleMedicineBack}
            onStepChange={handleMedicineStepChange}
            onHerbalChange={setHasHerbalMedicine}
            onAgeChange={setMedicineUserAge}
          />
        )}

        {view === "hospital" && (
          <HospitalFlowScreen
            step={hospitalStep}
            selectedSymptom={selectedSymptom}
            hospital={displayHospitals[hospitalIndex]}
            hospitals={hospitals}
            department={hospitalDepartment}
            isLoading={isHospitalLoading}
            onBack={handleHospitalBack}
            onRestart={handleHospitalRestart}
            onStepChange={handleHospitalStepChange}
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
            onBack={handleCostBack}
            onStepChange={handleCostStepChange}
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
  const [tipIdx, setTipIdx] = useState(0);
  useEffect(() => {
    setTipIdx(Math.floor(Math.random() * doctorTips.length));
  }, []);
  const tip = doctorTips[tipIdx];
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
        <div className="min-w-0 flex-1">
          <h2 className="mb-1 text-base font-black text-boyak-blue sm:text-lg">약손 박사의 한마디:</h2>
          <p className="text-lg font-extrabold leading-relaxed sm:text-xl lg:text-2xl">{tip.summary}</p>
          <p className="mt-1 text-base font-bold leading-relaxed text-boyak-muted sm:text-lg">{tip.detail}</p>
        </div>
        <button
          className="min-h-14 shrink-0 rounded-lg bg-boyak-blue px-6 text-lg font-black text-white sm:text-xl lg:min-h-[64px] lg:px-9"
          type="button"
          onClick={() => onSpeak(tip.detail)}
        >
          자세히 듣기
        </button>
      </aside>
    </section>
  );
}

const fontSizeOptions = [
  { id: "normal", label: "보통", sample: "기본 크기" },
  { id: "large", label: "크게", sample: "조금 크게" },
  { id: "xlarge", label: "아주 크게", sample: "가장 크게" },
];

const voiceGuideOptions = [
  {
    id: "friendly",
    label: "친절하게",
    description: "버튼을 누르면 지금 화면에서 무엇을 하면 되는지 문장으로 풀어서 안내해요.",
  },
  {
    id: "simple",
    label: "간단하게",
    description: "핵심 행동만 짧게 안내해요.",
  },
];

function SettingsScreen({
  fontSizeLevel,
  voiceGuideStyle,
  onBack,
  onFontSizeChange,
  onVoiceGuideStyleChange,
}) {
  return (
    <section className="mx-auto max-w-[860px]" aria-labelledby="settings-title">
      <BackButton onClick={onBack} />

      <div className="mb-7 flex flex-wrap items-center gap-4 text-boyak-blue lg:mb-5">
        <span className="grid size-14 place-items-center rounded-full bg-boyak-blue text-white lg:size-10">
          <Settings className="size-8 lg:size-6" strokeWidth={2.5} aria-hidden="true" />
        </span>
        <div>
          <h1 id="settings-title" className="text-3xl font-black leading-tight sm:text-4xl lg:text-3xl">
            설정
          </h1>
          <p className="mt-1 text-lg font-bold text-boyak-muted lg:text-base">
            보기 편한 크기와 듣기 방식을 고를 수 있어요
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:gap-4">
        <section className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:p-5" aria-labelledby="font-size-title">
          <div className="mb-5 flex items-center gap-3">
            <Type className="size-8 text-boyak-blue lg:size-7" strokeWidth={2.4} aria-hidden="true" />
            <h2 id="font-size-title" className="text-2xl font-black lg:text-xl">
              글자 크기
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="글자 크기 선택">
            {fontSizeOptions.map((option) => {
              const isSelected = fontSizeLevel === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`min-h-24 rounded-2xl border-2 px-4 text-left transition active:scale-[0.98] lg:min-h-20 ${
                    isSelected
                      ? "border-boyak-blue bg-[#EDF4FF] text-boyak-blue"
                      : "border-boyak-line bg-white text-boyak-ink"
                  }`}
                  onClick={() => onFontSizeChange(option.id)}
                >
                  <span className="block text-2xl font-black lg:text-xl">{option.label}</span>
                  <span className="mt-2 block text-lg font-bold text-boyak-muted lg:text-base">{option.sample}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:p-5" aria-labelledby="voice-style-title">
          <div className="mb-5 flex items-center gap-3">
            <Volume1 className="size-8 text-boyak-blue lg:size-7" strokeWidth={2.4} aria-hidden="true" />
            <h2 id="voice-style-title" className="text-2xl font-black lg:text-xl">
              음성 안내 방식
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="음성 안내 방식 선택">
            {voiceGuideOptions.map((option) => {
              const isSelected = voiceGuideStyle === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`min-h-32 rounded-2xl border-2 px-5 py-4 text-left transition active:scale-[0.98] lg:min-h-24 ${
                    isSelected
                      ? "border-boyak-blue bg-[#EDF4FF] text-boyak-blue"
                      : "border-boyak-line bg-white text-boyak-ink"
                  }`}
                  onClick={() => onVoiceGuideStyleChange(option.id)}
                >
                  <span className="block text-2xl font-black lg:text-xl">{option.label}</span>
                  <span className="mt-2 block text-lg font-bold leading-relaxed text-boyak-muted lg:text-base">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[28px] border-2 border-[#C8DAF7] bg-[#EDF4FF] p-6 lg:p-5" aria-labelledby="settings-preview-title">
          <div className="mb-4 flex items-center gap-3">
            <ListChecks className="size-8 text-boyak-blue lg:size-7" strokeWidth={2.4} aria-hidden="true" />
            <h2 id="settings-preview-title" className="text-2xl font-black text-boyak-blue lg:text-xl">
              미리보기
            </h2>
          </div>
          <p className="text-xl font-extrabold leading-relaxed text-boyak-ink lg:text-lg">
            이 문장의 크기가 선택한 글자 크기로 보입니다.
          </p>
          <p className="mt-2 text-lg font-bold leading-relaxed text-boyak-muted lg:text-base">
            오른쪽 아래 음성 버튼을 누르면 선택한 음성 안내 방식으로 현재 화면을 설명해요.
          </p>
        </section>
      </div>
    </section>
  );
}
