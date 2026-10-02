import React, { useMemo, useRef, useState } from "react";
import {
  Bell, CalendarDays, Check, CheckCircle2, ChevronRight, CircleDollarSign,
  ClipboardList, Clock3, CreditCard, Package, Plus, ShoppingBasket, Truck,
  WalletCards, Wheat, X, Sun, Moon, AlertCircle, ArrowLeft, ArrowRight
} from "lucide-react";

const initialOrders = [
  { id: "FD-2048", client: "Aminata Ndiaye", items: "4 pots de Fondé", amount: 800, status: "À préparer", delivery: "Livraison", time: "10:30" },
  { id: "FD-2047", client: "Moussa Diop", items: "2 Fondé + 1 Thiakry", amount: 700, status: "Prête", delivery: "Livraison", time: "11:00" },
  { id: "FD-2046", client: "Fatou Sarr", items: "2 pots de Thiakry", amount: 600, status: "À préparer", delivery: "Retrait", time: "12:30" }
];

const productionItems = [
  { name: "Fondé", planned: 6, prepared: 4, unit: "pots" },
  { name: "Thiakry", planned: 3, prepared: 2, unit: "pots" }
];

const deliveryItems = [
  { id: "FD-2047", client: "Moussa Diop", address: "Dakar", status: "Prête", time: "11:00" },
  { id: "FD-2045", client: "Awa Fall", address: "Dakar", status: "En livraison", time: "10:15" }
];

const stockItems = [
  { name: "Mil", quantity: 8, unit: "kg", level: "normal" },
  { name: "Lait caillé", quantity: 2, unit: "L", level: "low" },
  { name: "Pots", quantity: 46, unit: "unités", level: "normal" }
];

function money(value) {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
}

