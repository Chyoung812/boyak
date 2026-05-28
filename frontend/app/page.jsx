"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Calculator,
  ChevronRight,
  HomeIcon,
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

const featureIconMap = { medicine: Pill, hospital: Map, cost: Calculator };
const fontScaleMap = { normal: "1", large: "1.08", xlarge: "1.16" };
const DEFAULT_COST_TREATMENT = "진찰, 엑스레이, 처방전을 받는 경우";
const fallbackLocation = { lat: 37.566481, lon: 126.985023 };
const geolocationOptions = { timeout: 12000, enableHighAccuracy: false, maximumAge: 60000 };
const doctorTipAudioEntries = doctorTips.flatMap((tip, index) => {
  const tipNumber = String(index + 1).padStart(2, "0");
  return [
    [tip.summary, `/audio/tip${tipNumber}_simple.wav`],
    [tip.detail, `/audio/tip${tipNumber}_friendly.wav`],
  ];
});
const SLOW_STATIC_PLAYBACK_RATE = 0.65;

const STATIC_AUDIO = {
  ...Object.fromEntries(doctorTipAudioEntries),
  // home
  "약 복용 안전 확인, 병원 길찾기, 병원비 예상 중 필요한 기능을 선택해주세요.": "/audio/home_friendly.wav",
  "필요한 기능을 선택해주세요.": "/audio/home_simple.wav",
  // medicine - capture
  "약 봉투나 처방전 사진을 촬영해주세요. 여러 장이 있으면 모두 추가한 뒤 분석 버튼을 누르면 됩니다.": "/audio/medicine_capture_friendly.wav",
  "약 봉투나 처방전 사진을 촬영해주세요.": "/audio/medicine_capture_simple.wav",
  // medicine - ocr
  "사진에서 약 이름과 조제 정보를 읽는 중이에요. 잠시만 기다려주세요.": "/audio/medicine_ocr.wav",
  // medicine - review
  "인식된 약 이름과 후보를 확인해주세요. 같은 성분으로 확인된 약은 자동 선택되어 있고, 후보가 여러 개면 맞는 약을 골라주세요.": "/audio/medicine_review_friendly.wav",
  "인식된 약 후보가 맞는지 확인해주세요.": "/audio/medicine_review_simple.wav",
  // medicine - add
  "집에 있는 감기약, 소화제, 영양제도 함께 확인하려면 선택해주세요. 없으면 추가 없이 계속 진행하면 됩니다.": "/audio/medicine_add_friendly.wav",
  "집에 있는 다른 약이 있으면 선택해주세요.": "/audio/medicine_add_simple.wav",
  // medicine - herbal
  "복용하시는 분의 나이를 입력하고, 한약을 함께 드시는지 선택해주세요. 이 정보로 주의해야 할 약을 더 정확히 확인합니다.": "/audio/medicine_herbal_friendly.wav",
  "나이와 한약 복용 여부를 선택해주세요.": "/audio/medicine_herbal_simple.wav",
  // medicine - dur
  "선택한 약들을 기준으로 함께 먹으면 안 되는 조합이나 나이에 주의가 필요한 약을 확인하는 중이에요.": "/audio/medicine_dur_friendly.wav",
  "약 조합과 나이별 주의사항을 확인하는 중입니다.": "/audio/medicine_dur_simple.wav",
  // medicine - result fallback
  "DUR 분석 결과를 확인해주세요. 주의 문구가 있으면 약사나 의사에게 확인하세요.": "/audio/medicine_result_fallback_friendly.wav",
  "DUR 분석 결과를 확인해주세요.": "/audio/medicine_result_fallback_simple.wav",
  // hospital - input
  "어디가 불편하신지 알려주세요. 부위 버튼을 누르거나, 말하기 버튼으로 증상을 말씀하시면 가까운 병원을 찾아드릴게요.": "/audio/hospital_input_friendly.wav",
  "아픈 부위를 선택하거나 말하기 버튼으로 증상을 말씀해주세요.": "/audio/hospital_input_simple.wav",
  // hospital - route (simple only; friendly has dynamic hospital name → gTTS)
  "길안내 시작 버튼을 누르면 실시간 안내를 시작합니다.": "/audio/hospital_route_simple.wav",
  // hospital - arrived
  "목적지에 도착했어요. 수고하셨습니다. 길안내는 끝났고, 필요하면 처음으로 돌아가 다시 병원을 찾아볼 수 있어요.": "/audio/hospital_arrived_friendly.wav",
  "목적지에 도착했어요. 길안내가 끝났습니다.": "/audio/hospital_arrived_simple.wav",
  // cost - body
  "병원비를 예상해볼 부위를 먼저 선택해주세요. 허리, 무릎, 어깨 같은 버튼을 누르거나 말하기 버튼으로 말씀하실 수 있어요.": "/audio/cost_body_friendly.wav",
  "병원비를 예상할 부위를 선택해주세요.": "/audio/cost_body_simple.wav",
  // cost - common questions: friendly text changes often, so use dynamic /api/tts instead of stale static audio.
  "많이 물어보는 병원비를 확인하세요.": "/audio/cost_chat_simple.wav",
  // settings
  "설정 화면입니다. 글자 크기는 보통, 크게, 아주 크게 중에서 고를 수 있고, 음성 안내 방식은 친절하게 또는 간단하게로 바꿀 수 있어요.": "/audio/settings_friendly.wav",
  "글자 크기와 음성 안내 방식을 바꿀 수 있어요.": "/audio/settings_simple.wav",
  // STT / mic
  "목소리를 분석하고 있어요. 잠시만 기다려주세요.": "/audio/stt_analyzing.wav",
  "음성 분석에 실패했어요. 다시 시도해 주세요.": "/audio/stt_fail.wav",
  "서버 오류가 발생했어요. 다시 시도해 주세요.": "/audio/stt_error.wav",
  "마이크 접근 권한이 없거나 지원하지 않는 기기입니다.": "/audio/mic_denied.wav",
};

