"use client";

import { memo, useState } from "react";
import {
  Bone,
  Camera,
  Droplets,
  FileText,
  Heart,
  ImagePlus,
  Leaf,
  Loader2,
  Pill,
  Plus,
  ShieldCheck,
  Sparkles,
  Thermometer,
} from "lucide-react";

const MEDICINE_ICON_MAP = { Thermometer, Leaf, Bone, Heart, Droplets, Sparkles };

import { homeMedicines, medicineSteps } from "../constants";
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
  const normalizeItems = (normalizeResult?.items || []).filter((item) => item.top_candidate);

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
      </div>

      {/* Mobile step indicator */}
      <div className="mb-6 rounded-2xl border border-[#C8DAF7] bg-[#EDF4FF] p-4 md:hidden" aria-label="현재 약 복용 안전 확인 단계">
        <p className="text-base font-black text-boyak-muted">현재 진행 단계</p>
        <p className="mt-1 text-2xl font-black text-boyak-blue">
          {currentIndex + 1} / {medicineSteps.length} {currentStepLabel}
        </p>
      </div>

      {/* Desktop step bar */}
      <div className="mb-8 hidden w-full gap-3 md:grid md:grid-cols-4 lg:mb-4 lg:gap-3" aria-label="약 복용 안전 확인 단계">
        {medicineSteps.map((label, index) => (
          <div
            key={label}
            className={`flex min-h-16 w-full items-center justify-center rounded-2xl border px-4 text-center text-base font-black leading-tight lg:min-h-14 lg:px-4 lg:text-lg xl:min-h-16 xl:text-xl ${
              index <= currentIndex
                ? "border-boyak-blue bg-[#EDF4FF] text-boyak-blue"
                : "border-boyak-line bg-white text-boyak-muted"
            }`}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            <span className="mr-2 inline-grid size-7 shrink-0 place-items-center rounded-full bg-boyak-blue text-sm text-white lg:size-8 lg:text-base">
              {index + 1}
            </span>
            {label}
          </div>
        ))}
      </div>

      {step === "capture" && (
        <CaptureStep
          previewUrl={previewUrl}
          photoPreviews={photoPreviews}
          cameraInputRef={cameraInputRef}
          galleryInputRef={galleryInputRef}
          onImageChange={onImageChange}
          onAnalyzePhotos={onAnalyzePhotos}
          onResetPhotos={onResetPhotos}
        />
      )}

      {step === "ocr" && (
        <FlowPanel
          icon={<Loader2 className="size-14 animate-spin text-boyak-blue" aria-hidden="true" />}
          title="OCR로 약 정보를 읽는 중이에요"
          body={`${photoPreviews?.length || 1}장 사진을 하나의 복용 묶음으로 보고 약 이름, 성분, 조제일자를 추출하고 있어요. 완료되면 자동으로 확인 화면으로 이동합니다.`}
          primaryLabel={isOcrLoading ? "분석 중" : "추출 내용 확인"}
          onPrimary={() => onStepChange("review")}
        />
      )}

      {step === "review" && (
        <div className="mx-auto flex w-full flex-col gap-4 lg:pt-2">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <p className="text-xl font-black text-boyak-ink">확인된 약 {normalizeItems.length}개</p>
            <button
              className="rounded-xl border border-boyak-line bg-white px-4 py-2 text-base font-black"
              type="button"
              onClick={() => onStepChange("capture")}
            >
              다시 촬영하기
            </button>
          </div>
          {/* 에러 */}
          {(ocrError || normalizeError) && (
            <div className="rounded-2xl border-2 border-[#F5B5B5] bg-[#FFF1F1] p-4 text-base font-black text-boyak-red">
              {ocrError || normalizeError}
            </div>
          )}
          {!ocrError && !normalizeItems.length && (
            <div className="rounded-2xl border-2 border-[#F5D08A] bg-[#FFF8E8] p-4 text-base font-black text-[#8A5A00]">
              약 이름을 찾지 못했어요. 약봉투가 잘 보이게 다시 찍어주세요.
            </div>
          )}
          {/* 약 카드 */}
          <div className="grid gap-3">
            {normalizeItems.map((item, i) => {
              const alias = item.top_candidate?.alias || "";
              const name = alias.replace(/\s*[_(].*$/, "").trim();
              const isLoading = drugDescriptions === null;
              const info = isLoading ? {} : (drugDescriptions?.[alias] || drugDescriptions?.[name] || {});
              return (
                <DrugCard
                  key={i}
                  name={name}
                  desc={isLoading ? "" : (info.desc || "")}
                  dosage={info.dosage || ""}
                />
              );
            })}
          </div>
          {/* 안내 */}
          <p className="rounded-xl bg-boyak-field px-4 py-3 text-sm text-boyak-muted">
            ℹ️ 사진이 흐리면 정확도가 떨어질 수 있어요. 다시 촬영하면 더 정확해져요.
          </p>
          {/* 다음 단계 */}
          <button
            className="inline-flex min-h-16 w-full items-center justify-center rounded-2xl bg-boyak-blue text-xl font-black text-white disabled:bg-boyak-line"
            type="button"
            disabled={!normalizeItems.length}
            onClick={() => onStepChange("add")}
          >
            다음 단계로 →
          </button>
        </div>
      )}

      {step === "add" && (
        <div className="mx-auto w-full rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:p-8">
          <StepHeader
            icon={<Plus className="size-12 text-boyak-blue" />}
            title="집에 있는 다른 약도 추가할까요?"
          />
          {selectedHomeMedicines.length > 0 && (
            <p className="mb-4 rounded-xl bg-[#EDF4FF] px-4 py-3 text-lg font-black text-boyak-blue lg:text-base">
              추가됨: {selectedHomeMedicines.join(", ")}
            </p>
          )}
          <div className="grid grid-cols-3 gap-3 lg:gap-2">
            {homeMedicines.map((medicine) => {
              const isSelected = selectedHomeMedicines.includes(medicine.name);
              const IconComp = MEDICINE_ICON_MAP[medicine.icon] || Pill;
              return (
                <button
                  key={medicine.name}
                  className={`flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 py-5 transition lg:py-4 ${
                    isSelected
                      ? "border-boyak-blue bg-[#EDF4FF]"
                      : "border-boyak-line bg-white hover:border-boyak-blue"
                  }`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onToggleHomeMedicine?.(medicine.name)}
                >
                  <span
                    className="flex size-14 items-center justify-center rounded-2xl lg:size-12"
                    style={{ backgroundColor: medicine.color + "22" }}
                  >
                    <IconComp className="size-8 lg:size-7" style={{ color: medicine.color }} />
                  </span>
                  <span className={`text-base font-black lg:text-sm ${isSelected ? "text-boyak-blue" : "text-boyak-ink"}`}>
                    {isSelected ? "✓ " : ""}{medicine.name}
                  </span>
                </button>
              );
            })}
          </div>
          <NextAction
            label={selectedHomeMedicines.length > 0 ? `${selectedHomeMedicines.length}개 추가 후 계속` : "추가 없이 계속"}
            onClick={() => { onAgeChange?.(""); onHerbalChange?.(null); onStepChange("herbal"); }}
          />
        </div>
      )}

      {step === "herbal" && (
        <div className="mx-auto w-full rounded-[28px] border-2 border-boyak-line bg-white p-6 shadow-sm lg:p-8">
          <StepHeader
            icon={<Leaf className="size-12 text-boyak-green" />}
            title="나이와 한약 복용 여부를 알려주세요"
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
              className={`min-h-32 rounded-2xl border-2 px-6 text-4xl font-black lg:min-h-32 lg:text-4xl ${
                hasHerbalMedicine === true ? "border-boyak-green bg-[#EDF9F1] text-boyak-green" : "border-[#30343B] bg-white"
              }`}
              type="button"
              onClick={() => onHerbalChange(true)}
            >
              예
            </button>
            <button
              className={`min-h-32 rounded-2xl border-2 px-6 text-4xl font-black lg:min-h-32 lg:text-4xl ${
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
        />
      )}

      {step === "result" && (
        <ResultStep
          safetyResult={safetyResult}
          safetyError={safetyError}
          normalizeItems={normalizeItems}
          hasHerbalMedicine={hasHerbalMedicine}
          selectedHomeMedicines={selectedHomeMedicines}
          onRestart={() => onStepChange("capture")}
          onAddMore={() => onStepChange("add")}
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
}) {
  return (
    <div className="mx-auto w-full lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <input ref={cameraInputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={onImageChange} />
      <input ref={galleryInputRef} className="hidden" type="file" accept="image/*" multiple onChange={onImageChange} />
      <button
        className="mb-8 flex min-h-[360px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[#D6DFEE] bg-[#FBFCFE] p-7 text-center shadow-soft sm:p-10 lg:mb-4 lg:min-h-[clamp(300px,calc(100dvh-470px),480px)] lg:p-8 xl:min-h-[clamp(320px,calc(100dvh-470px),520px)]"
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

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        <button
          className="inline-flex min-h-[88px] items-center justify-center gap-3 rounded-lg bg-boyak-blue px-8 text-xl font-black text-white lg:min-h-[clamp(72px,8vh,84px)] lg:text-2xl"
          type="button"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="size-7" aria-hidden="true" />
          {photoPreviews.length ? "더 찍기" : "사진 촬영"}
        </button>
        <button
          className="inline-flex min-h-[88px] items-center justify-center gap-3 rounded-lg border border-boyak-line bg-boyak-field px-8 text-xl font-black lg:min-h-[clamp(72px,8vh,84px)] lg:text-2xl"
          type="button"
          onClick={() => galleryInputRef.current?.click()}
        >
          <ImagePlus className="size-7" aria-hidden="true" />
          갤러리 여러 장 선택
        </button>
        <button
          className="inline-flex min-h-[88px] items-center justify-center gap-3 rounded-lg bg-boyak-green px-8 text-xl font-black text-white disabled:bg-boyak-line disabled:text-boyak-muted lg:min-h-[clamp(72px,8vh,84px)] lg:text-2xl"
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

function parseDosageParts(dosage = "") {
  const parts = [];
  if (dosage.includes("아침")) parts.push({ icon: "🌅", text: "아침" });
  else if (dosage.includes("저녁")) parts.push({ icon: "🌙", text: "저녁" });
  if (dosage.includes("식후")) parts.push({ icon: "🍴", text: "식후" });
  else if (dosage.includes("식전")) parts.push({ icon: "🍴", text: "식전" });
  else if (dosage.includes("취침")) parts.push({ icon: "💤", text: "취침 전" });
  const m = dosage.match(/하루\s*\d+번/);
  if (m) parts.push({ icon: "📅", text: m[0] });
  return parts;
}

function DrugCard({ name, desc, dosage }) {
  const dosingParts = parseDosageParts(dosage);

  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 border-boyak-line bg-white p-4">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#F0F4FF]">
        <Pill className="size-8 text-boyak-blue" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xl font-black text-boyak-ink lg:text-lg">{name}</p>
        </div>
        {desc
          ? <p className="mt-0.5 text-base font-bold text-boyak-blue lg:text-sm">{desc}</p>
          : <p className="mt-0.5 text-sm text-boyak-muted">약사 또는 의사에게 문의하세요</p>
        }
        {dosingParts.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-2">
            {dosingParts.map((p, i) => (
              <span key={i} className="rounded-full bg-[#EDF4FF] px-2.5 py-0.5 text-xs font-black text-boyak-blue">
                {p.icon} {p.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const GUIDANCE = {
  safe:    "지금 드시는 약들은 함께 복용해도 큰 문제가 없어요.\n처방받은 용법대로 드시면 됩니다.",
  warning: "일부 약이 함께 드실 때 주의가 필요해요.\n드시기 전에 약사 또는 의사 선생님께 꼭 한 번 여쭤보세요.",
  danger:  "이 약들은 함께 드시면 위험할 수 있어요.\n지금 바로 약사 또는 의사 선생님께 확인하세요.",
  unknown: "분석 결과를 확인하지 못했어요.\n약사 또는 의사 선생님께 직접 문의해 주세요.",
};

function ResultStep({ safetyResult, safetyError, normalizeItems = [], hasHerbalMedicine, selectedHomeMedicines = [], onRestart, onAddMore }) {
  const notes = safetyResult?.notes || [];
  const alerts = safetyResult?.alerts || [];
  const hasDanger = alerts.some((a) => a.level === "danger");
  const hasWarning = alerts.some((a) => a.level === "warning");
  const level = hasDanger ? "danger" : hasWarning ? "warning" : safetyResult ? "safe" : "unknown";

  const durConfig = {
    safe:    { bg: "bg-[#EDF9F1]", border: "border-[#BFE5CB]", text: "text-boyak-green", emoji: "😊", label: "같이 먹어도 괜찮아요!" },
    warning: { bg: "bg-[#FFF8E8]", border: "border-[#F5D08A]", text: "text-[#8A5A00]",   emoji: "⚠️", label: "주의가 필요해요"     },
    danger:  { bg: "bg-[#FFF0F0]", border: "border-[#FFC5C5]", text: "text-boyak-red",   emoji: "🚫", label: "함께 드시면 안돼요"  },
    unknown: { bg: "bg-[#EDF4FF]", border: "border-[#C8DAF7]", text: "text-boyak-blue",  emoji: "❓", label: "확인이 필요해요"     },
  };
  const dur = durConfig[level];
  const guidance = GUIDANCE[level];

  const drugNames = normalizeItems
    .map((item) => (item.top_candidate?.alias || item.input || "").replace(/\s*[_(].*$/, "").trim())
    .filter(Boolean);
  const allDrugNames = [...drugNames, ...selectedHomeMedicines];
  const hasHerbal = hasHerbalMedicine === true;

  const drugSummary = allDrugNames.join(" · ") + (hasHerbal ? " + 한약" : "");
  return (
    <div className="mx-auto flex w-full flex-col gap-4 lg:pt-2">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-boyak-ink">약 복용 안전 확인 결과</h2>
      </div>

      {/* 분석한 약 요약 */}
      {allDrugNames.length > 0 && (
        <div className="rounded-2xl border-2 border-boyak-line bg-white px-5 py-4">
          <p className="mb-1.5 text-sm font-bold text-boyak-muted">분석한 약</p>
          <p className="text-lg font-black text-boyak-ink leading-snug">{drugSummary}</p>
          <p className="mt-1 text-base text-boyak-muted">를 함께 복용해도 될까요?</p>
        </div>
      )}

      {/* 메인 결과 카드 */}
      <div className={`rounded-2xl border-2 ${dur.border} ${dur.bg} p-6`}>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{dur.emoji}</span>
          <p className={`text-3xl font-black lg:text-2xl ${dur.text}`}>{dur.label}</p>
        </div>
        <div className="border-t border-current border-opacity-20 pt-4">
          {guidance.split("\n").map((line, i) => (
            <p key={i} className={`text-lg font-bold leading-relaxed lg:text-base ${i === 0 ? dur.text : "mt-1.5 text-boyak-muted"}`}>
              {line}
            </p>
          ))}
        </div>
        {safetyError && (
          <p className="mt-3 rounded-xl bg-white/60 px-4 py-2 text-sm font-bold text-boyak-red">{safetyError}</p>
        )}
      </div>

      {/* 한약 + 추가 노트 */}
      {(hasHerbal || notes.length > 0) && (
        <div className="grid gap-2">
          {hasHerbal && (
            <div className="flex items-start gap-3 rounded-2xl bg-[#EDF4FF] px-5 py-4">
              <span className="mt-0.5 text-xl">🌿</span>
              <p className="text-base font-bold text-boyak-blue leading-relaxed">
                한약을 함께 드시는 경우, 한약-양약 상호작용이 있을 수 있어요.<br />
                한의사나 약사 선생님께 꼭 확인하세요.
              </p>
            </div>
          )}
          {notes.map((note, i) => (
            <div key={i} className="flex items-start gap-3 rounded-2xl bg-[#EDF4FF] px-5 py-4">
              <span className="mt-0.5 text-xl">💡</span>
              <p className="text-base font-bold text-boyak-blue">{note}</p>
            </div>
          ))}
        </div>
      )}

      {/* 하단 버튼 */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 border-boyak-line bg-white text-xl font-black lg:min-h-24 lg:text-2xl"
          type="button"
          onClick={onRestart}
        >
          <Camera className="size-6" aria-hidden="true" /> 다시 촬영하기
        </button>
        <button
          className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-boyak-ink px-4 text-xl font-black text-white lg:min-h-24 lg:text-2xl"
          type="button"
          onClick={onAddMore}
        >
          다른 약 추가하기 <Plus className="size-6" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default memo(MedicineFlowScreen);