export default function MereFondeDashboard({ onExit, theme = "dark", onToggleTheme }) {
  const [tab, setTab] = useState("accueil");
  const [notice, setNotice] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState(initialOrders);
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [financePeriod, setFinancePeriod] = useState("today");
  const [eventRequestOpen, setEventRequestOpen] = useState(false);
  const mobileNavRefs = useRef({});

  const pendingOrders = orders.filter(order => order.status === "À préparer");
  const readyOrders = orders.filter(order => order.status === "Prête");

  const filteredOrders = useMemo(() => orders.filter(order => {
    const needle = orderSearch.trim().toLowerCase();
    const statusMatch = orderFilter === "all" || order.status === orderFilter;
    const textMatch = !needle || [order.id, order.client, order.items, order.delivery].some(value => value.toLowerCase().includes(needle));
    return statusMatch && textMatch;
  }), [orders, orderFilter, orderSearch]);

  function notify(message) {
    setNotice(message);
    window.clearTimeout(window.__mereFondeToast);
    window.__mereFondeToast = window.setTimeout(() => setNotice(""), 2600);
  }

  function updateOrderStatus(id, nextStatus) {
    setOrders(current => current.map(order => order.id === id ? { ...order, status: nextStatus } : order));
    setSelectedOrder(current => current ? { ...current, status: nextStatus } : current);
    notify(nextStatus === "Prête" ? `Commande ${id} prête.` : `Commande ${id} mise à jour.`);
  }

  function go(nextTab) {
    setTab(nextTab);
    window.scrollTo({ top: 0, behavior: "auto" });
    window.requestAnimationFrame(() => {
      mobileNavRefs.current[nextTab]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });
    });
  }

  const nav = [
    ["accueil", "Accueil", ClipboardList],
    ["commandes", "Commandes", ClipboardList],
    ["production", "Production", Wheat],
    ["livraisons", "Livraisons", Truck],
    ["stock", "Stock", ShoppingBasket],
    ["finance", "Finances", WalletCards],
    ["evenements", "Événements", CalendarDays]
  ];

  return (
    <div className={`mf-app mf-theme-${theme}`}>
      <header className="mf-topbar">
        <button className="mf-brand mf-brand-button" onClick={onExit} aria-label="Retourner à l’espace client">
          <span className="mf-mark">F</span>
          <div><b>Mère Fondé</b><small>Fondé 44 · Espace activité</small></div>
        </button>
        <div className="mf-actions">
          <button className="mf-icon" onClick={() => notify("Aucune nouvelle notification")} aria-label="Notifications"><Bell size={19}/></button>
          <button className="mf-icon" onClick={onToggleTheme} aria-label={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}>
            {theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}
          </button>
          <button className="mf-icon" onClick={onExit} aria-label="Retour à l’espace client"><X size={18}/></button>
          <div className="mf-user"><span>MF</span><div><b>Mère Fondé</b><small>Connectée</small></div></div>
        </div>
      </header>

      <nav className="mf-mobile-nav" aria-label="Navigation Mère Fondé">
        <div className="mf-mobile-nav-track">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              ref={element => { mobileNavRefs.current[id] = element; }}
              className={tab === id ? "mf-mobile-nav-item active" : "mf-mobile-nav-item"}
              onClick={() => go(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={17}/>
              <span>{label}</span>
              {id === "commandes" && pendingOrders.length > 0 && <em>{pendingOrders.length}</em>}
            </button>
          ))}
        </div>
      </nav>

      <div className="mf-layout">
        <aside className="mf-sidebar">
          <div className="mf-context"><span className="mf-context-dot"/><div><b>Aujourd’hui</b><small>Votre activité</small></div></div>
          {nav.map(([id, label, Icon]) => (
            <button key={id} className={tab === id ? "mf-nav active" : "mf-nav"} onClick={() => go(id)}>
              <Icon size={19}/><span>{label}</span>
              {id === "commandes" && pendingOrders.length > 0 && <em>{pendingOrders.length}</em>}
            </button>
          ))}
        </aside>

        <main className="mf-main">
          {tab === "accueil" && (
            <HomeScreen
              pendingOrders={pendingOrders}
              readyOrders={readyOrders}
              onOrders={() => go("commandes")}
              onProduction={() => go("production")}
              onDeliveries={() => go("livraisons")}
              onFinance={() => go("finance")}
            />
          )}

          {tab === "commandes" && (
            <OrdersScreen
              orders={orders}
              filteredOrders={filteredOrders}
              filter={orderFilter}
              setFilter={setOrderFilter}
              search={orderSearch}
              setSearch={setOrderSearch}
              onSelect={setSelectedOrder}
              onBack={() => go("accueil")}
            />
          )}

          {tab === "production" && (
            <ProductionScreen
              onBack={() => go("accueil")}
              onOrders={() => go("commandes")}
              onNotify={notify}
            />
          )}

          {tab === "livraisons" && (
            <DeliveryScreen
              items={deliveryItems}
              onBack={() => go("accueil")}
              onNotify={notify}
            />
          )}

          {tab === "stock" && (
            <StockScreen
              items={stockItems}
              onBack={() => go("accueil")}
              onNotify={notify}
            />
          )}

          {tab === "finance" && (
            <FinanceScreen
              period={financePeriod}
              setPeriod={setFinancePeriod}
              onBack={() => go("accueil")}
            />
          )}

          {tab === "evenements" && (
            <EventScreen
              openRequest={() => setEventRequestOpen(true)}
              onBack={() => go("accueil")}
            />
          )}
        </main>
      </div>

      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onReady={() => updateOrderStatus(selectedOrder.id, "Prête")}
          onNext={() => {
            setSelectedOrder(null);
            go(selectedOrder.delivery === "Livraison" ? "livraisons" : "commandes");
            notify(selectedOrder.delivery === "Livraison" ? "Commande prête pour la livraison." : "Commande prête pour le retrait.");
          }}
        />
      )}

      {eventRequestOpen && (
        <div className="mf-modal-backdrop" onClick={() => setEventRequestOpen(false)}>
          <section className="mf-modal" onClick={event => event.stopPropagation()}>
            <button className="mf-modal-close" onClick={() => setEventRequestOpen(false)} aria-label="Fermer"><X size={18}/></button>
            <span className="mf-eyebrow">Événement</span>
            <h2>Nouvelle demande</h2>
            <p>Écran de saisie à relier au service événement et aux demandes vocales.</p>
            <div className="mf-flow">
              <span><CalendarDays size={17}/> Date et type d’événement</span>
              <span><Package size={17}/> Quantités à prévoir</span>
              <span><WalletCards size={17}/> Devis et conditions</span>
            </div>
            <button className="mf-primary" onClick={() => { setEventRequestOpen(false); notify("La demande sera reliée au flux événement."); }}>Continuer</button>
          </section>
        </div>
      )}

      {notice && <div className="mf-toast"><CheckCircle2 size={17}/>{notice}</div>}
    </div>
  );
}