async function getGeolocationPermissionState() {
  if (!navigator.permissions?.query) return "unknown";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}

function getGeolocationFailureCopy(error, permissionState) {
  if (permissionState === "denied" || error?.code === 1) {
    return {
      label: "서울시청 기준",
      detail: "현재 기기의 위치 권한을 받을 수 없어 서울시청 기준으로 찾았어요.",
    };
  }
  if (error?.code === 2) {
    return {
      label: "서울시청 기준",
      detail: "위치 신호를 받지 못해 서울시청 기준으로 찾았어요.",
    };
  }
  if (error?.code === 3) {
    return {
      label: "서울시청 기준",
      detail: "위치 확인 시간이 초과되어 서울시청 기준으로 찾았어요.",
    };
  }
  return {
    label: "서울시청 기준",
    detail: "현재 위치를 받지 못해 서울시청 기준으로 찾았어요.",
  };
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
  const [hospitalLoadingMessage, setHospitalLoadingMessage] = useState("");
  const [hospitalLocationStatus, setHospitalLocationStatus] = useState(null);
  const [hospitalAddressInput, setHospitalAddressInput] = useState("");
  const [isHospitalAddressSearching, setIsHospitalAddressSearching] = useState(false);
  const [hospitalDepartment, setHospitalDepartment] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedHomeMedicines, setSelectedHomeMedicines] = useState([]);
  const [costStep, setCostStep] = useState("estimate");
  const [fontSizeLevel, setFontSizeLevel] = useState("normal");
  const [voiceGuideStyle, setVoiceGuideStyle] = useState("friendly");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState("normal");
  const [voiceType, setVoiceType] = useState("carat");
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const audioRef = useRef(null);
  const speakControllerRef = useRef(null);

  const stopSpeaking = useCallback(() => {
    speakControllerRef.current?.abort();
    speakControllerRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (message, options = {}) => {
    if (!message?.trim()) return false;
    const { onDone } = options;
    speakControllerRef.current?.abort();
    speakControllerRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(true);

    const staticPath = voiceType === "carat" ? STATIC_AUDIO[message.trim()] : null;
    if (staticPath) {
      const audio = new Audio(staticPath);
      if (ttsSpeed === "slow") audio.playbackRate = SLOW_STATIC_PLAYBACK_RATE;
      audioRef.current = audio;
      audio.onended = () => { setIsSpeaking(false); audioRef.current = null; onDone?.(); };
      audio.onerror = () => { setIsSpeaking(false); audioRef.current = null; };
      try {
        await audio.play();
        return true;
      } catch (error) {
        setIsSpeaking(false);
        audioRef.current = null;
        return false;
      }
    }

    const controller = new AbortController();
    speakControllerRef.current = controller;
    try {
      const res = await fetch(`${API_BASE_URL}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message, slow: ttsSpeed === "slow" }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("TTS 요청 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        onDone?.();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      await audio.play();
      return true;
    } catch (e) {
      if (e?.name !== "AbortError") setIsSpeaking(false);
      return false;
    }
  }, [ttsSpeed, voiceType]);

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
    setHospitalLoadingMessage("");
    setHospitalLocationStatus(null);
    setHospitalAddressInput("");
    setIsHospitalAddressSearching(false);
    setSelectedHomeMedicines([]);
    setCostStep("estimate");
  }, [stopSpeaking]);

  // 화면이 바뀔 때마다 voiceEnabled 상태면 자동으로 음성 안내
  useEffect(() => {
    if (!voiceEnabled) return;
    speak(getGlobalVoiceGuide());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, medicineStep, hospitalStep, costStep, voiceEnabled]);

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
      const displayHospitals = isHospitalLoading ? [] : (hospitals.length > 0 ? hospitals : nearbyHospitals);
      const selectedHospital = displayHospitals[hospitalIndex];
      const recommendedDepartment = hospitalDepartment || selectedHospital?.department || "정형외과";

      if (hospitalStep === "input") {
        return isSimpleVoice
          ? "아픈 부위를 선택하거나 말하기 버튼으로 증상을 말씀해주세요."
          : "어디가 불편하신지 알려주세요. 부위 버튼을 누르거나, 말하기 버튼으로 증상을 말씀하시면 가까운 병원을 찾아드릴게요.";
      }
      if (hospitalStep === "results") {
        if (isHospitalLoading) {
          return hospitalLoadingMessage || "현재 위치를 먼저 확인하고 가까운 병원을 찾고 있어요.";
        }
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
      if (costStep === "estimate") {
        return isSimpleVoice
          ? `예상 병원비는 ${treatmentCosts[DEFAULT_COST_TREATMENT]} 정도예요.`
          : `${DEFAULT_COST_TREATMENT}의 예상 병원비는 ${treatmentCosts[DEFAULT_COST_TREATMENT]} 정도예요. ${treatmentCostDetails[DEFAULT_COST_TREATMENT]?.note ?? "실제 비용은 병원과 건강보험 적용 여부에 따라 달라질 수 있어요."}`;
      }
      if (costStep === "chat") {
        return isSimpleVoice
          ? "많이 물어보는 병원비를 확인하세요."
          : "첫 방문 비용표에 없는 급여 기준만 따로 정리했어요. 재방문, 시간대, 나이에 따라 병원비가 달라질 수 있어요.";
      }
      return isSimpleVoice ? "병원비 예상 화면입니다." : "진료 흐름별 예상 병원비와 확인 질문을 안내합니다.";
    }
    if (view === "settings") {
      return isSimpleVoice
        ? "글자 크기와 음성 안내 방식을 바꿀 수 있어요."
        : "설정 화면입니다. 글자 크기는 보통, 크게, 아주 크게 중에서 고를 수 있고, 음성 안내 방식은 친절하게 또는 간단하게로 바꿀 수 있어요.";
    }
    return isSimpleVoice
      ? "필요한 기능을 선택해주세요."
      : "약 복용 안전 확인, 병원 길찾기, 병원비 예상 중 필요한 기능을 선택해주세요.";
  }, [view, medicineStep, costStep, hospitalStep, hospitals, hospitalIndex, hospitalDepartment, hospitalLoadingMessage, isHospitalLoading, selectedSymptom, medicineSafetyResult, voiceGuideStyle]);

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

  const getCurrentHospitalLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      return {
        ...fallbackLocation,
        isFallback: true,
        label: "기본 위치 사용",
        detail: "현재 기기에서 위치 기능을 지원하지 않아 서울시청 기준으로 보여드려요.",
      };
    }
    const permissionState = await getGeolocationPermissionState();
    if (permissionState === "denied") {
      const copy = getGeolocationFailureCopy(null, permissionState);
      return {
        ...fallbackLocation,
        isFallback: true,
        ...copy,
      };
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          isFallback: false,
          label: "현재 위치 기준",
          detail: position.coords.accuracy
            ? `현재 위치 기준으로 가까운 병원을 찾고 있어요. 정확도는 약 ${Math.round(position.coords.accuracy)}m예요.`
            : "현재 위치 기준으로 가까운 병원을 찾고 있어요.",
        }),
        (error) => {
          const copy = getGeolocationFailureCopy(error, permissionState);
          resolve({
            ...fallbackLocation,
            isFallback: true,
            ...copy,
          });
        },
        geolocationOptions
      );
    });
  }, []);

  const runHospitalSearch = useCallback(async ({ symptom, location, locationStatus }) => {
    stopSpeaking();
    setSelectedSymptom(symptom);
    setHospitalIndex(0);
    setHospitalStep("results");
    setIsHospitalLoading(true);
    setHospitalLocationStatus(locationStatus);
    setHospitalLoadingMessage(
      locationStatus?.tone === "warning"
        ? "기본 위치 기준으로 진료과를 찾고 있어요."
        : "증상에 맞는 진료과를 찾는 중이에요."
    );
    setHospitals([]);

    try {
        const analyzeRes = await fetch(`${API_BASE_URL}/api/hospitals/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symptom }),
        });
        const analyzeData = await analyzeRes.json();
        const dept = analyzeData.department || "정형외과";
        setHospitalDepartment(dept);
        setHospitalLoadingMessage(`${dept} 병원을 현재 위치에서 가까운 순으로 찾고 있어요.`);

        const nearbyRes = await fetch(`${API_BASE_URL}/api/hospitals/nearby`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ department: dept, lat: location.lat, lon: location.lon }),
        });
        const nearbyData = await nearbyRes.json();
        const transformed = (nearbyData.hospitals || []).map((h) => transformHospital(h, dept));
        setHospitals(transformed);
      } catch {
        setHospitalLocationStatus((current) => current
          ? {
              ...current,
              detail: `${current.detail} 백엔드 연결이 안 되어 예시 병원 목록을 보여드려요.`,
            }
          : {
              tone: "warning",
              label: "위치 기반 검색 실패",
              detail: "백엔드 연결이 안 되어 예시 병원 목록을 보여드려요.",
            });
        setHospitals([]);
      } finally {
        setIsHospitalLoading(false);
        setHospitalLoadingMessage("");
      }
  }, [stopSpeaking, transformHospital]);

  const handleSelectSymptom = useCallback(
    async (symptom) => {
      stopSpeaking();
      setSelectedSymptom(symptom);
      setHospitalIndex(0);
      setHospitalStep("results");
      setIsHospitalLoading(true);
      setHospitalLoadingMessage("현재 위치를 확인하는 중이에요.");
      setHospitalLocationStatus({
        tone: "loading",
        label: "현재 위치 확인 중",
        detail: "위치 권한 요청이 보이면 허용을 눌러주세요.",
      });
      setHospitals([]);

      const location = await getCurrentHospitalLocation();
      await runHospitalSearch({
        symptom,
        location,
        locationStatus: {
          tone: location.isFallback ? "warning" : "success",
          label: location.label,
          detail: location.detail,
        },
      });
    },
    [getCurrentHospitalLocation, runHospitalSearch, stopSpeaking]
  );

  const handleRetryHospitalLocation = useCallback(async () => {
    if (!selectedSymptom) return;
    stopSpeaking();
    setIsHospitalLoading(true);
    setHospitalLoadingMessage("현재 위치를 다시 확인하는 중이에요.");
    setHospitalLocationStatus({
      tone: "loading",
      label: "현재 위치 다시 확인 중",
      detail: "위치 권한 요청이 보이면 허용을 눌러주세요.",
    });

    const location = await getCurrentHospitalLocation();
    await runHospitalSearch({
      symptom: selectedSymptom,
      location,
      locationStatus: {
        tone: location.isFallback ? "warning" : "success",
        label: location.isFallback ? location.label : "현재 위치 기준",
        detail: location.detail,
      },
    });
  }, [getCurrentHospitalLocation, runHospitalSearch, selectedSymptom, stopSpeaking]);

  const handleSearchHospitalAddress = useCallback(async (queryOverride) => {
    const query = typeof queryOverride === "string" ? queryOverride.trim() : hospitalAddressInput.trim();
    if (!query || !selectedSymptom) return;
    stopSpeaking();
    setIsHospitalAddressSearching(true);
    setIsHospitalLoading(true);
    setHospitalLoadingMessage("입력한 주소나 장소를 찾는 중이에요.");
    setHospitalLocationStatus({
      tone: "loading",
      label: "주소 위치 확인 중",
      detail: `"${query}" 위치를 찾고 있어요.`,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/locations/geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (!response.ok || data.ok === false) {
        throw new Error(data.reason || "위치를 찾지 못했어요.");
      }
      setHospitalAddressInput("");
      await runHospitalSearch({
        symptom: selectedSymptom,
        location: { lat: data.lat, lon: data.lon, isFallback: false },
        locationStatus: {
          tone: "success",
          label: "입력한 위치 기준",
          detail: `${data.name || query} 기준으로 가까운 병원을 찾고 있어요.`,
        },
      });
    } catch (error) {
      setHospitalLocationStatus({
        tone: "warning",
        label: "주소 위치 확인 실패",
        detail: error?.message === "Failed to fetch"
          ? "백엔드 연결이 안 되어 주소 검색을 할 수 없어요."
          : error.message || "주소나 장소 이름을 다시 입력해 주세요.",
      });
      setIsHospitalLoading(false);
      setHospitalLoadingMessage("");
    } finally {
      setIsHospitalAddressSearching(false);
    }
  }, [hospitalAddressInput, runHospitalSearch, selectedSymptom, stopSpeaking]);

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
    setHospitalLocationStatus(null);
    setHospitalAddressInput("");
  }, [stopSpeaking]);

  const [relocatedHospitals, setRelocatedHospitals] = useState([]);
  const [isRelocatingHospital, setIsRelocatingHospital] = useState(false);

  const handleLocationChange = useCallback(async (newLoc) => {
    if (!hospitalDepartment) return;
    setIsRelocatingHospital(true);
    setRelocatedHospitals([]);
    try {
      const nearbyRes = await fetch(`${API_BASE_URL}/api/hospitals/nearby`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department: hospitalDepartment, lat: newLoc.lat, lon: newLoc.lon }),
      });
      const nearbyData = await nearbyRes.json();
      const transformed = (nearbyData.hospitals || []).map((h) => transformHospital(h, hospitalDepartment));
      setRelocatedHospitals(transformed);
    } catch {
      setRelocatedHospitals([]);
    } finally {
      setIsRelocatingHospital(false);
    }
  }, [hospitalDepartment, transformHospital]);

  const handleRelocatedHospitalSelect = useCallback((selectedHospital) => {
    setHospitals((prev) => [selectedHospital, ...prev.filter((h) => h.name !== selectedHospital.name)]);
    setHospitalIndex(0);
    setRelocatedHospitals([]);
  }, []);

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

  const displayHospitals = isHospitalLoading ? [] : (hospitals.length > 0 ? hospitals : nearbyHospitals);
  const isLongLoadingCandidate = isMedicineOcrLoading || isMedicineSafetyLoading || isHospitalLoading;

  return (
    <div
      className={`min-h-screen bg-white text-boyak-ink font-size-${fontSizeLevel}`}
      style={{ "--boyak-font-scale": fontScaleMap[fontSizeLevel] ?? fontScaleMap.normal }}
    >
      {/* Global voice button: 빨강=재생 중 / 초록=자동안내 ON / 파랑=꺼짐 */}
      <button
        className={`fixed bottom-5 right-5 z-50 grid size-16 place-items-center rounded-full text-white shadow-soft transition active:scale-95 sm:bottom-7 sm:right-7 sm:size-20 lg:size-[72px] ${
          isSpeaking ? "bg-red-500" : voiceEnabled ? "bg-green-500" : "bg-boyak-blue"
        }`}
        type="button"
        aria-label={isSpeaking ? "음성 멈추기" : voiceEnabled ? "자동 음성 안내 끄기" : "자동 음성 안내 켜기"}
        onClick={() => {
          if (isSpeaking) { stopSpeaking(); return; }
          setVoiceEnabled(v => !v);
        }}
      >
        {isSpeaking
          ? <VolumeX className="size-9 sm:size-11" strokeWidth={2.6} aria-hidden="true" />
          : voiceEnabled
            ? <Volume2 className="size-9 sm:size-11" strokeWidth={2.6} aria-hidden="true" />
            : <Volume1 className="size-9 sm:size-11" strokeWidth={2.6} aria-hidden="true" />
        }
      </button>

      {/* Header */}
      <header className="flex min-h-[104px] flex-wrap items-center justify-between gap-3 border-b-[5px] border-[#4F7CFF] bg-white px-5 py-2 sm:min-h-[136px] sm:px-10 lg:min-h-[104px] lg:pl-20 lg:pr-12 lg:py-2 xl:pl-24 xl:pr-16">
        <button
          className="inline-flex min-h-10 items-center border-0 bg-transparent p-0 shadow-none outline-none ring-0 focus:outline-none focus:ring-0"
          type="button"
          onClick={goHome}
          aria-label="보약 홈으로 이동"
        >
          <img
            src="/logo.png"
            alt="보약"
            className="h-[88px] w-auto border-0 object-contain shadow-none outline-none ring-0 sm:h-[120px] lg:h-[88px]"
          />
        </button>
        <nav className="flex items-center justify-end gap-2 sm:gap-4" aria-label="상단 메뉴">
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 text-lg font-black text-boyak-muted sm:min-h-14 sm:text-xl lg:min-h-12 lg:px-3 lg:text-xl"
            type="button"
            onClick={goHome}
          >
            <HomeIcon className="size-6 lg:size-7" aria-hidden="true" />
            <span>홈</span>
          </button>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 text-lg font-black text-boyak-muted sm:min-h-14 sm:text-xl lg:min-h-12 lg:px-3 lg:text-xl"
            type="button"
            onClick={openSettings}
          >
            <Settings className="size-6 lg:size-7" aria-hidden="true" />
            <span>설정</span>
          </button>
        </nav>
      </header>

      {/* Main content */}
      <main
        className={
          view === "home"
            ? "bg-white px-5 pb-4 pt-5 sm:px-10 sm:pb-5 sm:pt-6 lg:px-20 lg:pb-4 lg:pt-4 xl:px-24"
            : view === "cost"
              ? "bg-white px-5 pb-16 pt-8 sm:px-10 lg:overflow-y-auto lg:px-20 lg:py-3 xl:px-24"
              : view === "hospital"
                ? "flex min-h-[calc(100dvh-104px)] flex-col px-5 pb-8 pt-6 sm:px-10 lg:min-h-[calc(100dvh-6.5rem)] lg:overflow-y-auto lg:px-20 lg:py-2 xl:px-24"
              : "px-5 pb-16 pt-8 sm:px-10 lg:overflow-y-auto lg:px-20 lg:py-3 xl:px-24"
        }
      >
        {view === "home" && <HomeSection onNavigate={setView} />}

        {view === "settings" && (
          <SettingsScreen
            fontSizeLevel={fontSizeLevel}
            voiceGuideStyle={voiceGuideStyle}
            ttsSpeed={ttsSpeed}
            voiceType={voiceType}
            onBack={goHome}
            onFontSizeChange={setFontSizeLevel}
            onVoiceGuideStyleChange={setVoiceGuideStyle}
            onTtsSpeedChange={setTtsSpeed}
            onVoiceTypeChange={setVoiceType}
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
            loadingMessage={hospitalLoadingMessage}
            locationStatus={hospitalLocationStatus}
            locationQuery={hospitalAddressInput}
            isAddressSearching={isHospitalAddressSearching}
            onBack={handleHospitalBack}
            onGoHome={goHome}
            onRestart={handleHospitalRestart}
            onStepChange={handleHospitalStepChange}
            onSelectSymptom={handleSelectSymptom}
            onSelectHospital={handleSelectHospital}
            onLocationQueryChange={setHospitalAddressInput}
            onRetryLocation={handleRetryHospitalLocation}
            onSearchLocation={handleSearchHospitalAddress}
            onSpeak={speak}
            onLocationChange={handleLocationChange}
            relocatedHospitals={relocatedHospitals}
            isRelocatingHospital={isRelocatingHospital}
            onRelocatedHospitalSelect={handleRelocatedHospitalSelect}
          />
        )}

        {view === "cost" && (
          <CostEstimateScreen
            step={costStep}
            onBack={handleCostBack}
            onStepChange={handleCostStepChange}
          />
        )}
      </main>

      <LongLoadingDoctorTip
        isActive={isLongLoadingCandidate}
        voiceGuideStyle={voiceGuideStyle}
        onSpeak={speak}
      />
    </div>
  );
}

