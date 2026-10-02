import React, { useMemo, useRef, useState } from "react";
import {
  Bell, CalendarDays, Check, CheckCircle2, ChevronRight, CircleDollarSign,
  ClipboardList, CreditCard, Package, Plus, ShoppingBasket, Truck,
  WalletCards, Wheat, X, Sun, Moon, AlertCircle, ArrowLeft, ArrowRight,
  Zap, Wrench, RefreshCw
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

const initialFinancePockets = [
  { name: "Espèces", amount: 18400 },
  { name: "Wave", amount: 12750 },
  { name: "Orange Money", amount: 8350 },
  { name: "Banque", amount: 0 }
];

function money(value) {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
}

export default function MereFondeDashboard({ onExit, theme = "dark", onToggleTheme, onDriverAccess }) {
  const [tab, setTab] = useState("accueil");
  const [notice, setNotice] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState(initialOrders);
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [financePeriod, setFinancePeriod] = useState("today");
  const [eventRequestOpen, setEventRequestOpen] = useState(false);
  const [financePockets, setFinancePockets] = useState(initialFinancePockets);
  const [financeExpenses, setFinanceExpenses] = useState([
    { id: "DEP-001", label: "Achat de mil", category: "Matières premières", amount: 8500, pocket: "Espèces", day: "today", date: "Aujourd’hui" },
    { id: "DEP-002", label: "Lait caillé", category: "Matières premières", amount: 2400, pocket: "Wave", day: "today", date: "Aujourd’hui" },
    { id: "DEP-003", label: "Transport", category: "Transport", amount: 1800, pocket: "Espèces", day: "yesterday", date: "Hier" },
  ]);
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
          <button className="mf-temp-access" onClick={onDriverAccess}><Truck size={17}/><span>Livreur</span></button>
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
              financeExpenses={financeExpenses}
              setFinanceExpenses={setFinanceExpenses}
              financePockets={financePockets}
              setFinancePockets={setFinancePockets}
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
  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12 ? "Bonjour" : hour >= 12 && hour < 18 ? "Bon après-midi" : "Bonsoir";
  const attentionLabel = hour >= 5 && hour < 12 ? "Ce matin" : hour >= 12 && hour < 18 ? "Cet après-midi" : "Ce soir";
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
  const remaining = Math.max(0, totalPlanned - totalPrepared);
  const complete = remaining === 0;
  const progress = Math.min(100, Math.round((totalPrepared / totalPlanned) * 100));

  function addOne(name, max) {
    setPrepared(current => ({ ...current, [name]: Math.min(max, (current[name] || 0) + 1) }));
  }

  function validate() {
    if (complete) onNotify("Production du jour validée.");
    else onNotify(`Il reste ${remaining} pot${remaining > 1 ? "s" : ""} à préparer.`);
  }

  return (
    <section className="mf-screen mf-production-screen">
      <ScreenHeader
        eyebrow="Préparation"
        title="Production"
        description="Voici exactement ce qu’il faut préparer aujourd’hui."
        onBack={onBack}
      />

      <section className={complete ? "mf-production-hero complete" : "mf-production-hero"}>
        <div className="mf-production-summary">
          <span className="mf-eyebrow">Besoin du jour</span>
          <strong>{totalPlanned} pots</strong>
          <p>{complete ? "Tout est prêt. Vous pouvez valider la production." : `${remaining} pot${remaining > 1 ? "s" : ""} reste${remaining > 1 ? "nt" : ""} à préparer.`}</p>
        </div>
        <div className="mf-production-progress-wrap">
          <div className="mf-progress-label"><span>Avancement</span><b>{progress}%</b></div>
          <div className="mf-big-progress"><span style={{width: `${progress}%`}}/></div>
          <small>{totalPrepared} préparé{totalPrepared > 1 ? "s" : ""} sur {totalPlanned}</small>
        </div>
      </section>

      <section className="mf-production-orders">
        <div><ClipboardList size={18}/><span><b>Selon les commandes du jour</b><small>Les quantités viennent des besoins à préparer.</small></span><button onClick={onOrders}>Voir</button></div>
      </section>

      <section className="mf-card mf-production-card">
        <div className="mf-card-head">
          <div><span className="mf-eyebrow">À préparer</span><h2>Par produit</h2></div>
          <span className="mf-muted">{complete ? "Tout est prêt" : `${remaining} restant${remaining > 1 ? "s" : ""}`}</span>
        </div>
        <div className="mf-production-list">
          {productionItems.map(item => {
            const value = prepared[item.name] || 0;
            const left = Math.max(0, item.planned - value);
            const done = left === 0;
            const itemProgress = Math.min(100, Math.round((value / item.planned) * 100));
            return (
              <article className={done ? "mf-production-item mf-production-item-done" : "mf-production-item"} key={item.name}>
                <span className="mf-product-dot"><Wheat size={18}/></span>
                <div className="mf-production-item-main">
                  <div className="mf-production-item-title"><b>{item.name}</b><span>{value} / {item.planned} {item.unit}</span></div>
                  <div className="mf-mini-progress"><span style={{width: `${itemProgress}%`}}/></div>
                  <small>{done ? "Préparation terminée" : `${left} ${item.unit} restant${left > 1 ? "s" : ""}`}</small>
                </div>
                <span className={done ? "mf-status ready" : "mf-status"}>{done ? "Prêt" : "En cours"}</span>
                <button className="mf-production-add" disabled={done} onClick={() => addOne(item.name, item.planned)} aria-label={`Déclarer un ${item.unit} de ${item.name} préparé`}>
                  {done ? <Check size={18}/> : <Plus size={20}/>}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mf-production-note">
        <CircleDollarSign size={18}/>
        <div><b>Fondé 44 fera les calculs derrière</b><small>Quand les quantités réelles seront connectées au stock, le système pourra calculer automatiquement les matières consommées et le coût de production.</small></div>
      </section>

      <div className="mf-production-actions">
        <button className="mf-secondary" onClick={onOrders}><ClipboardList size={17}/> Commandes</button>
        <button className="mf-primary" onClick={validate}>{complete ? <><Check size={17}/> Valider la production</> : <>Continuer · {remaining} restant{remaining > 1 ? "s" : ""}</>}</button>
      </div>
    </section>
  );
}
function DeliveryScreen({ items, onBack, onNotify }) {
  const [statuses, setStatuses] = useState(Object.fromEntries(items.map(item => [item.id, item.status])));
  const active = items.filter(item => statuses[item.id] !== "Livrée");
  const ready = items.filter(item => statuses[item.id] === "Prête");
  const inTransit = items.filter(item => statuses[item.id] === "En livraison");

  function advance(item) {
    const current = statuses[item.id];
    const next = current === "Prête" ? "En livraison" : "Livrée";
    setStatuses(state => ({ ...state, [item.id]: next }));
    onNotify(next === "Livrée" ? `${item.id} livrée.` : `${item.id} remise au livreur.`);
  }

  return (
    <section className="mf-screen mf-delivery-screen">
      <ScreenHeader eyebrow="Terrain" title="Livraisons" description="Mère Fondé prépare et remet. Le livreur prend ensuite le relais." onBack={onBack}/>

      <section className="mf-delivery-hero">
        <div>
          <span className="mf-eyebrow">Aujourd’hui</span>
          <strong>{active.length} livraison{active.length > 1 ? "s" : ""} en cours</strong>
          <p>{ready.length ? `${ready.length} prête${ready.length > 1 ? "s" : ""} à remettre au livreur.` : inTransit.length ? "Les commandes sont en route." : "Toutes les livraisons sont terminées."}</p>
        </div>
        <div className="mf-delivery-stats">
          <span><b>{ready.length}</b> Prête{ready.length > 1 ? "s" : ""}</span>
          <span><b>{inTransit.length}</b> En route</span>
        </div>
      </section>

      <section className="mf-delivery-next">
        <div className="mf-delivery-next-icon"><Truck size={19}/></div>
        <div><span className="mf-eyebrow">À faire maintenant</span><b>{ready.length ? "Remettre au livreur" : inTransit.length ? "Suivre les livraisons en route" : "Rien à faire"}</b><small>{ready.length ? "Vérifiez le colis puis confirmez la remise." : "Le détail du trajet sera géré par le livreur."}</small></div>
      </section>

      <section className="mf-card mf-delivery-card">
        <div className="mf-card-head"><div><span className="mf-eyebrow">Aujourd’hui</span><h2>Suivi des commandes</h2></div><span className="mf-muted">{items.length} au total</span></div>
        <div className="mf-delivery-list">
          {items.map(item => {
            const status = statuses[item.id];
            const delivered = status === "Livrée";
            return (
              <article className={delivered ? "mf-delivery-item done" : "mf-delivery-item"} key={item.id}>
                <span className="mf-delivery-icon"><Truck size={19}/></span>
                <div className="mf-delivery-main">
                  <div className="mf-delivery-title"><b>{item.id} · {item.client}</b><span>{item.time}</span></div>
                  <small>{item.address}</small>
                  <span className={status === "Livrée" ? "mf-status ready" : "mf-status"}>{status}</span>
                </div>
                {!delivered && <button className="mf-secondary small" onClick={() => advance(item)}>{status === "Prête" ? "Remettre" : "Livrée"}</button>}
                {delivered && <CheckCircle2 size={20} className="mf-delivery-check" aria-label="Livraison terminée"/>}
              </article>
            );
          })}
          {!items.length && <div className="mf-empty-inline"><CheckCircle2 size={20}/><span>Aucune livraison prévue aujourd’hui.</span></div>}
        </div>
      </section>

      <section className="mf-delivery-handoff">
        <div><Truck size={18}/><span><b>Le livreur prend le relais ici</b><small>Après la remise, son espace gère le trajet, l’arrivée et la confirmation client.</small></span></div>
      </section>
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

function FinanceScreen({ period, setPeriod, financeExpenses, setFinanceExpenses, financePockets, setFinancePockets, onBack }) {
  const [view, setView] = useState("overview");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseLabel, setExpenseLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Matières premières");
  const [expensePocket, setExpensePocket] = useState("Espèces");
  const [assetOpen, setAssetOpen] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [assetAmount, setAssetAmount] = useState("");
  const [assetYears, setAssetYears] = useState("5");
  const [assets, setAssets] = useState([
    { id: "MAT-001", name: "Congélateur", amount: 300000, years: 5 },
    { id: "MAT-002", name: "Moulin", amount: 180000, years: 4 }
  ]);
  const [recurringExpenses] = useState([
    { id: "REC-001", label: "Électricité", amount: 15000, frequency: "Mensuelle", next: "05/10" },
    { id: "REC-002", label: "Internet", amount: 12000, frequency: "Mensuelle", next: "10/10" }
  ]);

  const baseSales = period === "today" ? 9800 : 42600;
  const expected = period === "today" ? 2200 : 7100;
  const visibleExpenses = period === "today" ? financeExpenses.filter(item => item.day === "today") : financeExpenses;
  const expenses = visibleExpenses.reduce((sum, item) => sum + item.amount, 0);
  const result = baseSales - expenses;
  const cashTotal = financePockets.reduce((sum, pocket) => sum + pocket.amount, 0);
  const depreciationMonthly = assets.reduce((sum, asset) => sum + asset.amount / (asset.years * 12), 0);
  const expenseCategories = visibleExpenses.reduce((summary, item) => {
    summary[item.category] = (summary[item.category] || 0) + item.amount;
    return summary;
  }, {});

  function addExpense() {
    const amount = Number(expenseAmount);
    const pocket = financePockets.find(item => item.name === expensePocket);
    if (!expenseLabel.trim() || !Number.isFinite(amount) || amount <= 0 || !pocket || amount > pocket.amount) return;
    setFinanceExpenses(current => [{
      id: `DEP-${String(current.length + 1).padStart(3, "0")}`,
      label: expenseLabel.trim(), category: expenseCategory, amount,
      pocket: expensePocket, day: "today", date: "Aujourd’hui"
    }, ...current]);
    setFinancePockets(current => current.map(item => item.name === expensePocket ? { ...item, amount: item.amount - amount } : item));
    setExpenseLabel(""); setExpenseAmount(""); setExpenseCategory("Matières premières"); setExpensePocket("Espèces"); setExpenseOpen(false);
  }

  function addAsset() {
    const amount = Number(assetAmount), years = Number(assetYears);
    if (!assetName.trim() || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(years) || years <= 0) return;
    setAssets(current => [{ id: `MAT-${String(current.length + 1).padStart(3, "0")}`, name: assetName.trim(), amount, years }, ...current]);
    setAssetName(""); setAssetAmount(""); setAssetYears("5"); setAssetOpen(false);
  }

  const selectedPocket = financePockets.find(item => item.name === expensePocket);
  const expenseAmountNumber = Number(expenseAmount);
  const insufficientFunds = Number.isFinite(expenseAmountNumber) && expenseAmountNumber > 0 && selectedPocket && expenseAmountNumber > selectedPocket.amount;

  return (
    <section className="mf-screen mf-finance-screen">
      <ScreenHeader
        eyebrow="Argent"
        title="Finances"
        description="Tout ce qui concerne l’argent, expliqué simplement."
        onBack={onBack}
        action={<button className="mf-primary" onClick={() => setExpenseOpen(true)}><Plus size={17}/> Dépense</button>}
      />

      <div className="mf-finance-period">
        <div className="mf-period-toggle">
          <button className={period === "today" ? "active" : ""} onClick={() => setPeriod("today")}>Aujourd’hui</button>
          <button className={period === "week" ? "active" : ""} onClick={() => setPeriod("week")}>Cette semaine</button>
        </div>
        <span><CheckCircle2 size={15}/> Données de la période</span>
      </div>

      <nav className="mf-finance-tabs" aria-label="Sections financières">
        {[["overview","Vue d’ensemble"],["expenses","Dépenses"],["cash","Caisses"],["assets","Matériel"]].map(([id,label]) => (
          <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>{label}</button>
        ))}
      </nav>

      {view === "overview" && (
        <>
          <section className="mf-finance-hero">
            <div>
              <span className="mf-eyebrow">Ce que vous avez maintenant</span>
              <strong>{money(cashTotal)}</strong>
              <p>Argent actuellement présent dans les caisses et comptes.</p>
            </div>
            <div className={result >= 0 ? "mf-finance-result positive" : "mf-finance-result negative"}>
              <span>{result >= 0 ? "L’activité gagne" : "L’activité perd"}</span>
              <b>{result >= 0 ? "+" : "−"} {money(Math.abs(result))}</b>
              <small>sur {period === "today" ? "aujourd’hui" : "la semaine"}</small>
            </div>
          </section>

          <section className="mf-finance-kpis">
            <article><span>Ventes</span><b>{money(baseSales)}</b><small>réalisées</small></article>
            <article><span>À recevoir</span><b>{money(expected)}</b><small>pas encore encaissé</small></article>
            <article><span>Dépenses</span><b>{money(expenses)}</b><small>{visibleExpenses.length} opération{visibleExpenses.length > 1 ? "s" : ""}</small></article>
          </section>

          <section className="mf-card mf-finance-explain">
            <div className="mf-card-head"><div><span className="mf-eyebrow">En clair</span><h2>Où en est l’activité ?</h2></div></div>
            <div className="mf-finance-equation">
              <div><span>Ventes</span><b>+ {money(baseSales)}</b></div>
              <div><span>Dépenses</span><b>− {money(expenses)}</b></div>
              <div className={result >= 0 ? "positive" : "negative"}><span>Résultat</span><b>{result >= 0 ? "+" : "−"} {money(Math.abs(result))}</b></div>
            </div>
            <p>{result >= 0 ? <>Après les dépenses enregistrées, <b>il reste {money(result)} de résultat</b> pour cette période.</> : <>Les dépenses dépassent les ventes de <b>{money(Math.abs(result))}</b> sur cette période.</>}</p>
          </section>

          <section className="mf-finance-shortcuts">
            <button onClick={() => setView("expenses")}><CreditCard size={19}/><span><b>Dépenses</b><small>Voir et enregistrer</small></span><ChevronRight size={17}/></button>
            <button onClick={() => setView("cash")}><WalletCards size={19}/><span><b>Mes caisses</b><small>Où est mon argent ?</small></span><ChevronRight size={17}/></button>
            <button onClick={() => setView("assets")}><Wrench size={19}/><span><b>Matériel</b><small>Amortissements</small></span><ChevronRight size={17}/></button>
          </section>
        </>
      )}

      {view === "expenses" && (
        <section className="mf-finance-panel">
          <div className="mf-finance-panel-head"><div><span className="mf-eyebrow">Sorties d’argent</span><h2>Dépenses</h2><p>Enregistrez ce que vous payez. Fondé 44 fait les calculs.</p></div><button className="mf-primary" onClick={() => setExpenseOpen(true)}><Plus size={17}/> Ajouter</button></div>
          {Object.keys(expenseCategories).length > 0 && <div className="mf-finance-category-strip">{Object.entries(expenseCategories).map(([category, amount]) => <div key={category}><b>{money(amount)}</b><span>{category}</span></div>)}</div>}
          <div className="mf-expense-list">
            {visibleExpenses.length ? visibleExpenses.map(item => (
              <div className="mf-expense-row" key={item.id}><div className="mf-expense-icon"><CreditCard size={16}/></div><div><b>{item.label}</b><small>{item.category} · {item.pocket} · {item.date}</small></div><strong>− {money(item.amount)}</strong></div>
            )) : <div className="mf-order-empty"><CheckCircle2 size={26}/><b>Aucune dépense</b><small>Ajoutez-la au moment où vous payez.</small></div>}
          </div>
        </section>
      )}

      {view === "cash" && (
        <section className="mf-finance-panel">
          <div className="mf-finance-panel-head"><div><span className="mf-eyebrow">Argent disponible</span><h2>Mes caisses</h2><p>Chaque compte est séparé pour éviter de mélanger l’argent.</p></div></div>
          <div className="mf-pocket-grid">
            {financePockets.map(pocket => <div className="mf-pocket mf-pocket-large" key={pocket.name}><WalletCards size={19}/><div><b>{pocket.name}</b><strong>{money(pocket.amount)}</strong><small>solde actuel</small></div></div>)}
          </div>
          <div className="mf-card mf-finance-tip"><CircleDollarSign size={18}/><div><b>À retenir</b><p>Un transfert entre deux caisses ne doit pas être compté comme une dépense. C’est toujours votre argent.</p></div></div>
        </section>
      )}

      {view === "assets" && (
        <section className="mf-finance-panel">
          <div className="mf-finance-panel-head"><div><span className="mf-eyebrow">Patrimoine</span><h2>Matériel</h2><p>Le matériel coûte de l’argent à l’achat, puis son coût est réparti dans le temps.</p></div><button className="mf-secondary" onClick={() => setAssetOpen(true)}><Plus size={17}/> Ajouter</button></div>
          <div className="mf-asset-list">
            {assets.map(asset => <div className="mf-asset-row" key={asset.id}><div className="mf-expense-icon"><Wrench size={16}/></div><div><b>{asset.name}</b><small>{money(asset.amount)} · {asset.years} ans</small></div><strong>{money(Math.round(asset.amount / (asset.years * 12)))}/mois</strong></div>)}
          </div>
          <div className="mf-card mf-finance-tip"><CircleDollarSign size={18}/><div><b>Amortissement</b><p>Ce montant mesure le coût du matériel sur sa durée d’utilisation. Il ne retire pas cette somme de la caisse chaque mois.</p><strong>{money(Math.round(depreciationMonthly))}/mois au total</strong></div></div>
          <div className="mf-card mf-automation-card"><div className="mf-card-head"><div><span className="mf-eyebrow">Automatisation</span><h3>Fondé 44 travaille derrière</h3></div><span className="mf-treasury-status"><Zap size={15}/> Automatique</span></div><div className="mf-automation-grid"><div><RefreshCw size={18}/><div><b>Dépenses récurrentes</b><small>Préparer les échéances sans les confondre avec les paiements réels.</small></div></div><div><Package size={18}/><div><b>Stock → production</b><small>Relier les matières consommées au coût de production.</small></div></div><div><CircleDollarSign size={18}/><div><b>Paiements → trésorerie</b><small>Créer le mouvement financier après confirmation.</small></div></div><div><Bell size={18}/><div><b>Alertes</b><small>Signaler stock faible ou anomalie de caisse.</small></div></div></div></div>
        </section>
      )}

      {expenseOpen && (
        <div className="mf-modal-backdrop" onClick={() => setExpenseOpen(false)}>
          <section className="mf-modal mf-expense-modal" onClick={event => event.stopPropagation()}>
            <button className="mf-modal-close" onClick={() => setExpenseOpen(false)} aria-label="Fermer"><X size={18}/></button>
            <span className="mf-eyebrow">Dépense du jour</span><h2>Qu’avez-vous payé ?</h2><p>Quelques secondes. Les calculs se font automatiquement.</p>
            <div className="mf-expense-quick"><span className="mf-eyebrow">Souvent utilisé</span><div>
              {[["Mil","Matières premières"],["Pots","Emballage"],["Transport","Transport"],["Lait caillé","Matières premières"]].map(([label,category]) => <button className="mf-filter" key={label} onClick={() => { setExpenseLabel(label); setExpenseCategory(category); }}>{label}</button>)}
            </div></div>
            <label className="mf-field"><span>Pour quoi ?</span><input autoFocus value={expenseLabel} onChange={event => setExpenseLabel(event.target.value)} placeholder="Ex. achat de mil"/></label>
            <label className="mf-field"><span>Montant</span><input inputMode="numeric" type="number" min="0" value={expenseAmount} onChange={event => setExpenseAmount(event.target.value)} placeholder="FCFA"/></label>
            <label className="mf-field"><span>Payé avec</span><select value={expensePocket} onChange={event => setExpensePocket(event.target.value)}>{financePockets.map(pocket => <option key={pocket.name}>{pocket.name}</option>)}</select></label>
            <label className="mf-field"><span>Catégorie</span><select value={expenseCategory} onChange={event => setExpenseCategory(event.target.value)}><option>Matières premières</option><option>Transport</option><option>Emballage</option><option>Électricité / eau</option><option>Communication</option><option>Autre</option></select></label>
            {selectedPocket && <small className="mf-field-hint">Disponible : {money(selectedPocket.amount)}</small>}
            {insufficientFunds && <small className="mf-field-error">Cette caisse ne contient pas assez d’argent.</small>}
            <button className="mf-primary" disabled={!expenseLabel.trim() || expenseAmountNumber <= 0 || insufficientFunds} onClick={addExpense}>Enregistrer la dépense</button>
          </section>
        </div>
      )}

      {assetOpen && (
        <div className="mf-modal-backdrop" onClick={() => setAssetOpen(false)}>
          <section className="mf-modal mf-expense-modal" onClick={event => event.stopPropagation()}>
            <button className="mf-modal-close" onClick={() => setAssetOpen(false)} aria-label="Fermer"><X size={18}/></button>
            <span className="mf-eyebrow">Matériel</span><h2>Ajouter un équipement</h2><p>Fondé 44 suivra sa valeur et son amortissement sans compliquer l'écran principal.</p>
            <label className="mf-field"><span>Équipement</span><input autoFocus value={assetName} onChange={event => setAssetName(event.target.value)} placeholder="Ex. congélateur"/></label>
            <label className="mf-field"><span>Prix d'achat</span><input type="number" min="0" value={assetAmount} onChange={event => setAssetAmount(event.target.value)} placeholder="FCFA"/></label>
            <label className="mf-field"><span>Durée estimée</span><input type="number" min="1" value={assetYears} onChange={event => setAssetYears(event.target.value)} placeholder="Années"/></label>
            <button className="mf-primary" disabled={!assetName.trim() || Number(assetAmount) <= 0 || Number(assetYears) <= 0} onClick={addAsset}>Enregistrer l'équipement</button>
          </section>
        </div>
      )}
    </section>
  );
}