function HomeScreen({ pendingOrders, readyOrders, onOrders, onProduction, onDeliveries, onFinance }) {
  const first = pendingOrders[0];
  return (
    <section className="mf-home">
      <div className="mf-welcome">
        <div>
          <span className="mf-eyebrow">Aujourd’hui</span>
          <h1>Bonjour Mère Fondé.</h1>
          <p>Voici ce qui mérite votre attention maintenant.</p>
        </div>
        <button className="mf-primary" onClick={onOrders}><ClipboardList size={18}/> Voir les commandes</button>
      </div>

      <section className="mf-focus mf-focus-main">
        <div className="mf-focus-head">
          <div><span className="mf-eyebrow">Priorité</span><h2>{pendingOrders.length ? `${pendingOrders.length} commande${pendingOrders.length > 1 ? "s" : ""} à préparer` : "Tout est à jour"}</h2></div>
          <span className="mf-focus-state">{pendingOrders.length ? "À faire" : "OK"}</span>
        </div>
        {first ? (
          <button className="mf-priority-order" onClick={onOrders}>
            <span className="mf-task-icon"><Wheat size={20}/></span>
            <span><b>{first.id} · {first.client}</b><small>{first.items} · {money(first.amount)} · {first.time}</small></span>
            <ChevronRight size={19}/>
          </button>
        ) : (
          <div className="mf-empty-inline"><CheckCircle2 size={20}/><span>Les commandes en attente apparaîtront ici.</span></div>
        )}
      </section>

      <section className="mf-home-actions">
        <button onClick={onProduction}><Wheat size={20}/><span><b>Production</b><small>Préparer aujourd’hui</small></span><ChevronRight size={18}/></button>
        <button onClick={onDeliveries}><Truck size={20}/><span><b>Livraisons</b><small>{readyOrders.length} commande{readyOrders.length > 1 ? "s" : ""} prête{readyOrders.length > 1 ? "s" : ""}</small></span><ChevronRight size={18}/></button>
        <button onClick={onFinance}><WalletCards size={20}/><span><b>Argent</b><small>Voir les mouvements</small></span><ChevronRight size={18}/></button>
      </section>

      <section className="mf-home-note">
        <CircleDollarSign size={18}/>
        <div><b>Une seule chose à retenir</b><small>Les ventes, paiements et dépenses sont détaillés dans Finances. L’accueil reste réservé aux actions.</small></div>
      </section>
    </section>
  );
}

function ScreenHeader({ eyebrow, title, description, onBack, action }) {
  return (
    <div className="mf-screen-header">
      <div className="mf-screen-header-main">
        {onBack && <button className="mf-back" onClick={onBack} aria-label="Retour"><ArrowLeft size={18}/></button>}
        <div><span className="mf-eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>
      </div>
      {action}
    </div>
  );
}

