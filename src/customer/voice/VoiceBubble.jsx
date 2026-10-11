import React, { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { formatVoiceDuration } from "./useVoiceRecorder.js";
import "./voice.css";
export default function VoiceBubble({ src, duration = 0, label = "Message vocal", onPlaybackStart, status, className = "" }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false), [position, setPosition] = useState(0), [audioDuration, setAudioDuration] = useState(duration || 0);
  const playedRef = useRef(false);
  useEffect(() => { setPlaying(false); setPosition(0); playedRef.current = false; }, [src]);
  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (audio.paused) { const result = audio.play(); result?.catch?.(() => setPlaying(false)); } else audio.pause();
  }
  return <div className={`voice-bubble ${className}`} aria-label={label}>
    <button type="button" className="voice-bubble-play" onClick={togglePlayback} disabled={!src} aria-label={playing ? "Mettre le message en pause" : "Écouter le message vocal"}>{playing ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}<span>{playing ? "Pause" : "Écouter"}</span></button>
    <div className="voice-bubble-body"><div className="voice-bubble-bars" aria-hidden="true">{Array.from({ length: 30 }, (_, i) => <i key={i} className={position / Math.max(1, audioDuration) >= i / 30 ? "played" : ""} style={{ height: `${8 + ((i * 17 + 11) % 21)}px` }}/>)}</div><div className="voice-bubble-meta"><span>{formatVoiceDuration(playing ? position : audioDuration)}</span>{status && <span className="voice-bubble-status">{status}</span>}</div></div>
    <audio ref={audioRef} src={src || undefined} preload="metadata" onLoadedMetadata={event => setAudioDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : duration)} onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} onPlay={() => { setPlaying(true); if (!playedRef.current) { playedRef.current = true; onPlaybackStart?.(); } }} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPosition(0); }} aria-label={label}/>
  </div>;
}
