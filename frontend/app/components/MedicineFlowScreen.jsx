"use client";

import { memo, useState } from "react";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  FileText,
  ImagePlus,
  Leaf,
  Loader2,
  Pill,
  Plus,
  ShieldCheck,
  Volume2,
} from "lucide-react";

import { homeMedicines, medicineSteps, medicineStepKeys } from "../constants";
import BackButton from "./BackButton";
import StepHeader from "./StepHeader";
import FlowPanel from "./FlowPanel";
import NextAction from "./NextAction";

function MedicineFlowScreen({
  step,
  previewUrl,
  photoPreviews,
  ocrResult,
  ocrError,
  normalizeResult,
  normalizeError,
  drugDescriptions = {},
  selectedCandidates,
  safetyResult,
  safetyError,
  isSafetyLoading,
  isOcrLoading,
  hasHerbalMedicine,
  userAge,
  selectedHomeMedicines = [],
  cameraInputRef,
  galleryInputRef,
  onImageChange,
  onAnalyzePhotos,
  onResetPhotos,
  onSelectCandidate,
  onToggleHomeMedicine,
  onRunSafetyCheck,
  onBack,
  onStepChange,
  onHerbalChange,
  onAgeChange,
  onSpeak,
}) {
  const visibleStepMap = { capture: 0, ocr: 0, review: 0, add: 1, herbal: 2, dur: 3, result: 3 };
  const currentIndex = visibleStepMap[step] ?? 0;
  const currentStepLabel = medicineSteps[currentIndex] ?? medicineSteps[0];
  const ocrMedicines = (ocrResult?.medicine_bags || []).flatMap((bag, bagIndex) =>
    (bag.medicine_names || []).map((name, medicineIndex) => ({
      name,
      detail: bag.source_label || `사진 ${bagIndex + 1}`,
      key: `${bag.bag_id || bagIndex}-${medicineIndex}-${name}`,
    })),
  );
  const normalizeItems = normalizeResult?.items || [];

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
        <>
          {ocrError && (
            <div className="mb-4 rounded-2xl border-2 border-[#F5B5B5] bg-[#FFF1F1] px-5 py-4 text-xl font-black text-boyak-red">
              분석 실패: {ocrError}
            </div>
          )}
          <CaptureStep
            previewUrl={previewUrl}
            photoPreviews={photoPreviews}
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            onImageChange={onImageChange}
            onAnalyzePhotos={onAnalyzePhotos}
            onResetPhotos={onResetPhotos}
            onStepChange={onStepChange}
            onSpeak={onSpeak}
          />
        </>
      )}

      {step === "ocr" && (
        <FlowPanel
          icon={<Loader2 className="size-14 animate-spin text-boyak-blue" aria-hidden="true" />}
          title="OCR로 약 정보를 읽는 중이에요"
          body={`${photoPreviews?.length || 1}장 사진을 하나의 복용 묶음으로 보고 약 이름, 성분, 조제일자를 추출하고 있어요. 완료되면 자동으로 확인 화면으로 이동합니다.`}
          primaryLabel={isOcrLoading ? "분석 중" : "추출 내용 확인"}
          onPrimary={() => onStepChange("review")}
          onSpeak={() =>
            onSpeak("약 이름과 조제일자를 읽고 있어요. 다음 화면에서 인식 결과를 확인하고 수정할 수 있어요.")
          }
        />
      )}

      {step === "add" && (
        <div className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:p-5">
          <StepHeader
            icon={<Plus className="size-12 text-boyak-blue" />}
            title="집에 있는 다른 약도 추가할까요?"
            onSpeak={() => onSpeak("감기약, 소화제, 영양제도 함께 확인하면 더 안전해요.")}
          />
          {normalizeItems.length > 0 && (
            <div className="mb-5 rounded-2xl bg-[#EDF4FF] px-5 py-4">
              <p className="text-lg font-black text-boyak-muted lg:text-base mb-3">인식된 약</p>
              <div className="grid gap-3">
                {normalizeItems.map((item, i) => {
                  const alias = item.top_candidate?.alias || item.input || "";
                  const name = alias.replace(/\s*[_(].*$/, "").trim();
                  const isLoading = drugDescriptions === null;
                  const desc = isLoading ? "" : (drugDescriptions?.[alias] || drugDescriptions?.[name] || "");
                  return (
                    <div key={i} className="rounded-xl bg-white px-4 py-3">
                      <p className="text-xl font-black text-boyak-ink lg:text-lg">{name}</p>
                      {isLoading
                        ? <p className="mt-1 text-sm text-boyak-muted">불러오는 중...</p>
                        : desc
                          ? <p className="mt-1 text-base font-bold text-boyak-blue lg:text-sm">{desc}</p>
                          : null
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {selectedHomeMedicines.length > 0 && (
            <p className="mb-4 rounded-xl bg-[#EDF4FF] px-4 py-3 text-lg font-black text-boyak-blue lg:text-base">
              추가됨: {selectedHomeMedicines.join(", ")}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-3 lg:gap-3">
            {homeMedicines.map((medicine) => {
              const isSelected = selectedHomeMedicines.includes(medicine);
              return (
                <button
                  key={medicine}
                  className={`min-h-28 rounded-2xl border-2 px-5 text-3xl font-black transition lg:min-h-20 lg:text-2xl ${
                    isSelected
                      ? "border-boyak-blue bg-[#EDF4FF] text-boyak-blue"
                      : "border-[#30343B] bg-white text-boyak-ink"
                  }`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onToggleHomeMedicine?.(medicine)}
                >
                  {isSelected ? "✓ " : ""}{medicine}
                </button>
              );
            })}
          </div>
          <NextAction
            label={selectedHomeMedicines.length > 0 ? `${selectedHomeMedicines.length}개 추가 후 계속` : "추가 없이 계속"}
            onClick={() => onStepChange("herbal")}
          />
        </div>
      )}

      {step === "herbal" && (
        <div className="rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:p-5">
          <StepHeader
            icon={<Leaf className="size-12 text-boyak-green" />}
            title="나이와 한약 복용 여부를 알려주세요"
            onSpeak={() => onSpeak("나이를 입력하고, 한약을 함께 드시는지 알려주세요. 나이에 따라 주의 약이 달라질 수 있어요.")}
          />
          <label className="mb-5 block rounded-2xl border-2 border-boyak-line bg-boyak-field p-5">
            <span className="text-lg font-black text-boyak-muted lg:text-base">복용하시는 분 나이</span>
            <input
              className="mt-2 min-h-16 w-full rounded-xl border border-boyak-line bg-white px-4 text-3xl font-black lg:min-h-12 lg:text-2xl"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="예: 76"
              type="number"
              min="1"
              max="120"
              value={userAge}
              onChange={(event) => onAgeChange(event.target.value)}
            />
          </label>
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
          <NextAction label={`${photoPreviews?.length || 1}장 묶음으로 DUR 분석 시작`} onClick={onRunSafetyCheck} />
        </div>
      )}

      {step === "dur" && (
        <FlowPanel
          icon={<ShieldCheck className="size-14 text-boyak-blue" aria-hidden="true" />}
          title="DUR 분석으로 위험 조합을 확인해요"
          body={isSafetyLoading ? "선택한 약 후보의 제품코드/성분코드로 DUR 노인주의, 연령금기, 병용금기를 확인하고 있어요." : "분석이 끝나면 결과 화면으로 자동 이동합니다."}
          primaryLabel={isSafetyLoading ? "분석 중" : "결과 확인"}
          onPrimary={() => onStepChange("result")}
          onSpeak={() =>
            onSpeak("DUR 분석으로 함께 먹으면 안 되는 약, 나이에 주의가 필요한 약을 확인합니다.")
          }
        />
      )}

      {step === "result" && (
        <ResultStep
          safetyResult={safetyResult}
          safetyError={safetyError}
          normalizeItems={normalizeItems}
          drugDescriptions={drugDescriptions}
          onSpeak={onSpeak}
          onRestart={() => onStepChange("capture")}
        />
      )}
    </section>
  );
}

function CaptureStep({
  previewUrl,
  photoPreviews = [],
  cameraInputRef,
  galleryInputRef,
  onImageChange,
  onAnalyzePhotos,
  onResetPhotos,
  onSpeak,
}) {
  return (
    <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <input ref={cameraInputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={onImageChange} />
      <input ref={galleryInputRef} className="hidden" type="file" accept="image/*" multiple onChange={onImageChange} />
      <button
        className="mb-8 flex min-h-[360px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[#D6DFEE] bg-[#FBFCFE] p-7 text-center shadow-soft sm:p-10 lg:mb-3 lg:min-h-0 lg:flex-1 lg:p-6"
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        aria-label="약 봉투나 처방전 사진 촬영하기"
      >
        {previewUrl ? (
          <div className="w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="마지막으로 선택한 약 사진 미리보기" className="mx-auto max-h-[230px] max-w-full rounded-lg object-contain lg:max-h-[220px]" />
            <p className="mt-5 text-3xl font-black text-boyak-blue lg:mt-3 lg:text-2xl">
              현재 {photoPreviews.length}장 담았어요
            </p>
            <p className="mt-2 text-xl font-bold text-boyak-muted lg:text-base">
              더 찍을 약봉투가 있으면 아래에서 추가 촬영하세요.
            </p>
          </div>
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
          {photoPreviews.length ? "더 찍기" : "사진 촬영"}
        </button>
        <button
          className="inline-flex min-h-[88px] items-center justify-center gap-3 rounded-lg border border-boyak-line bg-boyak-field px-8 text-xl font-black lg:min-h-16 lg:text-xl"
          type="button"
          onClick={() => galleryInputRef.current?.click()}
        >
          <ImagePlus className="size-7" aria-hidden="true" />
          갤러리 여러 장 선택
        </button>
        <button
          className="inline-flex min-h-[88px] items-center justify-center gap-3 rounded-lg bg-boyak-green px-8 text-xl font-black text-white disabled:bg-boyak-line disabled:text-boyak-muted lg:min-h-16 lg:text-xl"
          type="button"
          disabled={!photoPreviews.length}
          onClick={onAnalyzePhotos}
        >
          <FileText className="size-7" aria-hidden="true" />
          {photoPreviews.length <= 1 ? "바로 분석" : `${photoPreviews.length}장 묶음 분석`}
        </button>
      </div>

      {photoPreviews.length > 0 && (
        <div className="mt-4 rounded-2xl border-2 border-[#C8DAF7] bg-[#EDF4FF] p-4 lg:mt-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xl font-black text-boyak-blue lg:text-lg">촬영한 약봉투 {photoPreviews.length}장</p>
            <button className="rounded-xl border border-boyak-line bg-white px-4 py-2 text-base font-black" type="button" onClick={onResetPhotos}>
              다시 찍기
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {photoPreviews.map((photo, index) => (
              <div key={photo.id} className="rounded-xl border border-boyak-line bg-white p-2 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={`약봉투 사진 ${index + 1}`} className="h-20 w-full rounded-lg object-cover" />
                <p className="mt-1 text-sm font-black text-boyak-muted">사진 {index + 1}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-base font-bold text-boyak-muted">
            한 장만 있으면 바로 분석하고, 여러 장이면 모두 한 묶음으로 보내요.
          </p>
        </div>
      )}
    </div>
  );
}

function ResultStep({ safetyResult, safetyError, normalizeItems, drugDescriptions = {}, onSpeak, onRestart }) {
  const [showDetails, setShowDetails] = useState(false);

  // 백엔드 응답: { ok, alert_count, alerts: [{category, level, title, reason}], notes }
  const alerts = safetyResult?.alerts || [];
  const notes = safetyResult?.notes || [];
  const hasDanger = alerts.some((a) => a.level === "danger");
  const hasWarning = alerts.some((a) => a.level === "warning");

  const level = hasDanger ? "위험" : hasWarning ? "주의" : safetyResult ? "안전" : "확인필요";
  const levelConfig = {
    "안전":    { bg: "bg-[#EDF9F1]", border: "border-[#BFE5CB]", textColor: "text-boyak-green", icon: "✅", label: "괜찮아요", message: "이 약들은 함께 드셔도 안전해요." },
    "주의":    { bg: "bg-[#FFF8E8]", border: "border-[#F5D08A]", textColor: "text-[#8A5A00]",   icon: "⚠️", label: "주의가 필요해요", message: "주의가 필요한 항목이 있어요. 약사나 의사에게 확인하세요." },
    "위험":    { bg: "bg-[#FFF0F0]", border: "border-[#FFC5C5]", textColor: "text-boyak-red",   icon: "❌", label: "위험해요", message: "함께 먹으면 안 되는 약이 있어요. 꼭 의사에게 확인하세요." },
    "확인필요": { bg: "bg-[#EDF4FF]", border: "border-[#C8DAF7]", textColor: "text-boyak-blue", icon: "❓", label: "확인이 필요해요", message: "약 정보를 확인하지 못했어요. 다시 시도해주세요." },
  };
  const cfg = levelConfig[level];

  const cleanName = (alias) => (alias || "").replace(/\s*[_(].*$/, "").trim();
  const recognizedDrugs = (normalizeItems || [])
    .map((item) => cleanName(item.top_candidate?.alias || item.input))
    .filter(Boolean);

  const ttsText = cfg.message + (recognizedDrugs.length ? ` 확인한 약은 ${recognizedDrugs.join(", ")} 입니다.` : "");

  return (
    <div className="flex flex-col gap-4">
      {safetyError && (
        <div className="rounded-2xl border-2 border-[#F5B5B5] bg-[#FFF1F1] p-5 text-xl font-black text-boyak-red">
          분석 실패: {safetyError}
        </div>
      )}

      {/* 메인 결과 카드 */}
      <div className={`rounded-[28px] border-2 ${cfg.border} ${cfg.bg} p-8 text-center`}>
        <div className="mb-3 text-6xl">{cfg.icon}</div>
        <p className={`text-4xl font-black ${cfg.textColor} mb-3 lg:text-3xl`}>{cfg.label}</p>
        <p className="text-2xl font-black leading-snug lg:text-xl">{cfg.message}</p>
      </div>

      {/* 확인한 약 목록 + 설명 */}
      {(normalizeItems || []).length > 0 && (
        <div className="rounded-2xl border-2 border-boyak-line bg-boyak-field px-5 py-4">
          <p className="text-lg font-black text-boyak-muted mb-3 lg:text-base">확인한 약</p>
          <div className="grid gap-2">
            {(normalizeItems || []).map((item, i) => {
              const alias = item.top_candidate?.alias || item.input || "";
              const name = cleanName(alias);
              const desc = drugDescriptions?.[alias] || drugDescriptions?.[name] || "";
              return (
                <div key={i} className="rounded-xl bg-white px-4 py-3">
                  <p className="text-xl font-black text-boyak-ink lg:text-lg">{name}</p>
                  {desc && <p className="mt-1 text-base font-bold text-boyak-blue lg:text-sm">{desc}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 자세히 보기 토글 (항상 표시) */}
      <button
        className="flex w-full items-center justify-between rounded-2xl border-2 border-boyak-line bg-white px-6 py-4 text-xl font-black lg:text-lg"
        type="button"
        onClick={() => setShowDetails((v) => !v)}
      >
        <span>자세히 보기{alerts.length > 0 ? ` (주의 ${alerts.length}건)` : ""}</span>
        {showDetails ? <ChevronUp className="size-6" /> : <ChevronDown className="size-6" />}
      </button>
      {showDetails && (
        <div className="rounded-2xl border-2 border-boyak-line bg-white p-5">
          <div className="grid gap-3">
            {/* OCR 인식 결과 확인 */}
            <div className="rounded-xl bg-[#EDF4FF] p-4">
              <p className="text-lg font-black text-boyak-blue lg:text-base">인식된 약 목록</p>
              <div className="mt-2 grid gap-1">
                {(normalizeItems || []).map((item, i) => (
                  <p key={i} className="text-base text-boyak-ink">
                    · {cleanName(item.top_candidate?.alias || item.input)}
                    {!item.top_candidate && <span className="ml-2 text-[#8A5A00]">(DB 미확인)</span>}
                  </p>
                ))}
              </div>
            </div>
            {/* DUR 주의/위험 항목 */}
            {alerts.slice(0, 5).map((alert, index) => {
              // 영문 성분명 제거, 첫 문장만 표시
              const simpleTitle = (alert.title || "").replace(/:\s*[a-zA-Z\s]+$/, "").trim();
              const simpleReason = (alert.reason || "").split(/[.。]/)[0].trim();
              return (
                <div key={`${alert.category}-${index}`} className={`rounded-xl p-4 ${alert.level === "danger" ? "bg-[#FFF0F0]" : "bg-[#FFF8E8]"}`}>
                  <p className={`text-base font-black lg:text-sm ${alert.level === "danger" ? "text-boyak-red" : "text-[#8A5A00]"}`}>
                    {simpleTitle || alert.category}
                  </p>
                  {simpleReason && <p className="mt-1 text-sm text-boyak-muted">{simpleReason}</p>}
                </div>
              );
            })}
            {notes.map((note, index) => (
              <div key={`note-${index}`} className="rounded-xl bg-boyak-field p-3">
                <p className="text-sm text-boyak-muted">{note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="grid gap-4 md:grid-cols-2">
        <button
          className="inline-flex min-h-20 items-center justify-center gap-3 rounded-2xl border-2 border-boyak-line bg-white px-6 text-2xl font-black lg:min-h-14 lg:text-lg"
          type="button"
          onClick={() => onSpeak(ttsText)}
        >
          <Volume2 className="size-8 text-boyak-blue lg:size-6" aria-hidden="true" />
          결과 음성 안내
        </button>
        <button
          className="inline-flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-boyak-blue px-6 text-2xl font-black text-white lg:min-h-14 lg:text-lg"
          type="button"
          onClick={onRestart}
        >
          처음으로
        </button>
      </div>
    </div>
  );
}

export default memo(MedicineFlowScreen);