function OrdersScreen({ orders, filteredOrders, filter, setFilter, search, setSearch, onSelect, onBack }) {
  return (
    <section className="mf-screen">
      <ScreenHeader eyebrow="Opérations" title="Commandes" description="Une commande à la fois : préparer, remettre, servir." onBack={onBack}/>
      <div className="mf-order-summary">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}><b>{orders.length}</b><small>Toutes</small></button>
        <button className={filter === "À préparer" ? "active" : ""} onClick={() => setFilter("À préparer")}><b>{orders.filter(o => o.status === "À préparer").length}</b><small>À préparer</small></button>
        <button className={filter === "Prête" ? "active" : ""} onClick={() => setFilter("Prête")}><b>{orders.filter(o => o.status === "Prête").length}</b><small>Prêtes</small></button>
      </div>

      <div className="mf-order-toolbar">
        <label><ClipboardList size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher une commande ou un client"/></label>
        {["all", "À préparer", "Prête"].map(value => (
          <button key={value} className={filter === value ? "mf-filter active" : "mf-filter"} onClick={() => setFilter(value)}>
            {value === "all" ? "Toutes" : value}
          </button>
        ))}
      </div>

      <section className="mf-card">
        <div className="mf-card-head"><div><span className="mf-eyebrow">À traiter</span><h2>{filteredOrders.length} résultat{filteredOrders.length > 1 ? "s" : ""}</h2></div></div>
        <div className="mf-order-table">
          {filteredOrders.length ? filteredOrders.map(order => (
            <button key={order.id} className="mf-order-row mf-order-row-rich" onClick={() => onSelect(order)}>
              <span className="mf-order-id">{order.id}</span>
              <span><b>{order.client}</b><small>{order.items}</small></span>
              <span><strong>{money(order.amount)}</strong><small>{order.time} · {order.delivery}</small></span>
              <span className={order.status === "Prête" ? "mf-status ready" : "mf-status"}>{order.status}</span>
              <ChevronRight size={17}/>
            </button>
          )) : (
            <div className="mf-order-empty"><CheckCircle2 size={26}/><b>Aucune commande ici</b><small>Changez le filtre ou la recherche.</small></div>
          )}
        </div>
      </section>
    </section>
  );
}

function OrderDetail({ order, onClose, onReady, onNext }) {
  const ready = order.status === "Prête";
  return (
    <div className="mf-modal-backdrop" onClick={onClose}>
      <section className="mf-modal mf-order-detail" onClick={event => event.stopPropagation()}>
        <button className="mf-modal-close" onClick={onClose} aria-label="Fermer"><X size={18}/></button>
        <span className="mf-eyebrow">Commande {order.id}</span>
        <h2>{order.client}</h2>
        <p className="mf-detail-meta">{order.items} · {money(order.amount)} · {order.delivery} · {order.time}</p>

        <div className="mf-order-hero-status">
          <span className={ready ? "mf-status ready" : "mf-status"}>{order.status}</span>
          <span>{order.delivery === "Livraison" ? "À remettre au livreur" : "À préparer pour retrait"}</span>
        </div>

        <div className="mf-detail-grid">
          <div><small>Commande</small><b>{order.items}</b><span>Reçue depuis l’espace client</span></div>
          <div><small>Paiement</small><b>À vérifier</b><span>Le statut réel viendra du paiement backend</span></div>
          <div><small>Préparation</small><b>{ready ? "Terminée" : "À faire"}</b><span>La quantité doit être préparée avant remise</span></div>
          <div><small>Destination</small><b>{order.delivery}</b><span>{order.delivery === "Livraison" ? "Dakar · livreur ensuite" : "Retrait sur place"}</span></div>
        </div>

        <div className="mf-flow">
          <span className="done"><CheckCircle2 size={17}/> Commande reçue</span>
          <span className={ready ? "done" : ""}>{ready ? <CheckCircle2 size={17}/> : <Wheat size={17}/>} {ready ? "Commande prête" : "À préparer"}</span>
          <span><Truck size={17}/> {order.delivery === "Livraison" ? "Remise au livreur" : "Préparer le retrait"}</span>
          <span><CheckCircle2 size={17}/> Client servi</span>
        </div>

        {!ready ? <button className="mf-primary" onClick={onReady}><CheckCircle2 size={18}/> Marquer comme prête</button> : <button className="mf-primary" onClick={onNext}><ArrowRight size={18}/> {order.delivery === "Livraison" ? "Passer aux livraisons" : "Préparer le retrait"}</button>}
      </section>
    </div>
  );
}

