import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ImagePlus,
  RefreshCw,
  Upload,
  X
} from "lucide-react";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function getImage(product) {
  return product?.imageUrl || product?.image_url || "";
}

function formatPrice(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " FCFA";
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Impossible de lire cette image."));
    reader.readAsDataURL(file);
  });
}

export default function MereFondeMediaManager({ onBack, onNotify }) {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState("");
  const [imageData, setImageData] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const configuredCount = useMemo(
    () => products.filter(product => Boolean(getImage(product))).length,
    [products]
  );

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/products");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Catalogue indisponible.");
      }

      setProducts(payload.data || []);
    } catch (cause) {
      setError(cause.message || "Impossible de charger les produits.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openEditor(product) {
    const currentImage = getImage(product);

    setSelected(product);
    setPreview(currentImage);
    setImageData("");
    setFileName("");
    setConfirming(false);
    setError("");
  }

  function closeEditor() {
    if (saving) return;

    setSelected(null);
    setPreview("");
    setImageData("");
    setFileName("");
    setConfirming(false);
    setError("");
  }

  async function chooseFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Choisissez une photo ou une image.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Cette image dépasse 5 Mo. Choisissez une image plus légère.");
      return;
    }

    try {
      const data = await readImage(file);
      setImageData(data);
      setFileName(file.name);
      setPreview(data);
      setError("");
      setConfirming(false);
    } catch (cause) {
      setError(cause.message);
    }
  }

  function requestSave() {
    if (!selected || !imageData || saving) return;
    setConfirming(true);
  }

  async function save() {
    if (!selected || !imageData || saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          imageData
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Impossible d'enregistrer la photo.");
      }

      setProducts(payload.data || []);
      closeEditor();
      onNotify?.(`La photo de ${selected.name} a été mise à jour.`);
    } catch (cause) {
      setError(cause.message || "Impossible d'enregistrer la photo.");
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mf-screen mf-media-screen">
      <div className="mf-screen-header">
        <div className="mf-screen-header-main">
          {onBack && (
            <button className="mf-back" onClick={onBack} aria-label="Retour">
              <X size={18} />
            </button>
          )}
          <div>
            <span className="mf-eyebrow">Catalogue</span>
            <h1>Photos des produits</h1>
            <p>Changez les photos montrées aux clients en quelques secondes.</p>
          </div>
        </div>

        <button
          className="mf-secondary"
          onClick={load}
          disabled={loading}
          aria-label="Actualiser les produits"
        >
          <RefreshCw size={17} className={loading ? "mf-spin" : ""} />
          <span>Actualiser</span>
        </button>
      </div>

      <div className="mf-media-summary" aria-label="État des photos">
        <div className="mf-media-summary-card">
          <span className="mf-media-summary-icon"><ImagePlus size={18} /></span>
          <span><b>{products.length}</b><small>produits</small></span>
        </div>
        <div className="mf-media-summary-card">
          <span className="mf-media-summary-icon success"><CheckCircle2 size={18} /></span>
          <span><b>{configuredCount}</b><small>photos prêtes</small></span>
        </div>
        <div className="mf-media-summary-card">
          <span className="mf-media-summary-icon muted"><Upload size={18} /></span>
          <span><b>{Math.max(products.length - configuredCount, 0)}</b><small>à compléter</small></span>
        </div>
      </div>

      {error && (
        <div className="mf-media-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Fermer le message">
            <X size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="mf-media-state">
          <RefreshCw size={21} className="mf-spin" />
          <div><b>Chargement des produits</b><span>Récupération des photos du catalogue…</span></div>
        </div>
      ) : products.length === 0 ? (
        <div className="mf-media-state">
          <ImagePlus size={24} />
          <div><b>Aucun produit à modifier</b><span>Les produits actifs apparaîtront ici.</span></div>
        </div>
      ) : (
        <div className="mf-media-grid">
          {products.map(product => {
            const image = getImage(product);

            return (
              <article className="mf-media-card" key={product.id}>
                <div className="mf-media-image">
                  {image ? (
                    <img src={image} alt={`Photo de ${product.name}`} />
                  ) : (
                    <div className="mf-media-empty-image">
                      <ImagePlus size={28} />
                      <span>Pas encore de photo</span>
                    </div>
                  )}

                  <span className={image ? "mf-media-status ready" : "mf-media-status"}>
                    {image ? <><Check size={13} /> Photo active</> : "Photo manquante"}
                  </span>
                </div>

                <div className="mf-media-body">
                  <div>
                    <span className="mf-eyebrow">{product.unit || "Produit"}</span>
                    <h2>{product.name}</h2>
                    <p>{formatPrice(product.price)} · visible dans le catalogue</p>
                  </div>
                </div>

                <button className="mf-primary full" onClick={() => openEditor(product)}>
                  <ImagePlus size={17} />
                  {image ? "Changer la photo" : "Ajouter une photo"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="mf-modal-backdrop" onClick={closeEditor}>
          <section
            className="mf-modal mf-media-modal mf-media-editor"
            onClick={event => event.stopPropagation()}
            aria-labelledby="media-editor-title"
          >
            <button className="mf-modal-close" onClick={closeEditor} aria-label="Fermer">
              <X size={18} />
            </button>

            <div className="mf-media-editor-head">
              <span className="mf-eyebrow">Photo produit</span>
              <h2 id="media-editor-title">{selected.name}</h2>
              <p>Choisissez une nouvelle photo. L’ancienne restera affichée tant que vous n’avez pas confirmé.</p>
            </div>

            <div className="mf-media-editor-preview">
              {preview ? (
                <img src={preview} alt={`Aperçu de ${selected.name}`} />
              ) : (
                <div><ImagePlus size={28} /><span>Aucune photo sélectionnée</span></div>
              )}
            </div>

            <input
              ref={fileInputRef}
              className="mf-media-file-input"
              type="file"
              accept="image/*"
              onChange={event => chooseFile(event.target.files?.[0])}
            />

            <button
              className="mf-media-picker"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              <span className="mf-media-picker-icon"><Upload size={19} /></span>
              <span><b>{fileName || "Choisir une photo"}</b><small>{fileName ? "Photo sélectionnée · prête à être enregistrée" : "Depuis le téléphone ou l’ordinateur · 5 Mo maximum"}</small></span>
              <span className="mf-media-picker-arrow">→</span>
            </button>

            {error && (
              <div className="mf-media-editor-error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {confirming ? (
              <div className="mf-media-confirm">
                <div>
                  <CheckCircle2 size={20} />
                  <div><b>Remplacer la photo de {selected.name} ?</b><span>La nouvelle photo sera immédiatement utilisée dans le catalogue client.</span></div>
                </div>
                <div className="mf-media-actions">
                  <button className="mf-secondary" onClick={() => setConfirming(false)} disabled={saving}>Retour</button>
                  <button className="mf-primary" onClick={save} disabled={saving}>
                    {saving ? <RefreshCw size={17} className="mf-spin" /> : <Check size={17} />}
                    {saving ? "Enregistrement…" : "Confirmer"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mf-media-actions">
                <button className="mf-secondary" onClick={closeEditor} disabled={saving}>Annuler</button>
                <button className="mf-primary" onClick={requestSave} disabled={saving || !imageData}>
                  <Check size={17} />
                  Enregistrer la photo
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
