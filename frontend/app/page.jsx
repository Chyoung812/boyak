"use client";

import {
  AlertTriangle,
  ArrowUp,
  Camera,
  ChevronLeft,
  Clock,
  FileText,
  Hospital,
  ImagePlus,
  Leaf,
  ListChecks,
  Loader2,
  Map,
  MapPin,
  Mic,
  Navigation,
  Pill,
  Plus,
  Settings,
  ShieldCheck,
  Volume2
} from "lucide-react";
import { useRef, useState } from "react";

const featureCards = [
  {
    id: "medicine",
    title: "약",
    copy: "약 복용 안전 확인",
    color: "bg-boyak-blue",
    icon: Pill
  },
  {
    id: "hospital",
    title: "길찾기",
    copy: "가까운 병원 찾기",
    color: "bg-boyak-green",
    icon: Map
  },
  {
    id: "cost",
    title: "병원비",
    copy: "예상 비용 확인",
    color: "bg-boyak-orange",
    icon: Hospital
  }
];

const symptomOptions = ["허리", "무릎", "어깨", "두통"];

const medicineSteps = [
  "약 촬영",
  "OCR 분석",
  "내용 확인",
  "다른 약 추가",
  "한약 여부",
  "DUR 분석",
  "결과 확인"
];

const extractedMedicines = [
  { name: "아모잘탄정", detail: "혈압약 · 2026.05.10 조제" },
  { name: "타이레놀정", detail: "해열진통제 · 2026.05.10 조제" }
];

const homeMedicines = ["감기약", "소화제", "관절 영양제"];

const nearbyHospitals = [
  {
    name: "튼튼정형외과",
    department: "정형외과",
    walk: "도보 8분",
    distance: "600m",
    route: "평지 위주 경로",
    status: "지금 진료 중"
  },
  {
    name: "우리마을의원",
    department: "가정의학과",
    walk: "도보 10분",
    distance: "720m",
    route: "횡단보도 적은 경로",
    status: "진료 가능"
  },
  {
    name: "서울연세통증의학과",
    department: "통증의학과",
    walk: "도보 12분",
    distance: "850m",
    route: "엘리베이터 출입 가능",
    status: "대기 적음"
  }
];

const costBodyOptions = ["어깨", "무릎", "허리"];

const treatmentOptions = ["진료비(초진)", "X-ray 검사", "MRI 검사", "물리치료(1회)", "기타 문의"];

const treatmentCosts = {
  "진료비(초진)": "약 4,000원",
  "X-ray 검사": "약 8,000원",
  "MRI 검사": "약 40,000원~80,000원",
  "물리치료(1회)": "약 10,000원",
  "기타 문의": "상담 필요"
};

