import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, EyeOff, UserCircle } from "lucide-react";
import { customerApi } from "./api.js";

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";

function loadGoogleIdentityServices() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    let script = document.querySelector('script[src="' + GSI_SCRIPT_URL + '"]');
    if (script) {
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      return;
    }

    script = document.createElement("script");
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const messages = {
  invalid_credentials: "Email ou mot de passe incorrect.",
  email_taken: "Cet email est déjà utilisé. Connectez-vous.",
  email_exists_use_password:
    "Un compte existe déjà avec cet email. Connectez-vous avec votre mot de passe.",
  invalid_google_credential:
    "Connexion Google impossible. Réessayez ou utilisez votre email.",
  rate_limited: "Trop de tentatives. Réessayez dans quelques minutes.",
};

export default function AuthScreen({ initialMode = "login", onAuthenticated, onBack }) {
  const [mode, setMode] = useState(initialMode === "register" ? "register" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState("");
  const [busy, setBusy] = useState(false);
  const googleButtonRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    setMode(initialMode === "register" ? "register" : "login");
  }, [initialMode]);

  useEffect(() => {
    if (!clientId || !googleButtonRef.current) return;

    let active = true;

    loadGoogleIdentityServices()
      .then(() => {
        if (!active || !window.google?.accounts?.id || !googleButtonRef.current) return;

        googleButtonRef.current.innerHTML = "";

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!active || !response?.credential) return;

            setBusy(true);
            customerApi("/api/customer/google", {
              method: "POST",
              body: { credential: response.credential },
            })
              .then((result) => {
                if (result.ok) {
                  onAuthenticated?.(result.data?.data);
                  return;
                }

                setError(
                  messages[result.error] ||
                    (result.status === 429
                      ? messages.rate_limited
                      : messages.invalid_google_credential),
                );
              })
              .finally(() => setBusy(false));
          },
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          locale: "fr",
        });
      })
      .catch(() => {
        if (active) {
          setError("Connexion Google indisponible pour le moment.");
        }
      });

    return () => {
      active = false;
    };
  }, [clientId, onAuthenticated]);

  async function submit(event) {
    event.preventDefault();
    setValidation("");
    setError("");

    if (!email.trim()) {
      setValidation("Saisissez votre email.");
      return;
    }

    if (mode === "register" && (name.trim().length < 2 || name.trim().length > 80)) {
      setValidation("Le nom doit contenir entre 2 et 80 caractères.");
      return;
    }

    if (mode === "register" && password.length < 10) {
      setValidation("Le mot de passe doit contenir au moins 10 caractères.");
      return;
    }

    if (mode === "login" && !password) {
      setValidation("Saisissez votre mot de passe.");
      return;
    }

    setBusy(true);

    const result = await customerApi(
      mode === "register" ? "/api/customer/register" : "/api/customer/login",
      {
        method: "POST",
        body:
          mode === "register"
            ? {
                displayName: name.trim(),
                email: email.trim(),
                password,
                phone: phone.trim() || undefined,
              }
            : {
                email: email.trim(),
                password,
              },
      },
    );

    setBusy(false);

    if (!result.ok) {
      if (result.status === 429) {
        setError(messages.rate_limited);
      } else if (result.error === "validation_error") {
        setError(result.data?.details?.[0]?.message || "Vérifiez les champs indiqués.");
      } else {
        setError(messages[result.error] || "Une erreur est survenue. Réessayez.");
      }
      return;
    }

    onAuthenticated?.(result.data?.data);
  }

  return (
    <div className="stack customer-auth-screen">
      <div className="page-head">
        <button className="back" onClick={onBack} aria-label="Retour">
          <ArrowLeft size={20} />
        </button>
        <div>
          <span className="eyebrow">
            <UserCircle size={14} /> Compte client
          </span>
          <h1>{mode === "login" ? "Bienvenue" : "Créer votre compte"}</h1>
        </div>
      </div>

      <div className="customer-tabs" role="tablist">
        <button
          type="button"
          className={mode === "login" ? "active" : ""}
          onClick={() => {
            setMode("login");
            setError("");
            setValidation("");
          }}
        >
          Se connecter
        </button>
        <button
          type="button"
          className={mode === "register" ? "active" : ""}
          onClick={() => {
            setMode("register");
            setError("");
            setValidation("");
          }}
        >
          Créer un compte
        </button>
      </div>

      <form className="customer-auth-card" onSubmit={submit}>
        {mode === "register" && (
          <label className="field">
            <span>Nom</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength="2"
              maxLength="80"
              autoComplete="name"
              required
            />
          </label>
        )}

        <label className="field">
          <span>Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            required
          />
        </label>

        {mode === "register" && (
          <label className="field">
            <span>
              Téléphone <small>(facultatif)</small>
            </span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              autoComplete="tel"
            />
          </label>
        )}

        <label className="field">
          <span>Mot de passe</span>
          <div className="customer-password">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              minLength={mode === "register" ? 10 : undefined}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
              }
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {mode === "register" && (
            <small className="password-counter">
              {password.length} caractère{password.length > 1 ? "s" : ""}
            </small>
          )}
        </label>

        {(validation || error) && (
          <div className="customer-error" role="alert" aria-live="polite">
            {validation || error}
          </div>
        )}

        <button className="primary full" type="submit" disabled={busy}>
          {busy ? "Traitement…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>

        {clientId && (
          <>
            <div className="customer-divider">
              <span>ou</span>
            </div>
            <div
              ref={googleButtonRef}
              className="google-button"
              aria-label="Continuer avec Google"
            />
          </>
        )}
      </form>

      {mode === "register" && (
        <p className="customer-note">
          Votre compte est facultatif : vous pouvez toujours commander sans compte.
        </p>
      )}
    </div>
  );
}
