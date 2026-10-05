import React, { useEffect, useState } from "react";
import { ArrowLeft, CircleHelp, Package, RotateCcw } from "lucide-react";
import { customerApi } from "./api.js";
import { money } from "../format.js";

export default function OrdersScreen({ account, order, onBack, onReorder }) {
  const guestItems = order?.["items"] || [];
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!account) return;
    let active = true;
    setLoading(true);

    customerApi("/api/customer/orders")
      .then((result) => {
        if (!active) return;
        if (result.status === 401) {
          setError("Votre session a expiré. Connectez-vous à nouveau.");
          return;
        }
        if (!result.ok) {
          setError("Impossible de charger vos commandes.");
          return;
        }
        setOrders(Array.isArray(result.data?.data) ? result.data.data : []);
      })
      .catch(() => {
        if (active) setError("Impossible de charger vos commandes.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [account]);

  const labels = {
    received: "Nouvelle",
    confirmed: "Confirmée",
    preparing: "En préparation",
    ready: "Prête",
    assigned: "À récupérer",
    out_for_delivery: "En livraison",
    delivered: "Livrée",
    cancelled: "Annulée",
  };

  if (!account) {
    return (
      <div className="stack">
        <div className="page-head">
          <button className="back" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <h1>Commandes</h1>
        </div>
        {!order ? (
          <div className="empty">
            <Package size={28} />
            <h3>Aucune commande ici pour le moment</h3>
            <p>Vos commandes apparaîtront ici.</p>
          </div>
        ) : (
          <article className="order-card">
            <div className="order-top">
              <b>{order.id}</b>
              <span className="status green">En préparation</span>
            </div>
            <p>
              {guestItems.map((item) => item.qty + " " + item.name).join(" · ")}
            </p>
            <div className="order-bottom">
              <strong>{money(order.total)}</strong>
            </div>
            <button className="secondary full" onClick={() => onReorder(order)}>
              <RotateCcw size={16} />
              Commander à nouveau
            </button>
          </article>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="stack">
        <div className="page-head">
          <button className="back" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <h1>Commandes</h1>
        </div>
        <div className="empty">
          <h3>Chargement…</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stack">
        <div className="page-head">
          <button className="back" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <h1>Commandes</h1>
        </div>
        <div className="empty">
          <CircleHelp size={28} />
          <h3>{error}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="page-head">
        <button className="back" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <h1>Commandes</h1>
      </div>

      {!orders.length ? (
        <div className="empty">
          <Package size={28} />
          <h3>Aucune commande pour le moment</h3>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((currentOrder, index) => (
            <article
              className="order-card"
              key={currentOrder.id || currentOrder.reference || index}
            >
              <div className="order-top">
                <b>{currentOrder.reference || currentOrder.id}</b>
                <span className="status green">
                  {labels[currentOrder.status] || "En cours"}
                </span>
              </div>

              {currentOrder.lines?.map((line, lineIndex) => (
                <p key={line.id || lineIndex}>
                  {line.quantity} × {line.name} · {money(Number(line.price || 0))}
                </p>
              ))}

              <div className="order-bottom">
                <span>
                  {currentOrder.date
                    ? new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(currentOrder.date))
                    : ""}
                </span>
                <strong>{money(Number(currentOrder.total || 0))}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