function ProductionScreen({ onBack, onOrders, onNotify }) {
  const [prepared, setPrepared] = useState(Object.fromEntries(productionItems.map(item => [item.name, item.prepared])));
  const totalPlanned = productionItems.reduce((sum, item) => sum + item.planned, 0);
  const totalPrepared = productionItems.reduce((sum, item) => sum + (prepared[item.name] || 0), 0);
  const complete = totalPrepared >= totalPlanned;

  function addOne(name, max) {
    setPrepared(current => ({ ...current, [name]: Math.min(max, (current[name] || 0) + 1) }));
  }

  return (
    <section className="mf-screen">
      <ScreenHeader eyebrow="Préparation" title="Production" description="Préparez seulement ce qui est nécessaire pour les commandes du jour." onBack={onBack}/>
      <section className="mf-production-hero">
        <div><span className="mf-eyebrow">Aujourd’hui</span><h2>{totalPrepared} / {totalPlanned} pots préparés</h2><p>{complete ? "La production prévue est prête." : "Avancez produit par produit."}</p></div>
        <div className="mf-big-progress"><span style={{width: `${Math.min(100, (totalPrepared / totalPlanned) * 100)}%`}}/></div>
      </section>

      <section className="mf-card">
        <div className="mf-card-head"><div><span className="mf-eyebrow">À préparer</span><h2>Besoin du jour</h2></div></div>
        <div className="mf-production-list">
          {productionItems.map(item => {
            const value = prepared[item.name] || 0;
            const done = value >= item.planned;
            return (
              <div className="mf-production-item" key={item.name}>
                <span className="mf-product-dot"><Wheat size={18}/></span>
                <div><b>{item.name}</b><small>{value} / {item.planned} {item.unit}</small></div>
                <span className={done ? "mf-status ready" : "mf-status"}>{done ? "Prêt" : "À faire"}</span>
                <button className="mf-icon mf-production-add" disabled={done} onClick={() => addOne(item.name, item.planned)} aria-label={`Préparer un ${item.name}`}><Plus size={18}/></button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mf-action-row">
        <button className="mf-secondary" onClick={onOrders}><ClipboardList size={17}/> Voir les commandes</button>
        <button className="mf-primary" onClick={() => onNotify(complete ? "Production du jour validée." : "Préparez les quantités restantes avant validation.")}>{complete ? <><Check size={17}/> Valider la production</> : "Continuer la préparation"}</button>
      </div>
    </section>
  );
}

function DeliveryScreen({ items, onBack, onNotify }) {
  const [statuses, setStatuses] = useState(Object.fromEntries(items.map(item => [item.id, item.status])));
  const active = items.filter(item => statuses[item.id] !== "Livrée");
  function advance(item) {
    const next = statuses[item.id] === "Prête" ? "En livraison" : "Livrée";
    setStatuses(current => ({ ...current, [item.id]: next }));
    onNotify(next === "Livrée" ? `${item.id} livrée.` : `${item.id} remise au livreur.`);
  }
  return (
    <section className="mf-screen">
      <ScreenHeader eyebrow="Terrain" title="Livraisons" description="Ce qui est prêt à sortir, puis ce qui est déjà en route." onBack={onBack}/>
      <div className="mf-delivery-summary"><b>{active.length}</b><span>livraison{active.length > 1 ? "s" : ""} à suivre</span></div>
      <section className="mf-card">
        <div className="mf-card-head"><div><span className="mf-eyebrow">Aujourd’hui</span><h2>À suivre</h2></div></div>
        <div className="mf-delivery-list">
          {items.map(item => {
            const status = statuses[item.id];
            const delivered = status === "Livrée";
            return <div className={delivered ? "mf-delivery-item done" : "mf-delivery-item"} key={item.id}>
              <span className="mf-delivery-icon"><Truck size={19}/></span>
              <div><b>{item.id} · {item.client}</b><small>{item.address} · {item.time}</small></div>
              <span className={status === "Livrée" ? "mf-status ready" : "mf-status"}>{status}</span>
              {!delivered && <button className="mf-secondary small" onClick={() => advance(item)}>{status === "Prête" ? "Remettre" : "Marquer livrée"}</button>}
            </div>;
          })}
        </div>
      </section>
      <div className="mf-link-note"><Truck size={17}/><span>Le détail du trajet appartient à l’espace <b>Livreur</b>. Ici, Mère Fondé suit seulement l’état de la remise.</span></div>
    </section>
  );
}

function StockScreen({ items, onBack, onNotify }) {
  return (
    <section className="mf-screen">
      <ScreenHeader eyebrow="Approvisionnement" title="Stock" description="Savoir ce qui est disponible avant de lancer une préparation." onBack={onBack} action={<button className="mf-secondary" onClick={() => onNotify("Ajout de stock à relier au module d’approvisionnement.")}><Plus size={17}/> Ajouter</button>}/>
      <section className="mf-stock-alert"><AlertCircle size={18}/><div><b>1 élément à surveiller</b><small>Le lait caillé approche du seuil défini.</small></div></section>
      <div className="mf-stock-grid">
        {items.map(item => (
          <article className="mf-stock-card" key={item.name}>
            <div className="mf-stock-card-top"><span className="mf-product-dot"><ShoppingBasket size={17}/></span><span className={item.level === "low" ? "mf-status" : "mf-status ready"}>{item.level === "low" ? "À surveiller" : "OK"}</span></div>
            <h2>{item.name}</h2>
            <strong>{item.quantity}</strong><small>{item.unit} disponibles</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinanceScreen({ period, setPeriod, onBack }) {
  const values = period === "today"
    ? { received: 2100, expense: 600, expected: 700, result: 1500 }
    : { received: 12600, expense: 4200, expected: 2100, result: 8400 };
  return (
    <section className="mf-screen">
      <ScreenHeader eyebrow="Argent" title="Finances" description="Une vue simple de l’argent reçu, à recevoir et dépensé." onBack={onBack}/>
      <div className="mf-period-toggle">
        <button className={period === "today" ? "active" : ""} onClick={() => setPeriod("today")}>Aujourd’hui</button>
        <button className={period === "week" ? "active" : ""} onClick={() => setPeriod("week")}>Cette semaine</button>
      </div>
      <section className="mf-finance-main">
        <div><span className="mf-eyebrow">Résultat indicatif</span><strong>{money(values.result)}</strong><small>Ventes reçues moins dépenses enregistrées</small></div>
      </section>
      <div className="mf-finance-grid">
        <div><CircleDollarSign size={18}/><span><b>{money(values.received)}</b><small>Reçu</small></span></div>
        <div><Clock3 size={18}/><span><b>{money(values.expected)}</b><small>À recevoir</small></span></div>
        <div><WalletCards size={18}/><span><b>{money(values.expense)}</b><small>Dépenses</small></span></div>
      </div>
      <section className="mf-card">
        <div className="mf-card-head"><div><span className="mf-eyebrow">Mouvements</span><h2>À comprendre</h2></div></div>
        <div className="mf-finance-row"><span><CircleDollarSign size={17}/><div><b>Ventes commandes</b><small>Encaissements clients</small></div></span><strong>+ {money(values.received)}</strong></div>
        <div className="mf-finance-row"><span><CreditCard size={17}/><div><b>Dépenses activité</b><small>Achats et fonctionnement</small></div></span><strong>- {money(values.expense)}</strong></div>
        <div className="mf-finance-row"><span><Clock3 size={17}/><div><b>À vérifier</b><small>Paiements encore non confirmés</small></div></span><strong>{money(values.expected)}</strong></div>
      </section>
      <div className="mf-link-note"><WalletCards size={17}/><span>Les données affichées ici sont une <b>maquette métier</b>. Le calcul réel viendra des commandes, paiements et dépenses enregistrés.</span></div>
    </section>
  );
}

function EventScreen({ openRequest, onBack }) {
  return (
    <section className="mf-screen">
      <ScreenHeader eyebrow="Service événement" title="Événements" description="Suivre les demandes importantes sans les mélanger aux commandes quotidiennes." onBack={onBack} action={<button className="mf-primary" onClick={openRequest}><Plus size={17}/> Nouvelle demande</button>}/>
      <section className="mf-event-hero">
        <CalendarDays size={25}/>
        <div><span className="mf-eyebrow">À traiter</span><h2>Une demande en préparation</h2><p>Une demande événementielle suit un parcours différent : besoin → échange → proposition → validation.</p></div>
      </section>
      <section className="mf-card">
        <div className="mf-card-head"><div><span className="mf-eyebrow">Pipeline</span><h2>Demande événement</h2></div></div>
        <div className="mf-event-flow">
          <span className="active"><b>1</b><div><strong>Demande reçue</strong><small>Informations initiales</small></div></span>
          <span><b>2</b><div><strong>Échange</strong><small>Quantités, date, lieu</small></div></span>
          <span><b>3</b><div><strong>Proposition</strong><small>Prix et conditions</small></div></span>
          <span><b>4</b><div><strong>Validation</strong><small>Commande événement</small></div></span>
        </div>
      </section>
    </section>
  );
}
