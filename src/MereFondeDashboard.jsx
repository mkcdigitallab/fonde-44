import React, { useState } from "react";
import {
  Bell, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign,
  ClipboardList, Clock3, Package, Plus, ShoppingBasket, Truck,
  WalletCards, Wheat, X, Mic, BarChart3, Sun, Moon
} from "lucide-react";

const orders = [
  { id: "FD-2048", client: "Aminata Ndiaye", items: "4 pots de Fondé", amount: 800, status: "À préparer", delivery: "Livraison" },
  { id: "FD-2047", client: "Moussa Diop", items: "3 pots · 2 Fondé + 1 Thiakry", amount: 700, status: "Prête", delivery: "Livraison" },
  { id: "FD-2046", client: "Fatou Sarr", items: "2 pots de Thiakry", amount: 600, status: "À préparer", delivery: "Retrait" }
];

const tasks = [
  { label: "Préparer 4 pots de Fondé", meta: "FD-2048 · Aminata", icon: Wheat },
  { label: "Remettre FD-2047 au livreur", meta: "Moussa · livraison Dakar", icon: Truck },
  { label: "Vérifier les paiements du jour", meta: "3 commandes · 2 100 FCFA", icon: WalletCards }
];

function money(value) {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
}

export default function MereFondeDashboard({ onExit, theme = "dark", onToggleTheme }) {
  const [tab, setTab] = useState("accueil");
  const [notice, setNotice] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState(() => Object.fromEntries(orders.map(order => [order.id, order.status])));

  const filteredOrders = orders.filter(order => {
    const status = orderStatus[order.id] || order.status;
    const needle = orderSearch.trim().toLowerCase();
    return (orderFilter === "all" || status === orderFilter) && (!needle || [order.id, order.client, order.items, order.delivery].some(value => value.toLowerCase().includes(needle)));
  });

  function updateOrderStatus(order, nextStatus) {
    setOrderStatus(current => ({ ...current, [order.id]: nextStatus }));
    setSelectedOrder({ ...order, status: nextStatus });
    notify(nextStatus === "Prête" ? "Commande " + order.id + " prête." : "Commande " + order.id + " passée à « " + nextStatus + " ».");
  }

  function notify(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  return (
    <div className={`mf-app mf-theme-${theme}`}>
      <header className="mf-topbar">
        <button className="mf-brand mf-brand-button" onClick={onExit} aria-label="Retourner à l’espace client">
          <span className="mf-mark">F</span>
          <div><b>Mère Fondé</b><small>Fondé 44 · Espace activité</small></div>
        </button>
        <div className="mf-actions">
          <button className="mf-icon" onClick={() => notify("Aucune nouvelle notification")} aria-label="Notifications"><Bell size={19}/></button>
          <button className="mf-icon" onClick={onToggleTheme} aria-label={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}>{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>
          <button className="mf-icon" onClick={onExit} aria-label="Retourner à l’espace client">X</button>
          <div className="mf-user"><span>MF</span><div><b>Mère Fondé</b><small>Connectée</small></div></div>
        </div>
      </header>

      <div className="mf-layout">
        <aside className="mf-sidebar">
          <div className="mf-context"><span className="mf-context-dot"/><div><b>Aujourd’hui</b><small>Votre activité</small></div></div>
          {[
            ["accueil", "Accueil", BarChart3],
            ["commandes", "Commandes", ClipboardList],
            ["production", "Production", Wheat],
            ["livraisons", "Livraisons", Truck],
            ["stock", "Stock", ShoppingBasket],
            ["finance", "Finances", WalletCards],
            ["evenements", "Événements", CalendarDays]
          ].map(([id, label, Icon]) => (
            <button key={id} className={tab === id ? "mf-nav active" : "mf-nav"} onClick={() => setTab(id)}>
              <Icon size={19}/><span>{label}</span>{id === "commandes" && <em>3</em>}
            </button>
          ))}
        </aside>

        <main className="mf-main">
          {tab === "accueil" && <>
            <section className="mf-welcome">
              <div>
                <span className="mf-eyebrow">Aujourd’hui</span>
                <h1>Bonjour Mère Fondé.</h1>
                <p>Voici seulement ce qui mérite votre attention maintenant.</p>
              </div>
              <button className="mf-primary" onClick={() => setTab("commandes")}><ClipboardList size={18}/> Voir les commandes</button>
            </section>

            <section className="mf-focus">
              <div className="mf-focus-head">
                <div><span className="mf-eyebrow">À faire maintenant</span><h2>Votre priorité</h2></div>
                <span className="mf-count">3</span>
              </div>
              {tasks.map(({ label, meta, icon: Icon }) => (
                <button className="mf-task" key={label} onClick={() => notify("Cette action sera reliée au flux métier.")}>
                  <span className="mf-task-icon"><Icon size={18}/></span>
                  <span><b>{label}</b><small>{meta}</small></span>
                  <ChevronRight size={17}/>
                </button>
              ))}
            </section>

            <section className="mf-today">
              <button onClick={() => setTab("commandes")}><ClipboardList size={19}/><span><b>3</b><small>commandes à traiter</small></span><ChevronRight size={17}/></button>
              <button onClick={() => setTab("production")}><Wheat size={19}/><span><b>7 pots</b><small>à préparer aujourd’hui</small></span><ChevronRight size={17}/></button>
              <button onClick={() => setTab("livraisons")}><Truck size={19}/><span><b>1</b><small>commande prête</small></span><ChevronRight size={17}/></button>
            </section>
          </>}

          {tab === "commandes" && (
            <section className="mf-orders-screen">
              <div className="mf-welcome">
                <div><span className="mf-eyebrow">Opérations</span><h1>Commandes</h1><p>Traitez chaque commande de la réception jusqu’à la remise au client.</p></div>
              </div>
              <div className="mf-order-summary">
                <button className={orderFilter === "all" ? "active" : ""} onClick={() => setOrderFilter("all")}><b>{orders.length}</b><small>Toutes</small></button>
                <button className={orderFilter === "À préparer" ? "active" : ""} onClick={() => setOrderFilter("À préparer")}><b>{orders.filter(o => (orderStatus[o.id] || o.status) === "À préparer").length}</b><small>À préparer</small></button>
                <button className={orderFilter === "Prête" ? "active" : ""} onClick={() => setOrderFilter("Prête")}><b>{orders.filter(o => (orderStatus[o.id] || o.status) === "Prête").length}</b><small>Prêtes</small></button>
              </div>
              <div className="mf-order-toolbar">
                <label><ClipboardList size={17}/><input value={orderSearch} onChange={event => setOrderSearch(event.target.value)} placeholder="Rechercher une commande ou un client" /></label>
                <button className="mf-filter" onClick={() => setOrderFilter("all")}>Toutes</button>
                <button className="mf-filter" onClick={() => setOrderFilter("À préparer")}>À préparer</button>
                <button className="mf-filter" onClick={() => setOrderFilter("Prête")}>Prêtes</button>
              </div>
              <section className="mf-card">
                <div className="mf-card-head"><div><span className="mf-eyebrow">Aujourd’hui</span><h2>{filteredOrders.length} commande{filteredOrders.length > 1 ? "s" : ""}</h2></div><span className="mf-count">{filteredOrders.length}</span></div>
                <div className="mf-order-table">
                  {filteredOrders.length ? filteredOrders.map(order => {
                    const status = orderStatus[order.id] || order.status;
                    return <button key={order.id} className="mf-order-row mf-order-row-rich" onClick={() => setSelectedOrder({ ...order, status })}>
                      <span className="mf-order-id">{order.id}</span>
                      <span><b>{order.client}</b><small>{order.items}</small></span>
                      <span><strong>{money(order.amount)}</strong><small>{order.delivery}</small></span>
                      <span className={"mf-status " + (status === "Prête" ? "ready" : "")}>{status}</span>
                      <ChevronRight size={17}/>
                    </button>;
                  }) : <div className="mf-order-empty"><ClipboardList size={25}/><b>Aucune commande trouvée</b><small>Essayez un autre client, numéro ou filtre.</small></div>}
                </div>
              </section>
            </section>
          )}

          {tab !== "accueil" && tab !== "commandes" && (
            <section className="mf-placeholder">
              <span className="mf-placeholder-icon">{tab === "production" ? <Wheat/> : tab === "livraisons" ? <Truck/> : tab === "stock" ? <ShoppingBasket/> : tab === "finance" ? <WalletCards/> : <CalendarDays/>}</span>
              <span className="mf-eyebrow">Espace {tab}</span>
              <h1>On construit cet écran ensuite.</h1>
              <p>La navigation est déjà reliée au dashboard Mère Fondé. Chaque écran utilisera les mêmes commandes, clients, paiements et états métier.</p>
              <button className="mf-primary" onClick={() => setTab("accueil")}>Retour à l’accueil</button>
            </section>
          )}
        </main>
      </div>

      {selectedOrder && <div className="mf-modal-backdrop" onClick={() => setSelectedOrder(null)}>
        <section className="mf-modal mf-order-detail" onClick={event => event.stopPropagation()}>
          <button className="mf-modal-close" onClick={() => setSelectedOrder(null)} aria-label="Fermer"><X size={18}/></button>
          <span className="mf-eyebrow">Commande {selectedOrder.id}</span>
          <h2>{selectedOrder.client}</h2>
          <p className="mf-detail-meta">{selectedOrder.items} · {money(selectedOrder.amount)} · {selectedOrder.delivery}</p>
          <div className="mf-detail-grid">
            <div><small>Client</small><b>{selectedOrder.client}</b><span>Commande reçue depuis l’espace client</span></div>
            <div><small>Paiement</small><b>À vérifier</b><span>Le statut financier sera relié au paiement réel</span></div>
            <div><small>Préparation</small><b>{selectedOrder.status === "Prête" ? "Terminée" : "À faire"}</b><span>La production sera reliée au stock</span></div>
            <div><small>Destination</small><b>{selectedOrder.delivery}</b><span>Le livreur interviendra après préparation</span></div>
          </div>
          <div className="mf-flow">
            <span className="done"><CheckCircle2 size={17}/> Commande reçue</span>
            <span className={selectedOrder.status === "Prête" ? "done" : ""}><Wheat size={17}/> {selectedOrder.status === "Prête" ? "Commande prête" : "À préparer"}</span>
            <span><Truck size={17}/> Remise au livreur / retrait</span>
            <span><CheckCircle2 size={17}/> Client servi</span>
          </div>
          {selectedOrder.status !== "Prête" && <button className="mf-primary" onClick={() => updateOrderStatus(selectedOrder, "Prête")}><CheckCircle2 size={18}/> Marquer comme prête</button>}
          {selectedOrder.status === "Prête" && <button className="mf-primary" onClick={() => { setSelectedOrder(null); setTab(selectedOrder.delivery === "Livraison" ? "livraisons" : "commandes"); notify(selectedOrder.delivery === "Livraison" ? "Commande prête pour la livraison." : "Commande prête pour le retrait."); }}><Truck size={18}/> {selectedOrder.delivery === "Livraison" ? "Passer aux livraisons" : "Préparer le retrait"}</button>}
        </section>
      </div>}

      {notice && <div className="mf-toast"><CheckCircle2 size={17}/>{notice}</div>}
    </div>
  );
}
