import React, { useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, LockKeyhole, UserCircle } from "lucide-react";

const CODE_LENGTH = 24;

function normalizeCode(value) {
  return value.toUpperCase().replace(/\s+/g, "").slice(0, CODE_LENGTH);
}

function activationError(code) {
  if (code === "invalid_activation") return "Code invalide, expiré ou déjà utilisé. Vérifiez aussi que votre mot de passe fait au moins 12 caractères.";
  if (code === "role_already_active") return "Un compte existe déjà pour ce rôle. Contactez l’administrateur.";
  if (code === "account_conflict") return "Cet email est déjà utilisé.";
  return "Impossible de terminer l’activation. Réessayez.";
}

export default function StaffLogin({ onAuthenticated, initialMessage = "" }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(initialMessage);

  const activationValid = useMemo(() => (
    code.length === CODE_LENGTH &&
    email.trim().includes("@") &&
    displayName.trim().length >= 2 &&
    displayName.trim().length <= 80 &&
    password.length >= 12 &&
    password === confirmation
  ), [code, email, displayName, password, confirmation]);

  async function submitLogin(event) {
    event.preventDefault();
    setError(""); setInfo(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(response.status === 429 ? "Trop de tentatives. Réessayez dans quelques minutes." : "Email ou mot de passe incorrect.");
        return;
      }
      onAuthenticated(body.data);
    } catch {
      setError("Email ou mot de passe incorrect.");
    } finally { setLoading(false); }
  }

  async function submitActivation(event) {
    event.preventDefault();
    setError(""); setInfo("");
    if (code.length !== CODE_LENGTH) return setError("Le code d’activation doit contenir exactement 24 caractères.");
    if (password.length < 12) return setError("Le mot de passe doit contenir au moins 12 caractères.");
    if (password !== confirmation) return setError("La confirmation du mot de passe doit être identique.");
    if (displayName.trim().length < 2 || displayName.trim().length > 80) return setError("Le nom affiché doit contenir entre 2 et 80 caractères.");

    setLoading(true);
    try {
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email: email.trim(), displayName: displayName.trim(), password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 429) setError("Trop de tentatives. Réessayez dans quelques minutes.");
        else if (response.status === 409 && body.error === "role_already_active") setError(activationError(body.error));
        else if (response.status === 409 && body.error === "account_conflict") setError(activationError(body.error));
        else setError(activationError(body.error));
        return;
      }
      if (response.status === 201) onAuthenticated(body.data);
    } catch {
      setError("Impossible de terminer l’activation. Réessayez.");
    } finally { setLoading(false); }
  }

  return (
    <div className="staff-gate">
      <section className="staff-login-card" aria-labelledby="staff-login-title">
        <div className="staff-login-icon"><UserCircle size={24}/></div>
        <span className="eyebrow">Fondé 44 · équipe</span>
        <h1 id="staff-login-title">{mode === "login" ? "Connexion équipe" : "Première connexion"}</h1>
        <p>{mode === "login" ? "Un accès sécurisé pour chaque membre de l’équipe." : "Utilisez le code remis par l’administrateur pour activer votre compte."}</p>
        {info && <div className="staff-login-info" role="status"><CheckCircle2 size={16}/>{info}</div>}
        {error && <div className="staff-login-error" role="alert"><LockKeyhole size={16}/>{error}</div>}

        {mode === "login" ? (
          <form onSubmit={submitLogin}>
            <label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
            <label>Mot de passe
              <div className="password-field">
                <input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required />
                <button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Masquer" : "Afficher"}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
              </div>
            </label>
            <button className="primary full" disabled={loading}>{loading ? "Connexion…" : "Ouvrir mon espace"}</button>
            <button className="staff-link" type="button" onClick={()=>{setMode("activate");setError("");setInfo("");}}>Première connexion ? J’ai un code d’activation</button>
          </form>
        ) : (
          <form onSubmit={submitActivation}>
            <label>Code d’activation
              <input value={code} onChange={e=>setCode(normalizeCode(e.target.value))} maxLength={CODE_LENGTH} autoComplete="one-time-code" inputMode="text" required />
              <small className="staff-field-hint">{code.length}/24 caractères</small>
            </label>
            <label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
            <label>Nom affiché<input type="text" autoComplete="name" minLength={2} maxLength={80} value={displayName} onChange={e=>setDisplayName(e.target.value)} required /></label>
            <label>Mot de passe
              <div className="password-field">
                <input type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} required />
                <button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Masquer" : "Afficher"}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
              </div>
              <small className={password.length >= 12 ? "staff-field-hint valid" : "staff-field-hint"}>{password.length}/12 caractères minimum</small>
            </label>
            <label>Confirmation
              <input type="password" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} required />
              {confirmation && password !== confirmation && <small className="staff-field-error">Les mots de passe ne correspondent pas.</small>}
            </label>
            <button className="primary full" disabled={loading || !activationValid}>{loading ? "Activation…" : "Activer mon compte"}</button>
            <button className="staff-link" type="button" onClick={()=>{setMode("login");setError("");setInfo("");}}>Retour à la connexion</button>
          </form>
        )}
      </section>
    </div>
  );
}