export default function Home() {
  const [view, setView] = useState("home");
  const [medicineStep, setMedicineStep] = useState("capture");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [hasHerbalMedicine, setHasHerbalMedicine] = useState(null);
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [hospitalStep, setHospitalStep] = useState("symptom");
  const [hospitalIndex, setHospitalIndex] = useState(0);
  const [selectedCostBody, setSelectedCostBody] = useState("허리");
  const [selectedTreatment, setSelectedTreatment] = useState("X-ray 검사");
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const speak = (message) => {
    if (!("speechSynthesis" in window)) {
      alert("이 브라우저에서는 음성 안내를 지원하지 않아요.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "ko-KR";
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  };

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setMedicineStep("ocr");
  };

  return (
    <div className="min-h-screen bg-white text-boyak-ink">
      <button
        className="fixed bottom-5 right-5 z-50 inline-flex min-h-16 min-w-16 items-center justify-center gap-3 rounded-full bg-boyak-blue px-5 text-white shadow-soft sm:bottom-7 sm:right-7 sm:min-w-[184px]"
        type="button"
        aria-label="음성 안내 항상 듣기"
        onClick={() => speak("보약은 음성으로 말하고 들을 수 있어요. 필요한 화면에서 큰 버튼을 누르거나 말씀해주세요.")}
      >
        <Volume2 className="size-8" strokeWidth={2.8} aria-hidden="true" />
        <span className="hidden text-xl font-black sm:inline">음성 도움</span>
      </button>

      <header className="flex min-h-28 flex-col gap-5 border-b-[3px] border-boyak-blue px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-24">
        <button
          className="inline-flex min-h-12 items-center gap-3 self-start text-2xl font-extrabold text-boyak-blue"
          type="button"
          onClick={() => setView("home")}
        >
          <span className="grid size-11 place-items-center rounded-lg bg-boyak-blue text-3xl text-white">+</span>
          보약
        </button>
        <nav className="flex items-center justify-between gap-4 sm:justify-end sm:gap-10 lg:gap-16" aria-label="상단 메뉴">
          <button
            className="inline-flex min-h-12 items-center gap-2 rounded-lg px-2 text-xl font-bold text-boyak-muted"
            type="button"
            onClick={() => speak("오늘도 안전하게 약을 확인해요. 화면의 큰 버튼을 눌러 필요한 기능을 시작하세요.")}
          >
            <Volume2 className="size-6" aria-hidden="true" />
            음성 안내
          </button>
          <button className="inline-flex min-h-12 items-center gap-2 rounded-lg px-2 text-xl font-bold text-boyak-muted" type="button">
            <Settings className="size-6" aria-hidden="true" />
            설정
          </button>
        </nav>
      </header>

      <main className="px-5 pb-28 pt-8 sm:px-10 lg:px-24 lg:py-16">
        {view === "home" && (
          <section aria-labelledby="home-title">
            <div className="mb-11">
              <p className="mb-3 text-base font-extrabold text-boyak-muted">독거 어르신 복약 도우미</p>
              <h1 id="home-title" className="mb-4 text-4xl font-black leading-tight">
                안녕하세요!
              </h1>
              <p className="text-2xl font-bold leading-relaxed text-boyak-muted">오늘도 안전하게 약을 확인해요</p>
            </div>

            <div className="mb-11 grid gap-5 lg:grid-cols-3 lg:gap-10" aria-label="주요 기능">
              {featureCards.map((feature) => {
                const Icon = feature.icon;
                return (
                  <button
                    key={feature.id}
                    className={`${feature.color} flex min-h-64 flex-col items-center justify-center rounded-xl px-6 py-8 text-center text-white shadow-soft transition-transform active:scale-[0.98] lg:min-h-[350px]`}
                    type="button"
                    onClick={() => {
                      if (feature.id === "medicine") setMedicineStep("capture");
                      if (feature.id === "hospital") setHospitalStep("symptom");
                      setView(feature.id);
                    }}
                  >
                    <span className="mb-7 text-4xl font-black leading-none">{feature.title}</span>
                    <span className="grid size-24 place-items-center rounded-full bg-[#FFE68C] text-boyak-blue">
                      <Icon className="size-12" strokeWidth={2.8} aria-hidden="true" />
                    </span>
                    <span className="mt-7 text-2xl font-black leading-snug">{feature.copy}</span>
                  </button>
                );
              })}
            </div>

            <aside className="flex flex-col gap-7 rounded-xl border border-[#C8DAF7] bg-[#EDF4FF] p-7 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="mb-3 text-xl font-black text-boyak-blue">약손 박사의 한마디:</h2>
                <p className="text-2xl font-extrabold leading-relaxed">여러 병원 약을 함께 드실 땐 꼭 확인하세요.</p>
              </div>
              <button
                className="min-h-[70px] rounded-lg bg-boyak-blue px-9 text-xl font-black text-white"
                type="button"
                onClick={() => speak("여러 병원 약을 함께 드실 땐 꼭 확인하세요.")}
              >
                한마디 듣기
              </button>
            </aside>
          </section>
        )}

        {view === "medicine" && (
          <MedicineFlowScreen
            step={medicineStep}
            previewUrl={previewUrl}
            hasHerbalMedicine={hasHerbalMedicine}
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            onImageChange={handleImage}
            onBack={() => {
              if (medicineStep === "capture") setView("home");
              else setMedicineStep("capture");
            }}
            onStepChange={setMedicineStep}
            onHerbalChange={setHasHerbalMedicine}
            onSpeak={speak}
          />
        )}

        {view === "hospital" && (
          <>
            {hospitalStep === "symptom" && (
              <SymptomSelectScreen
                selectedSymptom={selectedSymptom}
                onBack={() => setView("home")}
                onSelect={(symptom) => {
                  setSelectedSymptom(symptom);
                  setHospitalIndex(0);
                  setHospitalStep("results");
                  speak(`${symptom}가 아프시군요. 가까운 병원을 찾았어요.`);
                }}
                onSpeak={() => speak("어디가 아프세요? 허리, 무릎, 어깨, 두통 중에서 말하거나 큰 버튼을 선택해주세요.")}
              />
            )}
            {hospitalStep === "results" && (
              <HospitalResultsScreen
                hospital={nearbyHospitals[hospitalIndex]}
                symptom={selectedSymptom}
                onBack={() => setHospitalStep("symptom")}
                onNextHospital={() => setHospitalIndex((hospitalIndex + 1) % nearbyHospitals.length)}
                onRoute={() => {
                  setHospitalStep("route");
                  speak(`${nearbyHospitals[hospitalIndex].name}까지 길안내를 시작합니다. 200미터 직진하세요.`);
                }}
                onSpeak={() =>
                  speak(
                    `${nearbyHospitals[hospitalIndex].name}을 찾았어요. ${nearbyHospitals[hospitalIndex].walk}, ${nearbyHospitals[hospitalIndex].distance} 거리입니다. ${nearbyHospitals[hospitalIndex].route}입니다.`
                  )
                }
              />
            )}
            {hospitalStep === "route" && (
              <RouteGuideScreen
                hospital={nearbyHospitals[hospitalIndex]}
                onBack={() => setHospitalStep("results")}
                onSpeak={() => speak(`${nearbyHospitals[hospitalIndex].name}까지 안내 중입니다. 200미터 직진하세요. 남은 거리는 520미터, 약 8분입니다.`)}
              />
            )}
          </>
        )}

        {view === "cost" && (
          <CostEstimateScreen
            selectedBody={selectedCostBody}
            selectedTreatment={selectedTreatment}
            onBack={() => setView("home")}
            onSelectBody={(body) => {
              setSelectedCostBody(body);
              speak(`${body} 부위를 선택했어요. 알고 싶은 치료나 검사를 선택해주세요.`);
            }}
            onSelectTreatment={(treatment) => {
              setSelectedTreatment(treatment);
              speak(`${treatment} 예상 비용은 ${treatmentCosts[treatment]} 정도예요. 병원마다 차이가 있을 수 있어요.`);
            }}
            onSpeak={() =>
              speak(
                `${selectedCostBody} 부위의 ${selectedTreatment} 예상 비용은 ${treatmentCosts[selectedTreatment]} 정도예요. 건강보험 적용 여부와 병원에 따라 차이가 있을 수 있어요.`
              )
            }
            onAsk={() => speak("궁금한 병원비를 말씀해주세요. 예를 들어, MRI 비용은 얼마예요 라고 말할 수 있어요.")}
          />
        )}
      </main>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button className="mb-7 inline-flex min-h-12 items-center gap-2 rounded-lg text-xl font-black text-boyak-blue" type="button" onClick={onClick}>
      <ChevronLeft className="size-7" aria-hidden="true" />
      처음으로
    </button>
  );
}

function MedicineFlowScreen({
  step,
  previewUrl,
  hasHerbalMedicine,
  cameraInputRef,
  galleryInputRef,
  onImageChange,
  onBack,
  onStepChange,
  onHerbalChange,
  onSpeak
}) {
  const currentIndex = ["capture", "ocr", "review", "add", "herbal", "dur", "result"].indexOf(step);

  return (
    <section aria-labelledby="medicine-title">
      <BackButton onClick={onBack} />
      <div className="mb-8 flex flex-wrap items-center gap-4 text-boyak-blue">
        <span className="grid size-14 place-items-center rounded-full bg-boyak-blue text-white">
          <Pill className="size-9" aria-hidden="true" />
        </span>
        <h1 id="medicine-title" className="text-3xl font-black leading-tight sm:text-4xl">
          약 복용 안전 확인 흐름
        </h1>
        <button
          className="ml-auto grid size-16 place-items-center rounded-full text-boyak-ink"
          type="button"
          aria-label="약 복용 안전 확인 음성 안내 듣기"
          onClick={() => onSpeak("약을 촬영하고, 인식된 내용을 확인한 뒤, 집에 있는 다른 약과 한약 복용 여부를 알려주세요. 그 다음 DUR 분석 결과를 안내합니다.")}
        >
          <Volume2 className="size-11" strokeWidth={2.3} aria-hidden="true" />
        </button>
      </div>

      <div className="mb-8 grid gap-3 md:grid-cols-4 xl:grid-cols-7" aria-label="약 복용 안전 확인 단계">
        {medicineSteps.map((label, index) => (
          <button
            key={label}
            className={`min-h-16 rounded-2xl border px-3 text-base font-black ${
              index <= currentIndex ? "border-boyak-blue bg-[#EDF4FF] text-boyak-blue" : "border-boyak-line bg-white text-boyak-muted"
            }`}
            type="button"
            onClick={() => onStepChange(["capture", "ocr", "review", "add", "herbal", "dur", "result"][index])}
          >
            <span className="mr-2 inline-grid size-7 place-items-center rounded-full bg-boyak-blue text-sm text-white">{index + 1}</span>
            {label}
          </button>
        ))}
      </div>

      {step === "capture" && (
        <div>
          <input ref={cameraInputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={onImageChange} />
          <input ref={galleryInputRef} className="hidden" type="file" accept="image/*" onChange={onImageChange} />
          <button
            className="mb-8 flex min-h-[360px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[#D6DFEE] bg-[#FBFCFE] p-7 text-center shadow-soft sm:p-10"
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            aria-label="약 봉투나 처방전 사진 촬영하기"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="선택한 약 사진 미리보기" className="max-h-[290px] max-w-full rounded-lg object-contain" />
            ) : (
              <>
                <p className="mb-12 max-w-[520px] text-3xl font-black leading-relaxed text-boyak-ink">약 봉투 또는 처방전을 촬영해주세요</p>
                <span className="relative grid h-44 w-full max-w-[520px] place-items-center rounded-[26px] bg-white">
                  <span className="absolute left-5 top-5 size-10 rounded-tl-md border-l-[7px] border-t-[7px] border-[#444B56]" />
                  <span className="absolute right-5 top-5 size-10 rounded-tr-md border-r-[7px] border-t-[7px] border-[#444B56]" />
                  <span className="absolute bottom-5 left-5 size-10 rounded-bl-md border-b-[7px] border-l-[7px] border-[#444B56]" />
                  <span className="absolute bottom-5 right-5 size-10 rounded-br-md border-b-[7px] border-r-[7px] border-[#444B56]" />
                  <span className="grid size-24 place-items-center rounded-2xl bg-[#DADDE2] text-[#454B54] shadow-inner">
                    <Camera className="size-16" strokeWidth={2.7} aria-hidden="true" />
                  </span>
                </span>
              </>
            )}
          </button>

          <div className="grid gap-4 lg:grid-cols-3">
            <button className="inline-flex min-h-[88px] items-center justify-center gap-3 rounded-lg bg-boyak-blue px-8 text-xl font-black text-white" type="button" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="size-7" aria-hidden="true" />
              사진 촬영
            </button>
            <button className="inline-flex min-h-[88px] items-center justify-center gap-3 rounded-lg border border-boyak-line bg-boyak-field px-8 text-xl font-black" type="button" onClick={() => galleryInputRef.current?.click()}>
              <ImagePlus className="size-7" aria-hidden="true" />
              갤러리에서 선택
            </button>
            <button
              className="inline-flex min-h-[88px] items-center justify-center gap-3 rounded-lg border border-boyak-line bg-boyak-field px-8 text-xl font-black"
              type="button"
              onClick={() => {
                onStepChange("ocr");
                onSpeak("OCR 분석 화면으로 이동합니다. 실제 인식 기능은 백엔드와 연결될 예정입니다.");
              }}
            >
              <FileText className="size-7 text-boyak-blue" aria-hidden="true" />
              OCR 분석 시작
            </button>
          </div>
        </div>
      )}

      {step === "ocr" && (
        <FlowPanel
          icon={<Loader2 className="size-14 animate-spin text-boyak-blue" aria-hidden="true" />}
          title="OCR로 약 정보를 읽는 중이에요"
          body="약 이름, 성분, 조제일자를 자동으로 추출할 예정입니다. 지금은 다음 단계에서 목업 결과를 확인할 수 있어요."
          primaryLabel="추출 내용 확인"
          onPrimary={() => onStepChange("review")}
          onSpeak={() => onSpeak("약 이름과 조제일자를 읽고 있어요. 다음 화면에서 인식 결과를 확인하고 수정할 수 있어요.")}
        />
      )}

      {step === "review" && (
        <div className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm">
          <StepHeader icon={<ListChecks className="size-12 text-boyak-blue" />} title="추출된 내용을 확인해주세요" onSpeak={() => onSpeak("인식된 약 이름과 조제일자를 확인해주세요. 틀린 내용은 수정할 수 있어요.")} />
          <div className="grid gap-4">
            {extractedMedicines.map((medicine) => (
              <label key={medicine.name} className="grid gap-2 rounded-2xl border-2 border-boyak-line bg-boyak-field p-5">
                <span className="text-lg font-black text-boyak-muted">약 이름</span>
                <input className="min-h-14 rounded-xl border border-boyak-line bg-white px-4 text-2xl font-black" defaultValue={medicine.name} />
                <span className="text-lg font-bold text-boyak-muted">{medicine.detail}</span>
              </label>
            ))}
          </div>
          <NextAction label="다른 약 추가하기" onClick={() => onStepChange("add")} />
        </div>
      )}

      {step === "add" && (
        <div className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm">
          <StepHeader icon={<Plus className="size-12 text-boyak-blue" />} title="집에 있는 다른 약도 추가할까요?" onSpeak={() => onSpeak("집에 있는 감기약, 소화제, 영양제도 함께 확인하면 더 안전해요.")} />
          <div className="grid gap-4 md:grid-cols-3">
            {homeMedicines.map((medicine) => (
              <button key={medicine} className="min-h-28 rounded-2xl border-2 border-[#30343B] bg-white px-5 text-3xl font-black" type="button">
                {medicine}
              </button>
            ))}
          </div>
          <NextAction label="한약 복용 여부 확인" onClick={() => onStepChange("herbal")} />
        </div>
      )}

      {step === "herbal" && (
        <div className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm">
          <StepHeader icon={<Leaf className="size-12 text-boyak-green" />} title="한약을 함께 드시나요?" onSpeak={() => onSpeak("한약을 함께 드시는지 알려주세요. 양약과 함께 먹을 때 주의가 필요할 수 있어요.")} />
          <div className="grid gap-4 md:grid-cols-2">
            <button className={`min-h-32 rounded-2xl border-2 px-6 text-4xl font-black ${hasHerbalMedicine === true ? "border-boyak-green bg-[#EDF9F1] text-boyak-green" : "border-[#30343B] bg-white"}`} type="button" onClick={() => onHerbalChange(true)}>
              예
            </button>
            <button className={`min-h-32 rounded-2xl border-2 px-6 text-4xl font-black ${hasHerbalMedicine === false ? "border-boyak-green bg-[#EDF9F1] text-boyak-green" : "border-[#30343B] bg-white"}`} type="button" onClick={() => onHerbalChange(false)}>
              아니오
            </button>
          </div>
          <NextAction label="DUR 분석 시작" onClick={() => onStepChange("dur")} />
        </div>
      )}

      {step === "dur" && (
        <FlowPanel
          icon={<ShieldCheck className="size-14 text-boyak-blue" aria-hidden="true" />}
          title="DUR 분석으로 위험 조합을 확인해요"
          body="병용금기, 연령금기, 중복 성분, 일반의약품 포함 여부를 백엔드 API로 검증할 예정입니다."
          primaryLabel="결과 확인"
          onPrimary={() => onStepChange("result")}
          onSpeak={() => onSpeak("DUR 분석으로 함께 먹으면 안 되는 약, 나이에 주의가 필요한 약, 같은 성분 중복 여부를 확인합니다.")}
        />
      )}

      {step === "result" && (
        <div className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm">
          <StepHeader icon={<AlertTriangle className="size-12 text-boyak-red" />} title="결과를 확인해주세요" onSpeak={() => onSpeak("주의가 필요합니다. 감기약과 타이레놀은 같은 해열진통 성분이 겹칠 수 있어요. 약사나 의사에게 확인하세요.")} />
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border-2 border-[#FFC5C5] bg-[#FFF0F0] p-6">
              <p className="mb-3 text-xl font-black text-boyak-red">주의</p>
              <h2 className="mb-3 text-3xl font-black">중복 성분 가능성</h2>
              <p className="text-xl font-bold leading-relaxed text-boyak-muted">감기약과 타이레놀은 해열진통 성분이 겹칠 수 있어요.</p>
            </div>
            <div className="rounded-2xl border-2 border-[#BFE5CB] bg-[#EDF9F1] p-6">
              <p className="mb-3 text-xl font-black text-boyak-green">안내</p>
              <h2 className="mb-3 text-3xl font-black">복약 전 상담 권장</h2>
              <p className="text-xl font-bold leading-relaxed text-boyak-muted">위험 조합이 의심되면 가까운 병원이나 약국에 확인하세요.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <button className="inline-flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-boyak-red px-6 text-2xl font-black text-white" type="button">
              <Hospital className="size-8" aria-hidden="true" />
              의사 상담 권장
            </button>
            <button className="inline-flex min-h-20 items-center justify-center gap-3 rounded-2xl border-2 border-boyak-line bg-white px-6 text-2xl font-black" type="button" onClick={() => onSpeak("주의가 필요합니다. 감기약과 타이레놀은 같은 해열진통 성분이 겹칠 수 있어요.")}>
              <Volume2 className="size-8 text-boyak-blue" aria-hidden="true" />
              결과 음성 안내
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function StepHeader({ icon, title, onSpeak }) {
  return (
    <div className="mb-7 flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        {icon}
        <h2 className="text-3xl font-black leading-tight">{title}</h2>
      </div>
      <button className="grid size-14 shrink-0 place-items-center rounded-full text-boyak-ink" type="button" aria-label={`${title} 음성 안내 듣기`} onClick={onSpeak}>
        <Volume2 className="size-10" aria-hidden="true" />
      </button>
    </div>
  );
}

function FlowPanel({
  icon,
  title,
  body,
  primaryLabel,
  onPrimary,
  onSpeak
}) {
  return (
    <div className="rounded-[28px] border-2 border-boyak-line bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 grid size-24 place-items-center rounded-full bg-[#EDF4FF]">{icon}</div>
      <h2 className="mb-4 text-3xl font-black">{title}</h2>
      <p className="mx-auto mb-8 max-w-2xl text-xl font-bold leading-relaxed text-boyak-muted">{body}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <button className="min-h-20 rounded-2xl bg-boyak-blue px-6 text-2xl font-black text-white" type="button" onClick={onPrimary}>
          {primaryLabel}
        </button>
        <button className="inline-flex min-h-20 items-center justify-center gap-3 rounded-2xl border-2 border-boyak-line bg-white px-6 text-2xl font-black" type="button" onClick={onSpeak}>
          <Volume2 className="size-8 text-boyak-blue" aria-hidden="true" />
          음성으로 듣기
        </button>
      </div>
    </div>
  );
}

function NextAction({ label, onClick }) {
  return (
    <button className="mt-7 min-h-20 w-full rounded-2xl bg-boyak-blue px-6 text-2xl font-black text-white" type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function SymptomSelectScreen({
  selectedSymptom,
  onBack,
  onSelect,
  onSpeak
}) {
  return (
    <section aria-labelledby="symptom-title">
      <BackButton onClick={onBack} />
      <div className="mx-auto max-w-[560px] rounded-[30px] border-2 border-boyak-line bg-white px-7 py-8 shadow-soft sm:px-9 sm:py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <h1 id="symptom-title" className="text-center text-3xl font-black leading-relaxed sm:text-4xl">
            어디가 아프세요?
            <br />
            말하거나 선택해주세요
          </h1>
          <button className="grid size-16 shrink-0 place-items-center rounded-full text-boyak-ink" type="button" aria-label="증상 선택 안내 듣기" onClick={onSpeak}>
            <Volume2 className="size-11" strokeWidth={2.3} aria-hidden="true" />
          </button>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-5 sm:gap-7" aria-label="증상 선택지">
          {symptomOptions.map((symptom) => {
            const isSelected = selectedSymptom === symptom;
            return (
              <button
                key={symptom}
                className={`min-h-32 rounded-2xl border-2 px-4 text-3xl font-black shadow-sm transition active:scale-[0.98] sm:min-h-36 sm:text-4xl ${
                  isSelected ? "border-boyak-green bg-[#EDF9F1] text-boyak-green" : "border-[#30343B] bg-white text-boyak-ink"
                }`}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(symptom)}
              >
                {symptom}
              </button>
            );
          })}
        </div>

        <button
          className="mb-5 inline-flex min-h-[112px] w-full items-center justify-center gap-5 rounded-2xl border-2 border-[#30343B] bg-white px-8 text-3xl font-black active:scale-[0.99]"
          type="button"
          onClick={onSpeak}
        >
          <Mic className="size-14 text-boyak-muted" strokeWidth={2.4} aria-hidden="true" />
          말하기
        </button>

        {selectedSymptom && (
          <div className="rounded-xl bg-[#EDF9F1] p-5 text-center text-xl font-extrabold leading-relaxed text-boyak-green">
            {selectedSymptom} 통증에 맞는 병원을 찾는 중이에요.
          </div>
        )}
      </div>
    </section>
  );
}

function HospitalResultsScreen({
  hospital,
  symptom,
  onBack,
  onNextHospital,
  onRoute,
  onSpeak
}) {
  return (
    <section aria-labelledby="hospital-result-title">
      <BackButton onClick={onBack} />
      <div className="mx-auto max-w-[560px] rounded-[30px] border-2 border-boyak-line bg-white px-7 py-8 shadow-soft sm:px-9 sm:py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <h1 id="hospital-result-title" className="text-center text-3xl font-black leading-relaxed sm:text-4xl">
            가까운 병원을
            <br />
            찾았어요
          </h1>
          <button className="grid size-16 shrink-0 place-items-center rounded-full text-boyak-ink" type="button" aria-label="추천 병원 음성으로 듣기" onClick={onSpeak}>
            <Volume2 className="size-11" strokeWidth={2.3} aria-hidden="true" />
          </button>
        </div>

        <article className="mb-6 rounded-3xl border-2 border-[#30343B] bg-white p-7">
          <p className="mb-3 text-xl font-black text-boyak-green">{symptom ? `${symptom} 통증 추천` : "가까운 병원 추천"}</p>
          <h2 className="mb-7 text-4xl font-black leading-tight">
            {hospital.name}
            <span className="mt-2 block text-2xl text-boyak-muted">{hospital.department}</span>
          </h2>
          <div className="grid gap-4 text-2xl font-extrabold">
            <p className="inline-flex items-center gap-4">
              <Navigation className="size-8 text-boyak-muted" aria-hidden="true" />
              {hospital.walk} ({hospital.distance})
            </p>
            <p className="inline-flex items-center gap-4">
              <MapPin className="size-8 text-boyak-muted" aria-hidden="true" />
              {hospital.route}
            </p>
          </div>
          <span className="mt-7 inline-flex min-h-14 items-center rounded-xl bg-[#555B64] px-8 text-xl font-black text-white">{hospital.status}</span>
        </article>

        <div className="grid gap-5">
          <button className="min-h-[86px] rounded-2xl border-2 border-[#30343B] bg-white px-7 text-3xl font-black" type="button" onClick={onNextHospital}>
            다른 병원 보기
          </button>
          <button className="min-h-[96px] rounded-2xl border-2 border-[#30343B] bg-white px-7 text-3xl font-black" type="button" onClick={onRoute}>
            길안내 시작
          </button>
          <button className="inline-flex min-h-[96px] items-center justify-center gap-5 rounded-2xl bg-boyak-green px-8 text-3xl font-black text-white" type="button" onClick={onSpeak}>
            <Mic className="size-12" strokeWidth={2.4} aria-hidden="true" />
            말하기
          </button>
        </div>
      </div>
    </section>
  );
}

function RouteGuideScreen({
  hospital,
  onBack,
  onSpeak
}) {
  return (
    <section aria-labelledby="route-title">
      <BackButton onClick={onBack} />
      <div className="mx-auto max-w-[560px] overflow-hidden rounded-[30px] border-2 border-boyak-line bg-white shadow-soft">
        <div className="flex items-start justify-between gap-4 px-7 py-8 sm:px-9">
          <h1 id="route-title" className="text-center text-3xl font-black leading-relaxed sm:text-4xl">
            안내를 시작합니다
          </h1>
          <button className="grid size-16 shrink-0 place-items-center rounded-full text-boyak-ink" type="button" aria-label="경로 안내 음성으로 듣기" onClick={onSpeak}>
            <Volume2 className="size-11" strokeWidth={2.3} aria-hidden="true" />
          </button>
        </div>

        <div className="relative h-[360px] bg-[#EFF1F4]">
          <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(90deg,rgba(255,255,255,.9)_2px,transparent_2px),linear-gradient(rgba(255,255,255,.9)_2px,transparent_2px)] [background-size:72px_72px]" />
          <div className="absolute left-[22%] top-[62%] size-12 rounded-full border-[7px] border-[#424850] bg-white" />
          <div className="absolute right-[16%] top-[22%] grid size-14 place-items-center rounded-full bg-[#424850] text-white">
            <MapPin className="size-10" fill="currentColor" aria-hidden="true" />
          </div>
          <div className="absolute left-[28%] top-[47%] h-9 w-[28%] rounded-l-full border-b-[14px] border-l-[14px] border-[#5B616B]" />
          <div className="absolute left-[50%] top-[29%] h-[92px] w-9 border-r-[14px] border-[#5B616B]" />
          <div className="absolute left-[56%] top-[29%] h-9 w-[28%] rounded-r-full border-r-[14px] border-t-[14px] border-[#5B616B]" />
        </div>

        <div className="m-7 rounded-3xl border-2 border-boyak-line bg-white p-7">
          <p className="mb-7 inline-flex items-center gap-5 text-3xl font-black">
            <ArrowUp className="size-16" strokeWidth={2.8} aria-hidden="true" />
            200m 직진하세요
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-boyak-line pt-5 text-xl font-extrabold text-boyak-muted">
            <span>남은 거리 520m</span>
            <span aria-hidden="true">|</span>
            <span className="inline-flex items-center gap-2">
              <Clock className="size-6" aria-hidden="true" />약 8분
            </span>
          </div>
          <p className="mt-4 text-lg font-bold text-boyak-muted">목적지: {hospital.name}</p>
        </div>

        <div className="px-7 pb-7">
          <button className="inline-flex min-h-[96px] w-full items-center justify-center gap-5 rounded-2xl bg-boyak-green px-8 text-3xl font-black text-white" type="button" onClick={onSpeak}>
            <Mic className="size-12" strokeWidth={2.4} aria-hidden="true" />
            말하기
          </button>
        </div>
      </div>
    </section>
  );
}

function CostEstimateScreen({
  selectedBody,
  selectedTreatment,
  onBack,
  onSelectBody,
  onSelectTreatment,
  onSpeak,
  onAsk
}) {
  return (
    <section aria-labelledby="cost-title">
      <BackButton onClick={onBack} />
      <div className="mb-8 flex flex-wrap items-center gap-4 text-boyak-orange">
        <span className="grid size-14 place-items-center rounded-full bg-boyak-orange text-3xl font-black text-white">W</span>
        <h1 id="cost-title" className="text-3xl font-black leading-tight sm:text-4xl">
          병원비 예상 비용 확인 흐름
        </h1>
        <button className="ml-auto grid size-16 place-items-center rounded-full text-boyak-ink" type="button" aria-label="병원비 화면 음성 안내 듣기" onClick={onSpeak}>
          <Volume2 className="size-11" strokeWidth={2.3} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-4">
        <section className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm" aria-labelledby="cost-step-1">
          <StepLabel number="1" title="부위 선택" />
          <h2 id="cost-step-1" className="mb-7 text-xl font-black leading-relaxed">
            어떤 부위가
            <br />
            불편하세요?
          </h2>
          <div className="grid gap-4">
            {costBodyOptions.map((body) => {
              const isSelected = selectedBody === body;
              return (
                <button
                  key={body}
                  className={`min-h-24 rounded-2xl border-2 px-5 text-3xl font-black active:scale-[0.98] ${
                    isSelected ? "border-boyak-orange bg-[#FFF3E8] text-boyak-orange" : "border-boyak-line bg-white text-[#27406A]"
                  }`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectBody(body)}
                >
                  {body}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm" aria-labelledby="cost-step-2">
          <StepLabel number="2" title="치료/검사 선택" />
          <h2 id="cost-step-2" className="mb-7 text-xl font-black leading-relaxed">
            {selectedBody} 통증
            <br />
            어떤 치료를 알고 싶으세요?
          </h2>
          <div className="grid gap-4">
            {treatmentOptions.map((treatment) => {
              const isSelected = selectedTreatment === treatment;
              return (
                <button
                  key={treatment}
                  className={`min-h-16 rounded-2xl border-2 px-5 text-left text-xl font-black active:scale-[0.98] ${
                    isSelected ? "border-boyak-orange bg-[#FFF3E8] text-boyak-orange" : "border-boyak-line bg-white text-boyak-ink"
                  }`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectTreatment(treatment)}
                >
                  {treatment}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm" aria-labelledby="cost-step-3">
          <StepLabel number="3" title="예상 비용 안내" />
          <h2 id="cost-step-3" className="mb-6 text-xl font-black">예상 비용 (건강보험 적용 후)</h2>
          <div className="mb-6 rounded-2xl bg-[#EFFAF4] p-6 text-center text-4xl font-black leading-snug text-[#16804D]">
            약 12,000원 ~<br />
            25,000원
          </div>
          <dl className="grid gap-4 text-xl font-extrabold">
            {["진료비(초진)", "X-ray 검사", "물리치료(1회)"].map((item) => (
              <div key={item} className="flex justify-between gap-4">
                <dt>{item}</dt>
                <dd>{treatmentCosts[item]}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 rounded-xl bg-[#F1F4FA] p-4 text-base font-bold text-boyak-muted">병원마다 차이가 있을 수 있어요.</p>
          <button className="mt-5 inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-boyak-orange px-5 text-xl font-black text-white" type="button" onClick={onSpeak}>
            <Volume2 className="size-7" aria-hidden="true" />
            음성으로 듣기
          </button>
        </section>

        <section className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm" aria-labelledby="cost-step-4">
          <StepLabel number="4" title="추가 설명" />
          <h2 id="cost-step-4" className="mb-6 text-xl font-black">챗봇에게 물어보기</h2>
          <div className="mb-5 rounded-2xl bg-[#EEF4FF] p-5 text-xl font-extrabold leading-relaxed text-[#27406A]">
            궁금한 점이 있나요?
            <br />
            예) MRI 비용은?
          </div>
          <div className="mb-5 rounded-2xl bg-[#F4F0FF] p-5 text-xl font-extrabold leading-relaxed text-[#27406A]">
            {selectedTreatment} 비용은 보험 적용 후 {treatmentCosts[selectedTreatment]} 정도 예상돼요.
          </div>
          <button className="mb-4 inline-flex min-h-20 w-full items-center justify-center gap-4 rounded-2xl border-2 border-boyak-line bg-white px-6 text-2xl font-black" type="button" onClick={onAsk}>
            <Mic className="size-10 text-boyak-orange" strokeWidth={2.4} aria-hidden="true" />
            말하기
          </button>
          <button className="inline-flex min-h-20 w-full items-center justify-center gap-4 rounded-2xl border-2 border-boyak-line bg-white px-6 text-2xl font-black" type="button" onClick={onSpeak}>
            <Volume2 className="size-9 text-boyak-orange" aria-hidden="true" />
            음성으로 듣기
          </button>
        </section>
      </div>
    </section>
  );
}

function StepLabel({ number, title }) {
  return (
    <p className="mb-5 inline-flex items-center gap-3 text-xl font-black">
      <span className="grid size-9 place-items-center rounded-full bg-boyak-orange text-white">{number}</span>
      {title}
    </p>
  );
}

function PlaceholderScreen({ title, body, onBack }) {
  return (
    <section>
      <BackButton onClick={onBack} />
      <div className="max-w-3xl rounded-xl border border-boyak-line bg-boyak-field p-8">
        <h1 className="mb-5 text-4xl font-black leading-tight">{title}</h1>
        <p className="text-2xl font-bold leading-relaxed text-boyak-muted">{body}</p>
      </div>
    </section>
  );
}
