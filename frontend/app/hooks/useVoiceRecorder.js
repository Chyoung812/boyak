import { useCallback, useEffect, useRef, useState } from "react";

const SPEECH_THRESHOLD = 15;

// 마이크 녹음 + 무음 자동정지 + (옵션) 브라우저 실시간 자막을 한곳에 모은 훅.
// onResult(blob, interimText) 는 녹음이 정상 종료될 때 호출된다.
// stop(true) 로 멈추면 그 회차 결과는 무시한다(타이핑 검색 등으로 취소).
export function useVoiceRecorder({
  onResult,
  onError,
  onStart,
  silenceMs = 1200,
  maxMs = 10000,
  noSpeechMs = null,
  liveTranscript = false,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");

  // 콜백은 ref로 최신값 유지 (start/stop 정체성을 안정적으로 둔다)
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onStartRef = useRef(onStart);
  onResultRef.current = onResult;
  onErrorRef.current = onError;
  onStartRef.current = onStart;

  const interimRef = useRef("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const noSpeechTimerRef = useRef(null);
  const maxTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechDetectedRef = useRef(false);
  const sessionRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (noSpeechTimerRef.current) { clearTimeout(noSpeechTimerRef.current); noSpeechTimerRef.current = null; }
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const stop = useCallback((ignoreResult = false) => {
    if (ignoreResult) sessionRef.current += 1;
    clearTimers();
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();   // 후처리는 onstop에서
      return;
    }
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }, [clearTimers]);

  const start = useCallback(async () => {
    // 녹음 시작 직전: 재생 중인 음성 안내 등을 멈춘다(동시 송출 방지)
    onStartRef.current?.();
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("unsupported");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      audioCtx.createMediaStreamSource(stream).connect(analyser);

      recorderRef.current = recorder;
      audioCtxRef.current = audioCtx;
      chunksRef.current = [];
      speechDetectedRef.current = false;
      setInterimText("");
      interimRef.current = "";
      const sessionId = sessionRef.current + 1;
      sessionRef.current = sessionId;

      // 무음 감지: 말이 끝나면 자동 정지
      const checkSilence = () => {
        if (recorder.state !== "recording") return;
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        if (avg > SPEECH_THRESHOLD) {
          speechDetectedRef.current = true;
          if (noSpeechTimerRef.current) { clearTimeout(noSpeechTimerRef.current); noSpeechTimerRef.current = null; }
          if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        } else if (speechDetectedRef.current && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => stop(), silenceMs);
        }
        rafRef.current = requestAnimationFrame(checkSilence);
      };

      // 옵션: 브라우저 실시간 자막 + 폴백 텍스트
      if (liveTranscript) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.lang = "ko-KR";
          recognition.interimResults = true;
          recognition.continuous = true;
          recognition.onresult = (event) => {
            const text = Array.from(event.results)
              .map((result) => result[0]?.transcript ?? "")
              .join("")
              .trim();
            setInterimText(text);
            interimRef.current = text;
          };
          recognition.onerror = () => {};
          recognitionRef.current = recognition;
          try {
            recognition.start();
          } catch {
            recognitionRef.current = null;
          }
        }
      }

      // 옵션: 일정 시간 발화가 전혀 없으면 자동 종료
      if (noSpeechMs) {
        noSpeechTimerRef.current = setTimeout(() => {
          if (!speechDetectedRef.current && recorder.state === "recording") recorder.stop();
        }, noSpeechMs);
      }
      // 최대 녹음 시간
      maxTimerRef.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, maxMs);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        clearTimers();
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const canceled = sessionId !== sessionRef.current;
        const speechDetected = speechDetectedRef.current;
        recorderRef.current = null;
        if (canceled) return;
        await onResultRef.current?.(blob, interimRef.current, speechDetected);
      };

      recorder.start();
      setIsRecording(true);
      rafRef.current = requestAnimationFrame(checkSilence);
    } catch {
      setIsRecording(false);
      onErrorRef.current?.();
    }
  }, [clearTimers, stop, silenceMs, maxMs, noSpeechMs, liveTranscript]);

  // 언마운트 시 정리 (결과 무시)
  useEffect(() => () => stop(true), [stop]);

  return { isRecording, interimText, start, stop };
}
