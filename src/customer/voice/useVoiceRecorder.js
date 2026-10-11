import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SECONDS = 180;
const EMPTY_LEVELS = Array.from({ length: 32 }, () => 0.08);
function mimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const types = ios ? ["audio/mp4", "audio/webm", "audio/ogg"] : ["audio/webm", "audio/mp4", "audio/ogg"];
  return types.find(type => MediaRecorder.isTypeSupported?.(type)) || "";
}
export function formatVoiceDuration(seconds) {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export default function useVoiceRecorder() {
  const [status, setStatus] = useState("idle");
  const [duration, setDuration] = useState(0);
  const [levels, setLevels] = useState(EMPTY_LEVELS);
  const [blob, setBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const recorderRef = useRef(null), streamRef = useRef(null), chunksRef = useRef([]);
  const contextRef = useRef(null), animationRef = useRef(0), timerRef = useRef(0);
  const startedAtRef = useRef(0), elapsedRef = useRef(0), urlRef = useRef("");

  const stopTimer = useCallback(() => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = 0; }, []);
  const stopMeter = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = 0;
    if (contextRef.current) { void contextRef.current.close().catch(() => {}); contextRef.current = null; }
    setLevels(EMPTY_LEVELS);
  }, []);
  const releaseMic = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    stopMeter();
  }, [stopMeter]);
  const clearAudio = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = "";
    setAudioUrl("");
    setBlob(null);
  }, []);
  const vibrate = useCallback(() => {
    try { if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) navigator.vibrate?.(18); } catch {}
  }, []);

  const startMeter = useCallback(async stream => {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      const context = new Context(), source = context.createMediaStreamSource(stream), analyser = context.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      contextRef.current = context;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        setLevels(Array.from({ length: 32 }, (_, i) => Math.max(0.08, Math.min(1, Math.abs((data[Math.min(data.length - 1, i * 2)] || 128) - 128) / 42))));
        animationRef.current = requestAnimationFrame(tick);
      };
      if (context.state === "suspended") await context.resume();
      tick();
    } catch { setLevels(EMPTY_LEVELS); }
  }, []);

  const startRecording = useCallback(async () => {
    setError("");
    setPermissionDenied(false);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Votre téléphone ne permet pas l'enregistrement ici.");
      setStatus("error");
      return;
    }
    setStatus("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      elapsedRef.current = 0;
      setDuration(0);
      clearAudio();
      const type = mimeType();
      const recorder = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { setError("L'enregistrement s'est interrompu. Réessayez."); setStatus("error"); };
      recorder.onstop = () => {
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || type || chunksRef.current[0]?.type || "audio/webm" });
        releaseMic();
        stopTimer();
        if (!audio.size) { setError("Nous n'avons pas reçu de son. Réessayez près du téléphone."); setStatus("error"); return; }
        urlRef.current = URL.createObjectURL(audio);
        setBlob(audio);
        setAudioUrl(urlRef.current);
        setStatus("review");
      };
      recorder.start(250);
      startedAtRef.current = Date.now();
      setStatus("recording");
      vibrate();
      await startMeter(stream);
      stopTimer();
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.min(MAX_SECONDS, elapsedRef.current + (Date.now() - startedAtRef.current) / 1000);
        setDuration(Math.floor(elapsed));
        if (elapsed >= MAX_SECONDS && recorder.state !== "inactive") recorder.stop();
      }, 200);
    } catch (caught) {
      releaseMic();
      const denied = ["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(caught?.name);
      setPermissionDenied(denied);
      setError(denied ? "L'accès au micro a été refusé. Autorisez le micro dans les réglages du navigateur." : "Impossible d'utiliser le micro. Vérifiez l'autorisation et réessayez.");
      setStatus("error");
    }
  }, [clearAudio, releaseMic, startMeter, stopTimer, vibrate]);

  const stopRecording = useCallback(() => {
    stopTimer();
    vibrate();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else { releaseMic(); setStatus(blob ? "review" : "idle"); }
  }, [blob, releaseMic, stopTimer, vibrate]);

  const pauseRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    elapsedRef.current += (Date.now() - startedAtRef.current) / 1000;
    recorder.pause();
    stopTimer();
    stopMeter();
    setStatus("paused");
  }, [stopMeter, stopTimer]);

  const resumeRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    try {
      recorder.resume();
      startedAtRef.current = Date.now();
      setStatus("recording");
      await startMeter(streamRef.current);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.min(MAX_SECONDS, elapsedRef.current + (Date.now() - startedAtRef.current) / 1000);
        setDuration(Math.floor(elapsed));
        if (elapsed >= MAX_SECONDS && recorder.state !== "inactive") recorder.stop();
      }, 200);
    } catch { setError("La reprise n'a pas fonctionné. Terminez le vocal puis écoutez-le."); }
  }, [startMeter]);

  const discardRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") { recorder.onstop = null; try { recorder.stop(); } catch {} }
    releaseMic(); stopTimer(); clearAudio(); chunksRef.current = [];
    elapsedRef.current = 0; setDuration(0); setError(""); setPermissionDenied(false); setStatus("idle");
  }, [clearAudio, releaseMic, stopTimer]);

  useEffect(() => () => {
    stopTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") { recorder.onstop = null; try { recorder.stop(); } catch {} }
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (contextRef.current) void contextRef.current.close().catch(() => {});
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, [stopTimer]);

  return { status, setStatus, duration, levels, blob, audioUrl, error, setError, permissionDenied, startRecording, stopRecording, pauseRecording, resumeRecording, discardRecording, maxSeconds: MAX_SECONDS };
}
