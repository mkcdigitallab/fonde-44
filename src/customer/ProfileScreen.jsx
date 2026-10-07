import React, { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, MapPin, RotateCcw } from "lucide-react";
import { customerApi } from "./api.js";

export default function ProfileScreen({
  account,
  accountLoading,
  setAccount,
  address,
  setAddress,
  subscription,
  onBack,
  onSubscription,
  onNotify,
  onOpenAuth,
}) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [draftAddress, setDraftAddress] = useState(address);
  const [displayName, setDisplayName] = useState(account?.name || "");
  const [phone, setPhone] = useState(account?.phone || "");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setDisplayName(account?.name || "");
    setPhone(account?.phone || "");
  }, [account]);

  async function save() {
    const trimmedPhone = phone.trim();

    if (trimmedPhone.length >= 1 && trimmedPhone.length <= 7) {
      onNotify?.("Le téléphone doit contenir au moins 8 caractères ou être vide.");
      return;
    }

    setSaving(true);
    const result = await customerApi("/api/customer/me", {
      method: "PATCH",
      body: {
        displayName: displayName.trim(),
        phone: trimmedPhone,
      },
    });
    setSaving(false);

    if (!result.ok) {
      return onNotify?.("Votre profil n’a pas pu être enregistré.");
    }

    setAccount(
      result.data?.data || {
        ...account,
        name: displayName.trim(),
        phone: trimmedPhone || null,
      },
    );
    onNotify?.("Profil mis à jour.");
  }

  async function logout() {
    await customerApi("/api/customer/logout", { method: "POST" });
    setAccount(null);
    onNotify?.("Vous êtes déconnecté.");
  }

  async function remove() {
    setDeleteError("");

    if (deleteConfirm !== "SUPPRIMER") {
      setDeleteError("Tapez SUPPRIMER pour confirmer.");
      return;
    }

    setSaving(true);
    const result = await customerApi("/api/customer/me", {
      method: "DELETE",
      body: {
        confirm: "SUPPRIMER",
        ...(account.hasPassword ? { password: deletePassword } : {}),
      },
    });
    setSaving(false);

    if (!result.ok) {
      setDeleteError(
        result.error === "invalid_credentials"
          ? "Mot de passe incorrect."
          : "Le compte n’a pas pu être supprimé.",
      );
      return;
    }

    setDeleteOpen(false);
    setDeleteConfirm("");
    setDeletePassword("");
    setAccount(null);
    onNotify?.("Votre compte a été supprimé.");
  }

  if (accountLoading) {
    return (
      <div className="stack">
        <div className="page-head">
          <button className="back" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <h1>Profil</h1>
        </div>
        <div className="empty">
          <h3>Chargement…</h3>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="stack">
        <div className="page-head">
          <button className="back" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="eyebrow">Votre espace</span>
            <h1>Profil</h1>
          </div>
        </div>

        <div className="profile-card">
          <div className="avatar">?</div>
          <div>
            <b>Vous commandez sans compte</b>
            <small>Votre compte est facultatif.</small>
          </div>
        </div>

        <div className="settings-list">
          {editingAddress ? (
            <div className="setting setting-edit">
              <MapPin size={19} />
              <div className="stack compact">
                <b>Adresse principale</b>
                <input
                  value={draftAddress}
                  onChange={(event) => setDraftAddress(event.target.value)}
                />
                <div className="sub-actions">
                  <button className="secondary" onClick={() => setEditingAddress(false)}>
                    Annuler
                  </button>
                  <button
                    className="primary"
                    disabled={!draftAddress.trim()}
                    onClick={() => {
                      setAddress(draftAddress.trim());
                      setEditingAddress(false);
                      onNotify?.("Adresse enregistrée.");
                    }}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="setting">
              <MapPin size={19} />
              <div>
                <b>Adresse principale</b>
                <small>{address || "Aucune adresse enregistrée"}</small>
              </div>
              <button
                onClick={() => {
                  setDraftAddress(address);
                  setEditingAddress(true);
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="customer-auth-actions">
          <button className="primary full" onClick={() => onOpenAuth?.("login")}>
            Se connecter
          </button>
          <button className="secondary full" onClick={() => onOpenAuth?.("register")}>
            Créer un compte
          </button>
        </div>
      </div>
    );
  }

  const phoneInvalid = phone.trim().length >= 1 && phone.trim().length <= 7;

  return (
    <div className="stack">
      <div className="page-head">
        <button className="back" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <h1>Profil</h1>
      </div>

      <div className="profile-card">
        <div className="avatar">{account.name?.slice(0, 1).toUpperCase() || "?"}</div>
        <div>
          <b>{account.name}</b>
          <small>{account.email}</small>
        </div>
      </div>

      <div className="customer-profile-form">
        <label className="field">
          <span>Nom affiché</span>
          <input
            value={displayName}
            minLength="2"
            maxLength="80"
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="name"
          />
        </label>

        <label className="field">
          <span>Téléphone</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
          />
        </label>

        {phoneInvalid && (
          <div className="customer-error" role="alert">
            Le téléphone doit contenir au moins 8 caractères ou être vide.
          </div>
        )}

        <button
          className="primary full"
          disabled={saving || displayName.trim().length < 2 || phoneInvalid}
          onClick={save}
        >
          {saving ? "Enregistrement…" : "Enregistrer les changements"}
        </button>
      </div>

      <div className="settings-list">
        {editingAddress ? (
          <div className="setting setting-edit">
            <MapPin size={19} />
            <div className="stack compact">
              <b>Adresse principale</b>
              <input
                value={draftAddress}
                onChange={(event) => setDraftAddress(event.target.value)}
              />
              <div className="sub-actions">
                <button className="secondary" onClick={() => setEditingAddress(false)}>
                  Annuler
                </button>
                <button
                  className="primary"
                  disabled={!draftAddress.trim()}
                  onClick={() => {
                    setAddress(draftAddress.trim());
                    setEditingAddress(false);
                    onNotify?.("Adresse enregistrée.");
                  }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="setting">
            <MapPin size={19} />
            <div>
              <b>Adresse principale</b>
              <small>{address || "Aucune adresse enregistrée"}</small>
            </div>
            <button
              onClick={() => {
                setDraftAddress(address);
                setEditingAddress(true);
              }}
              aria-label="Modifier l’adresse principale"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        <div className="setting">
          <RotateCcw size={19} />
          <div>
            <b>Mon abonnement</b>
            <small>{subscription ? "Matin + soir · actif" : "Aucun abonnement actif"}</small>
          </div>
          <button onClick={onSubscription}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <button className="secondary full" onClick={logout}>
        Se déconnecter
      </button>
      <button className="danger-button full" onClick={() => setDeleteOpen(true)}>
        Supprimer mon compte
      </button>

      {deleteOpen && (
        <div className="customer-modal-backdrop">
          <section className="customer-modal" role="dialog" aria-modal="true">
            <h2>Supprimer mon compte ?</h2>
            <p>
              Votre compte sera supprimé. L’historique des commandes déjà passées reste
              conservé sans lien avec le compte.
            </p>

            <label className="field">
              <span>Tapez SUPPRIMER</span>
              <input
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
              />
            </label>

            {account.hasPassword && (
              <label className="field">
                <span>Mot de passe</span>
                <input
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  type="password"
                  autoComplete="current-password"
                />
              </label>
            )}

            {deleteError && (
              <div className="customer-error" role="alert">
                {deleteError}
              </div>
            )}

            <div className="sub-actions">
              <button className="secondary" disabled={saving} onClick={() => setDeleteOpen(false)}>
                Annuler
              </button>
              <button
                className="danger-button"
                disabled={
                  saving ||
                  deleteConfirm !== "SUPPRIMER" ||
                  (account.hasPassword && !deletePassword)
                }
                onClick={remove}
              >
                {saving ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
