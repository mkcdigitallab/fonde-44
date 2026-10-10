import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  Clock3,
  MapPin,
  Package,
  XCircle
} from "lucide-react";
import { customerApi } from "./api.js";
import { removeTrackedOrder } from "./trackedOrders.js";
import { money } from "../format.js";

const labels = {
  received: "Commande reçue",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  assigned: "Livreur assigné",
  out_for_delivery: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée"
};

const reasons = {
  out_of_stock: "Produit indisponible",
  unreachable: "Nous n'avons pas pu vous joindre",
  outside_zone: "Livraison impossible dans votre zone",
  closed: "Nous sommes fermés actuellement",
  other: "Autre raison"
};

function paymentLabel(order) {
  if (order.paymentStatus === "paid") return "Payée";
  if (order.paymentStatus === "failed") return "Paiement échoué";
  if (order.paymentMethod === "cash") {
    return order.fulfillment === "pickup"
      ? "À payer à la remise"
      : "À payer à la livraison";
  }
  return "Paiement en attente";
}

export default function TrackingScreen({ order, onHome, account, onOpenAuth }) {
  const [id] = useState(order?.id);
  const [token] = useState(order?.trackingToken || order?.token);
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showAccountPrompt, setShowAccountPrompt] = useState(true);

  const load = useCallback(async () => {
    if (!id || !token) {
      setState("error");
      setMessage("Le suivi de cette commande n'est pas disponible.");
      return false;
    }

    const response = await customerApi(
      "/api/orders/track?id=" + encodeURIComponent(id) +
      "&token=" + encodeURIComponent(token)
    );

    if (response.status === 404) {
      removeTrackedOrder(id);
      setState("error");
      setMessage("Le suivi de cette commande n'est plus disponible.");
      return "not_found";
    }

    if (!response.ok) {
      setState("error");
      setMessage(response.status === 0
        ? "Connexion impossible. Nous réessaierons."
        : "Impossible de charger le suivi.");
      return false;
    }

    const next = response.data?.data || null;
    setData(next);
    setState("ready");
    setMessage("");
    return next?.status || null;
  }, [id, token]);

  useEffect(() => {
    let alive = true;
    let timer = null;

    const scheduleNext = status => {
      window.clearTimeout(timer);

      if (!alive || document.visibilityState !== "visible") {
        return;
      }

      if (status === "not_found" || ["delivered", "cancelled"].includes(status)) {
        return;
      }

      timer = window.setTimeout(tick, status ? 15000 : 30000);
    };

    const tick = async () => {
      if (!alive || document.visibilityState !== "visible") {
        return;
      }

      const status = await load();

      if (alive) {
        scheduleNext(status);
      }
    };

    const onVisibilityChange = () => {
      window.clearTimeout(timer);

      if (document.visibilityState === "visible") {
        void tick();
      }
    };

    void tick();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load]);

  async function cancel() {
    setCancelling(true);

    const response = await customerApi("/api/orders/cancel", {
      method: "POST",
      body: { id, token }
    });

    setCancelling(false);

    if (response.error === "not_cancellable") {
      setCancelOpen(false);
      setMessage("Cette commande ne peut plus être annulée.");
      return;
    }

    if (!response.ok) {
      setMessage("L'annulation n'a pas pu être enregistrée.");
      return;
    }

    setCancelOpen(false);
    await load();
  }

  const timeline = useMemo(() => {
    if (!data) {
      return [];
    }

    const statuses = [
      "received",
      "confirmed",
      "preparing",
      "ready",
      ...(data.fulfillment === "delivery" ? ["assigned", "out_for_delivery"] : []),
      "delivered"
    ];
    const currentIndex = statuses.indexOf(data.status);

    return statuses.map(status => ({
      status,
      done: currentIndex >= 0 && statuses.indexOf(status) <= currentIndex,
      active: status === data.status
    }));
  }, [data]);

  if (state === "loading") {
    return (
      <div className="stack">
        <div className="page-head">
          <button className="back" onClick={onHome} aria-label="Retour">
            <ArrowLeft size={20}/>
          </button>
          <h1>Suivi</h1>
        </div>
        <div className="empty" role="status" aria-live="polite">
          <Clock3 size={28}/>
          <h3>Chargement du suivi…</h3>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="stack">
        <div className="page-head">
          <button className="back" onClick={onHome} aria-label="Retour">
            <ArrowLeft size={20}/>
          </button>
          <h1>Suivi</h1>
        </div>
        <div className="empty" role="alert" aria-live="polite">
          <CircleHelp size={28}/>
          <h3>{message}</h3>
        </div>
      </div>
    );
  }

  const cancelled = data.status === "cancelled";

  return (
    <div className="stack">
      <div className="page-head">
        <button className="back" onClick={onHome} aria-label="Retour">
          <ArrowLeft size={20}/>
        </button>
        <div>
          <span className="eyebrow">Commande {data.id}</span>
          <h1>{labels[data.status] || data.status}</h1>
        </div>
      </div>

      {account == null && showAccountPrompt && (
        <section className="order-card customer-account-prompt">
          <h2>Créez un compte pour retrouver vos commandes</h2>
          <p>Votre commande reste possible sans compte.</p>
          <div className="sub-actions">
            <button
              className="secondary"
              onClick={() => setShowAccountPrompt(false)}
            >
              Plus tard
            </button>
            <button
              className="primary"
              onClick={() => onOpenAuth?.("register")}
            >
              Créer un compte
            </button>
          </div>
        </section>
      )}

      <section className="order-card">
        <div className="order-top">
          <b>{data.id}</b>
          <span className="status green">{labels[data.status] || data.status}</span>
        </div>
        <p>
          {data.fulfillment === "pickup" ? "Retrait sur place" : "Livraison"}
          {" · "}
          {paymentLabel(data)}
        </p>
        <div className="order-bottom">
          <strong>{money(data.total)}</strong>
          <span>
            {data.createdAt
              ? new Intl.DateTimeFormat("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short"
                }).format(new Date(data.createdAt))
              : ""}
          </span>
        </div>
      </section>

      {!cancelled && (
        <section className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Suivi en temps réel</span>
              <h2>Votre commande avance</h2>
            </div>
            <MapPin size={20}/>
          </div>
          <div className="stack compact">
            {timeline.map(item => (
              <div
                className={item.active ? "setting active" : item.done ? "setting done" : "setting"}
                key={item.status}
              >
                <span className="avatar">
                  {item.done ? <CheckCircle2 size={18}/> : <Package size={18}/>}
                </span>
                <div>
                  <b>
                    {item.status === "ready" && data.fulfillment === "pickup"
                      ? "Prête à retirer"
                      : item.status === "delivered" && data.fulfillment === "pickup"
                        ? "Remise"
                        : labels[item.status]}
                  </b>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {cancelled && (
        <section className="card" role="status">
          <div className="section-head">
            <div>
              <span className="eyebrow">Annulation</span>
              <h2>Commande annulée</h2>
            </div>
            <XCircle size={22}/>
          </div>
          {data.cancellation?.by === "customer"
            ? <p>Vous avez annulé cette commande.</p>
            : (
              <>
                <p>{reasons[data.cancellation?.reason] || "Commande annulée."}</p>
                {data.cancellation?.note && <p>{data.cancellation.note}</p>}
              </>
            )}
        </section>
      )}

      {message && (
        <div className="customer-error" role="alert" aria-live="polite">
          {message}
        </div>
      )}

      {data.items?.length > 0 && (
        <section className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Détail</span>
              <h2>Articles</h2>
            </div>
          </div>
          {data.items.map((item, index) => (
            <div className="setting" key={index}>
              <div>
                <b>{item.quantity} × {item.name}</b>
              </div>
            </div>
          ))}
        </section>
      )}

      {!cancelled && data.cancellable && (
        <button className="danger-button full" onClick={() => setCancelOpen(true)}>
          Annuler ma commande
        </button>
      )}

      {cancelOpen && (
        <div className="customer-modal-backdrop">
          <section className="customer-modal" role="dialog" aria-modal="true">
            <h2>Annuler ma commande ?</h2>
            <p>Cette commande sera annulée.</p>
            <div className="sub-actions">
              <button
                className="secondary"
                disabled={cancelling}
                onClick={() => setCancelOpen(false)}
              >
                Garder la commande
              </button>
              <button
                className="danger-button"
                disabled={cancelling}
                onClick={cancel}
              >
                {cancelling ? "Annulation…" : "Confirmer l'annulation"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
