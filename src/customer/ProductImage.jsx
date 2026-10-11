import React from "react";

export default function ProductImage({ src, name, alt = "", className = "" }) {
  const initial = String(name || "?").trim().charAt(0).toUpperCase() || "?";
  if (!src) {
    return (
      <div className={"product-image-placeholder " + className} role="img" aria-label={alt || name || "Produit sans photo"}>
        <span aria-hidden="true">{initial}</span>
      </div>
    );
  }
  return <img className={"product-image " + className} src={src} alt={alt || name || "Produit"} loading="lazy" />;
}
