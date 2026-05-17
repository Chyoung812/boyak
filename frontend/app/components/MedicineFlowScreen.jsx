"use client";

import { memo } from "react";
import {
  AlertTriangle,
  Camera,
  FileText,
  Hospital,
  ImagePlus,
  Leaf,
  ListChecks,
  Loader2,
  Pill,
  Plus,
  ShieldCheck,
  Volume2,
} from "lucide-react";

import { extractedMedicines, homeMedicines, medicineSteps, medicineStepKeys } from "../constants";
import BackButton from "./BackButton";
import StepHeader from "./StepHeader";
import FlowPanel from "./FlowPanel";
import NextAction from "./NextAction";

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
  onSpeak,
}) {
  const currentIndex = medicineStepKeys.indexOf(step);
  const currentStepLabel = medicineSteps[currentIndex] ?? medicineSteps[0];

  return (
    <section className="lg:flex lg:h-full lg:flex-col" aria-labelledby="medicine-title">
      <BackButton onClick={onBack} />
      <div className="mb-8 flex flex-wrap items-center gap-4 text-boyak-blue lg:mb-3 lg:gap-3">
        <span className="grid size-14 place-items-center rounded-full bg-boyak-blue text-white lg:size-10">
          <Pill className="size-9 lg:size-6" aria-hidden="true" />
        </span>
        <h1 id="medicine-title" className="text-3xl font-black leading-tight sm:text-4xl lg:text-2xl">
          약 복용 안전 확인 흐름
        </h1>
        <button
          className="ml-auto grid size-16 place-items-center rounded-full text-boyak-ink lg:size-11"
          type="button"
          aria-label="약 복용 안전 확인 음성 안내 듣기"
          onClick={() =>
            onSpeak(
              "약을 촬영하고, 인식된 내용을 확인한 뒤, 집에 있는 다른 약과 한약 복용 여부를 알려주세요. 그 다음 DUR 분석 결과를 안내합니다."
            )
          }
        >
          <Volume2 className="size-11 lg:size-8" strokeWidth={2.3} aria-hidden="true" />
        </button>
      </div>

      {/* Mobile step indicator */}
      <div className="mb-6 rounded-2xl border border-[#C8DAF7] bg-[#EDF4FF] p-4 md:hidden" aria-label="현재 약 복용 안전 확인 단계">
        <p className="text-base font-black text-boyak-muted">현재 진행 단계</p>
        <p className="mt-1 text-2xl font-black text-boyak-blue">
          {currentIndex + 1} / {medicineSteps.length} {currentStepLabel}
        </p>
      </div>

      {/* Desktop step bar */}
      <div className="mb-8 hidden gap-3 md:grid md:grid-cols-4 lg:mb-3 lg:gap-2 xl:grid-cols-7" aria-label="약 복용 안전 확인 단계">
        {medicineSteps.map((label, index) => (
          <button
            key={label}
            className={`min-h-16 rounded-2xl border px-3 text-base font-black lg:min-h-11 lg:rounded-xl lg:px-2 lg:text-sm ${
              index <= currentIndex
                ? "border-boyak-blue bg-[#EDF4FF] text-boyak-blue"
                : "border-boyak-line bg-white text-boyak-muted"
            }`}
            type="button"
            onClick={() => onStepChange(medicineStepKeys[index])}
          >
            <span className="mr-2 inline-grid size-7 place-items-center rounded-full bg-boyak-blue text-sm text-white lg:size-5 lg:text-xs">
              {index + 1}
            </span>
            {label}
          </button>
        ))}
      </div>

      {step === "capture" && (
        <CaptureStep
          previewUrl={previewUrl}
          cameraInputRef={cameraInputRef}
          galleryInputRef={galleryInputRef}
          onImageChange={onImageChange}
          onStepChange={onStepChange}
          onSpeak={onSpeak}
        />
      )}

      {step === "ocr" && (
        <FlowPanel
          icon={<Loader2 className="size-14 animate-spin text-boyak-blue" aria-hidden="true" />}
          title="OCR로 약 정보를 읽는 중이에요"
          body="약 이름, 성분, 조제일자를 자동으로 추출할 예정입니다. 지금은 다음 단계에서 목업 결과를 확인할 수 있어요."
          primaryLabel="추출 내용 확인"
          onPrimary={() => onStepChange("review")}
          onSpeak={() =>
            onSpeak("약 이름과 조제일자를 읽고 있어요. 다음 화면에서 인식 결과를 확인하고 수정할 수 있어요.")
          }
        />
      )}

      {step === "review" && (
        <div className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:p-5">
          <StepHeader
            icon={<ListChecks className="size-12 text-boyak-blue" />}
            title="추출된 내용을 확인해주세요"
            onSpeak={() => onSpeak("인식된 약 이름과 조제일자를 확인해주세요. 틀린 내용은 수정할 수 있어요.")}
          />
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-3">
            {extractedMedicines.map((medicine) => (
              <label key={medicine.name} className="grid gap-2 rounded-2xl border-2 border-boyak-line bg-boyak-field p-5 lg:p-4">
                <span className="text-lg font-black text-boyak-muted lg:text-base">약 이름</span>
                <input
                  className="min-h-14 rounded-xl border border-boyak-line bg-white px-4 text-2xl font-black lg:min-h-12 lg:text-xl"
                  defaultValue={medicine.name}
                />
                <span className="text-lg font-bold text-boyak-muted lg:text-base">{medicine.detail}</span>
              </label>
            ))}
          </div>
          <NextAction label="다른 약 추가하기" onClick={() => onStepChange("add")} />
        </div>
      )}

      {step === "add" && (
        <div className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:p-5">
          <StepHeader
            icon={<Plus className="size-12 text-boyak-blue" />}
            title="집에 있는 다른 약도 추가할까요?"
            onSpeak={() => onSpeak("집에 있는 감기약, 소화제, 영양제도 함께 확인하면 더 안전해요.")}
          />
          <div className="grid gap-4 md:grid-cols-3 lg:gap-3">
            {homeMedicines.map((medicine) => (
              <button
                key={medicine}
                className="min-h-28 rounded-2xl border-2 border-[#30343B] bg-white px-5 text-3xl font-black lg:min-h-20 lg:text-2xl"
                type="button"
              >
                {medicine}
              </button>
            ))}
          </div>
          <NextAction label="한약 복용 여부 확인" onClick={() => onStepChange("herbal")} />
        </div>
      )}

      {step === "herbal" && (
        <div className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:p-5">
          <StepHeader
            icon={<Leaf className="size-12 text-boyak-green" />}
            title="한약을 함께 드시나요?"
            onSpeak={() => onSpeak("한약을 함께 드시는지 알려주세요. 양약과 함께 먹을 때 주의가 필요할 수 있어요.")}
          />
          <div className="grid gap-4 md:grid-cols-2 lg:gap-3">
            <button
              className={`min-h-32 rounded-2xl border-2 px-6 text-4xl font-black lg:min-h-20 lg:text-3xl ${
                hasHerbalMedicine === true ? "border-boyak-green bg-[#EDF9F1] text-boyak-green" : "border-[#30343B] bg-white"
              }`}
              type="button"
              onClick={() => onHerbalChange(true)}
            >
              예
            </button>
            <button
              className={`min-h-32 rounded-2xl border-2 px-6 text-4xl font-black lg:min-h-20 lg:text-3xl ${
                hasHerbalMedicine === false ? "border-boyak-green bg-[#EDF9F1] text-boyak-green" : "border-[#30343B] bg-white"
              }`}
              type="button"
              onClick={() => onHerbalChange(false)}
            >
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
          onSpeak={() =>
            onSpeak("DUR 분석으로 함께 먹으면 안 되는 약, 나이에 주의가 필요한 약, 같은 성분 중복 여부를 확인합니다.")
          }
        />
      )}

      {step === "result" && (
        <div className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:p-5">
          <StepHeader
            icon={<AlertTriangle className="size-12 text-boyak-red" />}
            title="결과를 확인해주세요"
            onSpeak={() =>
              onSpeak("주의가 필요합니다. 감기약과 타이레놀은 같은 해열진통 성분이 겹칠 수 있어요. 약사나 의사에게 확인하세요.")
            }
          />
          <div className="grid gap-5 lg:grid-cols-2 lg:gap-3">
            <div className="rounded-2xl border-2 border-[#FFC5C5] bg-[#FFF0F0] p-6 lg:p-5">
              <p className="mb-3 text-xl font-black text-boyak-red lg:mb-2 lg:text-lg">주의</p>
              <h2 className="mb-3 text-3xl font-black lg:mb-2 lg:text-2xl">중복 성분 가능성</h2>
              <p className="text-xl font-bold leading-relaxed text-boyak-muted lg:text-lg">
                감기약과 타이레놀은 해열진통 성분이 겹칠 수 있어요.
              </p>
            </div>
            <div className="rounded-2xl border-2 border-[#BFE5CB] bg-[#EDF9F1] p-6 lg:p-5">
              <p className="mb-3 text-xl font-black text-boyak-green lg:mb-2 lg:text-lg">안내</p>
              <h2 className="mb-3 text-3xl font-black lg:mb-2 lg:text-2xl">복약 전 상담 권장</h2>
              <p className="text-xl font-bold leading-relaxed text-boyak-muted lg:text-lg">
                위험 조합이 의심되면 가까운 병원이나 약국에 확인하세요.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:mt-4 lg:gap-3">
            <button
              className="inline-flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-boyak-red px-6 text-2xl font-black text-white lg:min-h-14 lg:text-lg"
              type="button"
            >
              <Hospital className="size-8 lg:size-6" aria-hidden="true" />
              의사 상담 권장
            </button>
            <button
              className="inline-flex min-h-20 items-center justify-center gap-3 rounded-2xl border-2 border-boyak-line bg-white px-6 text-2xl font-black lg:min-h-14 lg:text-lg"
              type="button"
              onClick={() =>
                onSpeak("주의가 필요합니다. 감기약과 타이레놀은 같은 해열진통 성분이 겹칠 수 있어요.")
              }
            >
              <Volume2 className="size-8 text-boyak-blue lg:size-6" aria-hidden="true" />
              결과 음성 안내
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function CaptureStep({ previewUrl, cameraInputRef, galleryInputRef, onImageChange, onStepChange, onSpeak }) {
  return (
    <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <input ref={cameraInputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={onImageChange} />
      <input ref={galleryInputRef} className="hidden" type="file" accept="image/*" onChange={onImageChange} />
      <button
        className="mb-8 flex min-h-[360px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[#D6DFEE] bg-[#FBFCFE] p-7 text-center shadow-soft sm:p-10 lg:mb-3 lg:min-h-0 lg:flex-1 lg:p-6"
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        aria-label="약 봉투나 처방전 사진 촬영하기"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="선택한 약 사진 미리보기" className="max-h-[290px] max-w-full rounded-lg object-contain lg:max-h-full" />
        ) : (
          <>
            <p className="mb-12 max-w-[520px] text-3xl font-black leading-relaxed text-boyak-ink lg:mb-5 lg:text-2xl">
              약 봉투 또는 처방전을 촬영해주세요
            </p>
            <span className="relative grid h-44 w-full max-w-[520px] place-items-center rounded-[26px] bg-white lg:h-40 lg:max-w-[520px]">
              <span className="absolute left-5 top-5 size-10 rounded-tl-md border-l-[7px] border-t-[7px] border-[#444B56]" />
              <span className="absolute right-5 top-5 size-10 rounded-tr-md border-r-[7px] border-t-[7px] border-[#444B56]" />
              <span className="absolute bottom-5 left-5 size-10 rounded-bl-md border-b-[7px] border-l-[7px] border-[#444B56]" />
              <span className="absolute bottom-5 right-5 size-10 rounded-br-md border-b-[7px] border-r-[7px] border-[#444B56]" />
              <span className="grid size-24 place-items-center rounded-2xl bg-[#DADDE2] text-[#454B54] shadow-inner lg:size-20">
                <Camera className="size-16 lg:size-12" strokeWidth={2.7} aria-hidden="true" />
              </span>
            </span>
          </>
        )}
      </button>

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-3">
        <button
          className="inline-flex min-h-[88px] items-center justify-center gap-3 rounded-lg bg-boyak-blue px-8 text-xl font-black text-white lg:min-h-16 lg:text-xl"
          type="button"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="size-7" aria-hidden="true" />
          사진 촬영
        </button>
        <button
          className="inline-flex min-h-[88px] items-center justify-center gap-3 rounded-lg border border-boyak-line bg-boyak-field px-8 text-xl font-black lg:min-h-16 lg:text-xl"
          type="button"
          onClick={() => galleryInputRef.current?.click()}
        >
          <ImagePlus className="size-7" aria-hidden="true" />
          갤러리에서 선택
        </button>
        <button
          className="inline-flex min-h-[88px] items-center justify-center gap-3 rounded-lg border border-boyak-line bg-boyak-field px-8 text-xl font-black lg:min-h-16 lg:text-xl"
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
  );
}

export default memo(MedicineFlowScreen);
