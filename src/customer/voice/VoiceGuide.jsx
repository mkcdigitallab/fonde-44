import React, { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Mic, MapPin, Headphones } from "lucide-react";
import "./voice.css";
const STORAGE_KEY = "fonde44-voice-guide-collapsed";
export default function VoiceGuide({ kind = "order" }) {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; } });
  function toggle() { setCollapsed(value => { try { localStorage.setItem(STORAGE_KEY, String(!value)); } catch {} return !value; }); }
  return <section className="voice-guide" aria-label="Comment faire ?">
    <button type="button" className="voice-guide-toggle" onClick={toggle} aria-expanded={!collapsed}><span><b>Comment faire ?</b><small>Trois étapes, tout simplement</small></span>{collapsed ? <ChevronDown size={22}/> : <ChevronUp size={22}/>}</button>
    {!collapsed && <>
      <ol className="voice-guide-steps"><li><span><Mic size={19}/></span><b>Appuyez sur le micro</b></li><li><span><MapPin size={19}/></span><b>Parlez : ce que vous voulez, quand et où</b></li><li><span><Headphones size={19}/></span><b>Écoutez, puis envoyez</b></li></ol>
      <div className="voice-guide-example"><CheckCircle2 size={20}/><div><b>Vous pouvez dire :</b><p>{kind === "event" ? "Bonjour, c'est pour un baptême samedi. Nous serons environ 80 personnes à Yeumbeul. Je voudrais du fondé et du thiakry." : "Bonjour, je voudrais 6 fondé et 3 thiakry pour demain matin, à Yeumbeul."}</p></div></div>
      <p className="voice-guide-language">Parlez dans la langue qui vous est la plus facile.</p>
    </>}
  </section>;
}
