import React, { useEffect, useState } from "react";
import { ImagePlus, Check, RefreshCw, Upload, X, AlertCircle } from "lucide-react";

export default function MereFondeMediaManager({ onBack, onNotify }) {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Catalogue indisponible");
      const data = await response.json();
      setProducts(data.products || []);
    } catch (cause) {
      setError(cause.message || "Impossible de charger le catalogue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function choose(product) {
    setSelected(product);
    setImageUrl(product.imageUrl || product.image_url || "");
    setPreview(product.imageUrl || product.image_url || "");
  }

  function changeUrl(value) {
    setImageUrl(value);
    setPreview(value);
  }

  async function save() {
    if (!selected || !imageUrl.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, imageUrl: imageUrl.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible d'enregistrer l'image.");
      setProducts(data.products || []);
      setSelected(null);
      onNotify?.("Image du produit mise à jour.");
    } catch (cause) {
      setError(cause.message || "Impossible d'enregistrer l'image.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mf-screen">
      <div className="mf-screen-head">
        <div>
          <span className="mf-eyebrow">Catalogue</span>
          <h1>Images des produits</h1>
          <p>Changez facilement les photos affichées aux clients, sans toucher au code.</p>
        </div>
        <button className="mf-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={17}/> Actualiser
        </button>
      </div>

      {error && <div className="mf-media-error"><AlertCircle size={18}/><span>{error}</span></div>}

      {loading ? <div className="mf-media-loading">Chargement du catalogue…</div> : (
        <div className="mf-media-grid">
          {products.map(product => (
            <article className="mf-media-card" key={product.id}>
              <div className="mf-media-image">
                {product.imageUrl || product.image_url ? <img src={product.imageUrl || product.image_url} alt={product.name}/> : <ImagePlus size={28}/>}
              </div>
              <div className="mf-media-body">
                <div><span className="mf-eyebrow">{product.unit}</span><h2>{product.name}</h2></div>
                <span className="mf-media-price">{product.price} FCFA</span>
              </div>
              <button className="mf-primary full" onClick={() => choose(product)}>
                <ImagePlus size={17}/> Changer la photo
              </button>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="mf-modal-backdrop" onClick={() => setSelected(null)}>
          <section className="mf-modal mf-media-modal" onClick={event => event.stopPropagation()}>
            <button className="mf-modal-close" onClick={() => setSelected(null)} aria-label="Fermer"><X size={18}/></button>
            <span className="mf-eyebrow">Modifier</span>
            <h2>{selected.name}</h2>
            <p>Pour commencer simplement, indiquez l'URL de la photo. Le stockage objet pourra être branché ensuite sans changer cet écran.</p>
            <label className="mf-media-field">
              <span>URL de l'image</span>
              <input value={imageUrl} onChange={event => changeUrl(event.target.value)} placeholder="https://…" />
            </label>
            {preview && <img className="mf-media-preview" src={preview} alt={"Aperçu " + selected.name}/>}
            <div className="mf-media-actions">
              <button className="mf-secondary" onClick={() => setSelected(null)}>Annuler</button>
              <button className="mf-primary" onClick={save} disabled={saving || !imageUrl.trim()}>
                {saving ? <RefreshCw size={17} className="mf-spin"/> : <Check size={17}/>} {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
