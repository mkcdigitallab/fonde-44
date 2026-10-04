import React, { useEffect, useState } from "react";
import MereFondeDashboard from "../MereFondeDashboard.jsx";
import LivreurDashboard from "../LivreurDashboard.jsx";
import StaffLogin from "../StaffLogin.jsx";
import SuperadminDashboard from "./SuperadminDashboard.jsx";

const THEME_KEY = "fonde44-theme";

function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export default function StaffApp() {
  const [theme, setTheme] = useState(readTheme);
  const [user, setUser] = useState(null);
  const [voiceMessages, setVoiceMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginMessage, setLoginMessage] = useState("");

  useEffect(() => {
    document.title = "Équipe Fondé 44";
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex";
    return () => robots?.parentNode?.removeChild(robots);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("me_failed")))
      .then(body => { if (active) setUser(body.data || null); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function toggleTheme() {
    setTheme(current => {
      const next = current === "dark" ? "light" : "dark";
      try { localStorage.setItem(THEME_KEY, next); } catch {}
      return next;
    });
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {}
    setUser(null);
    setLoginMessage("");
  }

  function sessionExpired() {
    setUser(null);
    setLoginMessage("Votre session a expiré.");
  }

  function authenticated(nextUser) {
    setLoginMessage("");
    setUser(nextUser);
  }

  if (loading) return <div className={"staff-app theme-" + theme}><div className="staff-loading">Chargement…</div></div>;
  if (!user) return <div className={"staff-app theme-" + theme}><StaffLogin onAuthenticated={authenticated} initialMessage={loginMessage} /></div>;

  if (user.role === "livreur") {
    return <div className={"staff-app theme-" + theme}><LivreurDashboard theme={theme} onToggleTheme={toggleTheme} onExit={logout} /></div>;
  }
  if (user.role === "mere-fonde") {
    return <div className={"staff-app theme-" + theme}><MereFondeDashboard theme={theme} onToggleTheme={toggleTheme} onExit={logout} voiceMessages={voiceMessages} setVoiceMessages={setVoiceMessages} /></div>;
  }
  if (user.role === "superadmin") {
    return <div className={"staff-app theme-" + theme}><SuperadminDashboard theme={theme} onToggleTheme={toggleTheme} onLogout={logout} user={user} onSessionExpired={sessionExpired} /></div>;
  }

  return <div className={"staff-app theme-" + theme}><StaffLogin onAuthenticated={authenticated} initialMessage="Rôle non reconnu. Contactez l’administrateur." /></div>;
}
