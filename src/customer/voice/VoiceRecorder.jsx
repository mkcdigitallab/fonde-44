import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CheckCheck, CircleHelp, LockKeyhole, Mic, Pause, Play, RefreshCw, Send, Settings, Square, Trash2 } from "lucide-react";
import useVoiceRecorder, { formatVoiceDuration } from "./useVoiceRecorder.js";
import VoiceBubble from "./VoiceBubble.jsx";
import VoiceGuide from "./VoiceGuide.jsx";
import "./voice.css";
const TRACKED_KEY = "fonde44-tracked-voices";
function readTracked() { try { const value = JSON.parse(localStorage.getItem(TRACKED_KEY) || "[]"); return Array.isArray(value) ? value.slice(0, 5) : []; } catch { return []; } }
function saveTracked(value) { try { localStorage.setItem(TRACKED_KEY, JSON.stringify(value.slice(0, 5))); } catch {} }
function explainError(status, error) {
  if (status === 429) return "Vous avez envoyé plusieurs vocaux. Attendez quelques minutes puis réessayez.";
  if (status === 503) return "Le service vocal est momentanément indisponible. Choisissez vos produits ou réessayez plus tard.";
  if (status === 422) return "Vérifiez votre numéro de téléphone et réessayez.";
  return error || "Le vocal n'a pas pu être envoyé. Votre enregistrement est conservé : réessayez.";
}
export default function VoiceRecorder({ kind = "order", onBack, onSent, customerName = "", customerPhone = "" }) {
  const recorder = useVoiceRecorder();
  const [name, setName] = useState(() => { try { return customerName || localStorage.getItem("fonde44-customer-name") || ""; } catch { return customerName; } });
  const [phone, setPhone] = useState(() => { try { return customerPhone || localStorage.getItem("fonde44-customer-phone") || ""; } catch { return customerPhone; } });
  const [contactError, setContactError] = useState(""), [sendError, setSendError] = useState(""), [sending, setSending] = useState(false);
  const [sentRecord, setSentRecord] = useState(null), [tracked, setTracked] = useState(readTracked), [polling, setPolling] = useState(false);
  const trackedRef = useRef(tracked);
  useEffect(() => { trackedRef.current = tracked; }, [tracked]);
  const hasSound = useMemo(() => recorder.levels.some(level => level > 0.22), [recorder.levels]);
  useEffect(() => {
    if (customerName) setName(current => current.trim() ? current : customerName);
    if (customerPhone) setPhone(current => current.trim() ? current : customerPhone);
  }, [customerName, customerPhone]);
  useEffect(() => { try { localStorage.setItem("fonde44-voice-opened", "true"); } catch {} }, []);
  useEffect(() => {
    if (recorder.status !== "recording" || recorder.duration < 4 || hasSound) return undefined;
    const timer = setTimeout(() => { if (recorder.status === "recording" && !hasSound) recorder.setError("Nous ne vous entendons pas. Rapprochez-vous du téléphone ou vérifiez le micro."); }, 300);
    return () => clearTimeout(timer);
  }, [hasSound, recorder.duration, recorder.status, recorder.setError]);
  useEffect(() => {
    if (!tracked.length) return undefined;
    let active = true;
    async function refresh() {
      setPolling(true);
      const updated = await Promise.all(trackedRef.current.map(async item => {
        if (item.status === "processed") return item;
        try {
          const params = new URLSearchParams({ id: item.id, token: item.trackingToken });
          const response = await fetch("/api/voice-requests/track?" + params, { cache: "no-store" });
          const body = await response.json().catch(() => ({}));
          if (response.ok && ["sent", "heard", "processed"].includes(body.status)) return { ...item, status: body.status };
        } catch {}
        return item;
      }));
      if (!active) return;
      setTracked(updated); saveTracked(updated);
      if (sentRecord) setSentRecord(updated.find(item => item.id === sentRecord.id) || sentRecord);
      setPolling(false);
    }
    void refresh();
    const timer = setInterval(() => {
      const current = trackedRef.current;
      if (current.length && current.every(item => item.status === "processed")) { clearInterval(timer); return; }
      void refresh();
    }, 20000);
    return () => { active = false; clearInterval(timer); };
  }, [tracked.length, sentRecord?.id]);
  useEffect(() => { if (recorder.error) setSendError(recorder.error); }, [recorder.error]);

  async function sendVoice() {
    if (!recorder.blob || sending) return;
    const normalized = phone.trim().replace(/[\s().-]/g, "").replace(/^00221/, "+221").replace(/^221(?=\d{9}$)/, "+221").replace(/^([37]\d{8})$/, "+221$1");
    if (!/^(?:\+221)?[37]\d{8}$/.test(normalized)) { setContactError("Saisissez un numéro sénégalais valide, par exemple +221 77 123 45 67."); document.getElementById("voice-contact-phone")?.focus(); return; }
    if (name.trim() && name.trim().length < 2) { setContactError("Votre nom doit contenir au moins 2 caractères."); return; }
    setContactError(""); setSendError(""); setPhone(normalized); setSending(true); recorder.setStatus("sending");
    try {
      const audioData = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("read_failed")); reader.readAsDataURL(recorder.blob); });
      const response = await fetch("/api/voice-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audioData, duration: recorder.duration, kind, customer: { ...(name.trim() ? { name: name.trim() } : {}), phone: normalized } }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setSendError(explainError(response.status, body.error)); recorder.setStatus("review"); return; }
      const record = { id: body.id, trackingToken: body.trackingToken, createdAt: body.createdAt, duration: recorder.duration, kind, status: "sent" };
      const next = [record, ...readTracked().filter(item => item.id !== record.id)].slice(0, 5);
      saveTracked(next); setTracked(next); setSentRecord(record); recorder.setStatus("sent");
      try { localStorage.setItem("fonde44-customer-phone", normalized); if (name.trim()) localStorage.setItem("fonde44-customer-name", name.trim()); } catch {}
      onSent?.({ ...record, customerName: name.trim(), customerPhone: normalized });
    } catch {
      setSendError("Connexion interrompue. Votre vocal est conservé : vérifiez le réseau puis réessayez.");
      recorder.setStatus("review");
    } finally { setSending(false); }
  }
  function statusInfo(status) {
    if (status === "heard") return { icon: <CheckCheck size={16}/>, label: "Écouté" };
    if (status === "processed") return { icon: <CheckCheck size={16}/>, label: "Pris en charge" };
    return { icon: <Check size={16}/>, label: "Envoyé" };
  }
  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return <section className="voice-recorder-page"><VoiceGuide kind={kind}/><div className="voice-recorder-panel" role="alert"><Mic size={32}/><h2>Votre téléphone ne permet pas l'enregistrement ici</h2><p>Vous pouvez choisir vos produits ou remplir la demande écrite.</p><button className="voice-action voice-action-primary" onClick={onBack}><ArrowRight size={20}/> Choisir mes produits</button></div></section>;
  return <section className="voice-recorder-page">
    <VoiceGuide kind={kind}/>
    {recorder.permissionDenied ? <div className="voice-recorder-panel" role="alert"><LockKeyhole size={30}/><h2>Autorisez le micro pour parler</h2><ol className="voice-permission-steps"><li><Settings size={19}/> Près de l'adresse du site, ouvrez le cadenas ou les réglages.</li><li><Mic size={19}/> Choisissez « Micro », puis « Autoriser ».</li><li><RefreshCw size={19}/> Rechargez la page, puis réessayez.</li></ol><button className="voice-action voice-action-primary" onClick={recorder.startRecording}><Mic size={20}/> Réessayer</button></div>
    : recorder.status === "sent" && sentRecord ? <div className="voice-recorder-panel voice-sent-panel"><span className="voice-state-pill"><CheckCheck size={17}/> Message envoyé</span><VoiceBubble src={recorder.audioUrl} duration={recorder.duration} status={statusInfo(sentRecord.status).label}/><div className="voice-tracking-steps">{["sent","heard","processed"].map((status,index)=>{const complete=["sent","heard","processed"].indexOf(sentRecord.status)>=index;return <div key={status} className={complete?"complete":""}><span>{complete?statusInfo(sentRecord.status).icon:index+1}</span><b>{status==="sent"?"✓ Envoyé":status==="heard"?"✓✓ Écouté":"✓✓ Pris en charge"}</b></div>;})}</div><p>Mère Fondé va écouter votre message et vous répondre au <strong>{phone}</strong>.</p><small>{polling?"Mise à jour du suivi…":"Le suivi se met à jour automatiquement."}</small><button className="voice-action voice-action-primary" onClick={onBack}><Check size={20}/> Terminer</button></div>
    : <div className="voice-recorder-panel">
      {["idle","error"].includes(recorder.status) && <><p className="voice-microphone-hint">Votre téléphone va demander l'accès au micro : appuyez sur Autoriser.</p><button className="voice-big-mic" onClick={recorder.startRecording}><Mic size={36}/><span>Appuyez pour parler</span></button><p className="voice-recorder-reassure">Parlez naturellement. Vous pourrez écouter votre message avant de l'envoyer.</p></>}
      {recorder.status==="asking" && <div className="voice-asking" role="status"><Mic size={30}/><b>Préparation du micro…</b></div>}
      {["recording","paused"].includes(recorder.status) && <><div className="voice-recording-heading"><span className={recorder.status==="recording"?"voice-record-dot active":"voice-record-dot"}/><b>{recorder.status==="paused"?"Enregistrement en pause":"Enregistrement en cours"}</b></div><strong className="voice-record-timer">{formatVoiceDuration(recorder.duration)}</strong>{recorder.duration>=165 && <p className="voice-countdown" role="status">Arrêt automatique dans {180-recorder.duration} secondes.</p>}<div className="voice-live-bars" aria-label={hasSound?"Le micro entend votre voix":"Niveau sonore du micro"}>{recorder.levels.map((level,i)=><i key={i} style={{height:`${Math.max(5,Math.round(level*38))}px`}}/>)}</div>{recorder.duration>=4&&!hasSound&&<p className="voice-no-sound" role="status">Nous ne vous entendons pas. Rapprochez-vous du téléphone ou vérifiez le micro.</p>}<div className="voice-record-actions">{recorder.status==="recording"?<button className="voice-action" onClick={recorder.pauseRecording}><Pause size={19}/> Pause</button>:<button className="voice-action" onClick={recorder.resumeRecording}><Play size={19}/> Reprendre</button>}<button className="voice-action voice-action-danger" onClick={recorder.discardRecording}><Trash2 size={19}/> Annuler</button><button className="voice-action voice-action-primary voice-action-large" onClick={recorder.stopRecording}><Square size={18}/> Terminer</button></div></>}
      {recorder.status==="review" && <><span className="voice-state-pill">Votre message est prêt</span><VoiceBubble src={recorder.audioUrl} duration={recorder.duration}/><div className="voice-record-actions"><button className="voice-action" onClick={recorder.discardRecording}><RefreshCw size={19}/> Recommencer</button></div><div className="voice-contact-fields"><label><span>Votre numéro (pour que Mère Fondé vous réponde) *</span><input id="voice-contact-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={event=>setPhone(event.target.value)} placeholder="+221 77 123 45 67" required aria-invalid={Boolean(contactError)}/></label><label><span>Votre nom (facultatif)</span><input value={name} onChange={event=>setName(event.target.value)} autoComplete="name" placeholder="Votre prénom"/></label>{contactError&&<p className="voice-error-text" role="alert">{contactError}</p>}<button className="voice-send-round" onClick={sendVoice} disabled={sending}><Send size={23}/><span>{sending ? "Envoi…" : "Envoyer"}</span></button></div></>}
      {recorder.status==="sending"&&<div className="voice-asking" role="status"><RefreshCw size={28}/><b>Envoi en cours… ne fermez pas cette page</b></div>}
      {(sendError || (recorder.error&&!recorder.permissionDenied))&&<div className="voice-error-text" role="alert"><CircleHelp size={18}/><span>{sendError||recorder.error}</span>{recorder.blob&&<button className="voice-action" onClick={sendVoice}><RefreshCw size={18}/> Réessayer</button>}</div>}
    </div>}
    <p className="voice-privacy-note">Votre voix est utilisée seulement pour traiter votre demande.</p>
    {tracked.length>0&&recorder.status!=="sent"&&<><div className="voice-last-tracking"><b>Suivi de votre dernier vocal</b><span>{tracked[0].kind==="event"?"Événement":"Commande"} · {statusInfo(tracked[0].status).label}</span><strong>{tracked[0].status==="processed"?"✓✓ Pris en charge":tracked[0].status==="heard"?"✓✓ Écouté":"✓ Envoyé"}</strong></div><details className="voice-previous-tracking"><summary>Voir les {tracked.length} derniers vocaux</summary>{tracked.map(item=><div key={item.id}><span>{item.kind==="event"?"Événement":"Commande"} · {new Date(item.createdAt).toLocaleDateString("fr-FR")}</span><b>{statusInfo(item.status).label}</b></div>)}</details></>}
    <button className="voice-choose-products" onClick={onBack}>{kind==="event"?"Retour au service événement":"Choisir mes produits"}</button>
  </section>;
}
