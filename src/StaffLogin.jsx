import React, { useState } from "react";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Truck, UserCircle } from "lucide-react";

export default function StaffLogin({ role="mere-fonde", onBack, onAuthenticated }) {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [show,setShow]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const label = role === "livreur" ? "Espace Livreur" : "Espace Mère Fondé";
  const Icon = role === "livreur" ? Truck : UserCircle;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,role})});
      const body=await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(body.error || "authentication_failed");
      onAuthenticated(body.data);
    } catch {
      setError("Email ou mot de passe incorrect.");
    } finally { setLoading(false); }
  }

  return <div className="staff-gate">
    <section className="staff-login-card" aria-labelledby="staff-login-title">
      <button className="back" onClick={onBack} aria-label="Retour"><ArrowLeft size={20}/></button>
      <div className="staff-login-icon"><Icon size={24}/></div>
      <span className="eyebrow">Fondé 44 · accès sécurisé</span>
      <h1 id="staff-login-title">{label}</h1>
      <p>Un accès réservé à l’équipe. Vos données d’activité restent protégées.</p>
      <form onSubmit={submit}>
        <label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        <label>Mot de passe<div className="password-field"><input type={show?"text":"password"} autoComplete="current-password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required /><button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?"Masquer":"Afficher"}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
        {error && <div className="staff-login-error" role="alert"><LockKeyhole size={16}/>{error}</div>}
        <button className="primary full" disabled={loading}>{loading ? "Connexion…" : "Ouvrir mon espace"}</button>
      </form>
    </section>
  </div>;
}