function LongLoadingDoctorTip({ isActive, voiceGuideStyle, onSpeak }) {
  const [tipIndex, setTipIndex] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const isActiveRef = useRef(isActive);
  const isDismissedRef = useRef(isDismissed);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isDismissedRef.current = isDismissed;
  }, [isDismissed]);

  useEffect(() => {
    if (!isActive) {
      setTipIndex(null);
      setIsDismissed(false);
      setNeedsManualPlay(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setTipIndex(Math.floor(Math.random() * doctorTips.length));
    }, 3000);

    return () => clearTimeout(timer);
  }, [isActive]);

  useEffect(() => {
    if (tipIndex === null || isDismissed) return;
    const tip = doctorTips[tipIndex];
    const message = voiceGuideStyle === "simple" ? tip.summary : tip.detail;
    setNeedsManualPlay(false);
    onSpeak(message, {
      onDone: () => {
        if (!isActiveRef.current || isDismissedRef.current) return;
        setTipIndex((current) => {
          const base = current ?? tipIndex;
          return (base + 1) % doctorTips.length;
        });
      },
    }).then((didStart) => {
      if (!didStart && isActiveRef.current && !isDismissedRef.current) {
        setNeedsManualPlay(true);
      }
    });
  }, [tipIndex, isDismissed, voiceGuideStyle, onSpeak]);

  if (!isActive || isDismissed || tipIndex === null) return null;

  const tip = doctorTips[tipIndex];
  const visibleText = voiceGuideStyle === "simple" ? tip.summary : tip.detail;
  const playCurrentTip = () => {
    setNeedsManualPlay(false);
    onSpeak(visibleText, {
      onDone: () => {
        if (!isActiveRef.current || isDismissedRef.current) return;
        setTipIndex((current) => {
          const base = current ?? tipIndex;
          return (base + 1) % doctorTips.length;
        });
      },
    }).then((didStart) => {
      if (!didStart && isActiveRef.current && !isDismissedRef.current) {
        setNeedsManualPlay(true);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-white/80 px-5 py-8 backdrop-blur-sm"
      aria-live="polite"
    >
      <aside className="relative w-full max-w-[720px] rounded-[28px] border-2 border-[#C8DAF7] bg-[#EDF4FF] p-7 text-center shadow-soft sm:p-10">
        <button
          className="absolute right-4 top-4 grid size-12 place-items-center rounded-full bg-white text-3xl font-black text-boyak-muted shadow-sm transition hover:text-boyak-ink"
          type="button"
          aria-label="약손 박사의 한마디 닫기"
          onClick={() => setIsDismissed(true)}
        >
          ×
        </button>
        <div className="mx-auto mb-5 grid size-48 place-items-center overflow-hidden rounded-full bg-white shadow-sm sm:size-56">
          <img
            src="/doctor.png"
            alt="약손 박사"
            className="size-full object-cover"
          />
        </div>
        <p className="mb-3 text-xl font-black text-boyak-blue sm:text-2xl">기다리는 동안 약손 박사의 한마디</p>
        <p className="text-3xl font-black leading-relaxed text-boyak-ink sm:text-4xl">약손 박사가 알려드려요</p>
        <p className="mt-5 text-2xl font-extrabold leading-relaxed text-boyak-muted sm:text-3xl">
          {visibleText}
        </p>
        {needsManualPlay && (
          <button
            className="mt-6 min-h-16 rounded-2xl bg-boyak-blue px-8 text-xl font-black text-white shadow-sm sm:text-2xl"
            type="button"
            onClick={playCurrentTip}
          >
            음성으로 듣기
          </button>
        )}
      </aside>
    </div>
  );
}

function HomeSection({ onNavigate }) {
  return (
    <section className="home-section flex min-h-[calc(100dvh-144px)] flex-col bg-white lg:min-h-[calc(100dvh-136px)]" aria-labelledby="home-title">
      <div>
        <h1 id="home-title" className="boyak-h3 mb-1 font-black text-[#4F7CFF]">어르신 건강 지키미</h1>
        <p className="boyak-h4 max-w-[1250px] font-bold text-[#4D5D7C]">
          약부터 병원 길찾기, 비용 확인까지 한 번에 도와드려요
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-3 lg:gap-5" aria-label="주요 기능">
        {featureCards.map((feature) => {
          const Icon = featureIconMap[feature.id];
          return (
            <button
              key={feature.id}
              className="home-feature-card flex min-h-[300px] flex-col items-center justify-between rounded-[22px] border-2 px-5 py-6 text-center shadow-[0_12px_30px_rgba(58,77,116,0.08)] transition-transform active:scale-[0.98] sm:min-h-[360px] lg:h-full lg:min-h-0 lg:px-6 lg:py-5 xl:px-7"
              style={{
                backgroundColor: feature.cardColor,
                borderColor: `${feature.titleColor}33`,
              }}
              type="button"
              onClick={() => onNavigate(feature.id)}
            >
              <span className="home-card-top flex flex-col items-center">
                <span className="home-card-title font-black leading-none text-[#111111]">
                  {feature.title}
                </span>
                <span
                  className="home-card-icon grid place-items-center rounded-full bg-[#FFF7D6]"
                  style={{ color: feature.iconColor }}
                >
                  <Icon className="home-card-svg" strokeWidth={2.8} aria-hidden="true" />
                </span>
              </span>
              <span className="home-card-copy whitespace-pre-line font-black text-[#10234A]">
                {feature.copy}
              </span>
              <span
                className="home-card-action inline-flex w-full items-center justify-center gap-3 rounded-xl px-5 font-black text-white"
                style={{ backgroundColor: feature.buttonColor }}
              >
                <span className="home-card-action-label">{feature.action}</span>
                <ChevronRight className="home-card-chevron" strokeWidth={3} aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
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

const ttsSpeedOptions = [
  { id: "normal", label: "일반 속도", description: "기본 속도로 또렷하게 안내해요." },
  { id: "slow", label: "천천히", description: "한 단어씩 천천히 안내해요. 듣기 편해요." },
];

const voiceTypeOptions = [
  { id: "carat", label: "캐럿 음성", description: "미리 녹음된 자연스러운 목소리로 안내해요." },
  { id: "gtts", label: "기본 음성", description: "구글 TTS로 모든 화면을 실시간 합성해요." },
];

function SettingsScreen({
  fontSizeLevel,
  voiceGuideStyle,
  ttsSpeed,
  voiceType,
  onBack,
  onFontSizeChange,
  onVoiceGuideStyleChange,
  onTtsSpeedChange,
  onVoiceTypeChange,
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

        <section className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:p-5" aria-labelledby="tts-speed-title">
          <div className="mb-5 flex items-center gap-3">
            <Volume2 className="size-8 text-boyak-blue lg:size-7" strokeWidth={2.4} aria-hidden="true" />
            <h2 id="tts-speed-title" className="text-2xl font-black lg:text-xl">
              음성 속도
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="음성 속도 선택">
            {ttsSpeedOptions.map((option) => {
              const isSelected = ttsSpeed === option.id;
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
                  onClick={() => onTtsSpeedChange(option.id)}
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

        <section className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:p-5" aria-labelledby="voice-type-title">
          <div className="mb-5 flex items-center gap-3">
            <Volume2 className="size-8 text-boyak-blue lg:size-7" strokeWidth={2.4} aria-hidden="true" />
            <h2 id="voice-type-title" className="text-2xl font-black lg:text-xl">
              음성 종류
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="음성 종류 선택">
            {voiceTypeOptions.map((option) => {
              const isSelected = voiceType === option.id;
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
                  onClick={() => onVoiceTypeChange(option.id)}
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
