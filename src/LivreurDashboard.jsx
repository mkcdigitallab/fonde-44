import React, { useMemo, useState } from "react";
import {
  ArrowLeft, Bell, Check, ChevronRight, Clock3, MapPin, Moon,
  Navigation, Package, Sun, Truck, UserCircle
} from "lucide-react";

const initialDeliveries = [
  { id:"FD-2047", client:"Moussa Diop", address:"Dakar", time:"11:00", items:"2 Fondé + 1 Thiakry", amount:700, status:"À récupérer" },
  { id:"FD-2045", client:"Awa Fall", address:"Dakar", time:"10:15", items:"4 pots de Fondé", amount:800, status:"En route" }
];

const steps = ["À récupérer", "En route", "Arrivé", "Livrée"];

function nextStatus(status) {
  const index = steps.indexOf(status);
  return index < steps.length - 1 ? steps[index + 1] : status;
}

function actionLabel(status) {
  if (status === "À récupérer") return "J’ai récupéré la commande";
  if (status === "En route") return "Je suis arrivé";
  if (status === "Arrivé") return "Confirmer la livraison";
  return "Livraison terminée";
}

export default function LivreurDashboard({ theme = "dark", onToggleTheme, onExit }) {
  const [tab, setTab] = useState("accueil");
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [toast, setToast] = useState("");

  const active = deliveries.filter(item => item.status !== "Livrée");
  const next = active[0];

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function advance(item) {
    const status = nextStatus(item.status);
    if (status === item.status) return;
    setDeliveries(list => list.map(x => x.id === item.id ? { ...x, status } : x));
    notify(status === "Livrée" ? "Livraison confirmée." : item.id + " · " + status + ".");
  }

  return (
    <div className={"mf-app mf-theme-" + theme + " driver-app"}>
      <aside className="mf-sidebar">
        <button className="mf-brand" onClick={() => setTab("accueil")}><span>F</span><strong>Fondé 44</strong></button>
        <div className="mf-role-card"><Truck size={18}/><div><b>Espace Livreur</b><small>Vos missions du jour</small></div></div>
        <nav className="mf-sidebar-nav">
          {[["accueil","Accueil",Truck],["missions","Missions",Package],["historique","Historique",Clock3]].map(([id,label,Icon]) =>
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={18}/><span>{label}</span>{id === "missions" && active.length > 0 && <em>{active.length}</em>}</button>
          )}
        </nav>
        <button className="mf-exit" onClick={onExit}><ArrowLeft size={16}/> Quitter l’espace livreur</button>
      </aside>

      <div className="mf-main">
        <header className="mf-topbar">
          <div><span className="mf-eyebrow">Espace Livreur</span><b>Fondé 44</b></div>
          <div className="mf-top-actions">
            <button className="mf-icon" onClick={onToggleTheme} aria-label="Changer de thème">{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>
            <button className="mf-icon" onClick={() => notify("Aucune nouvelle notification")} aria-label="Notifications"><Bell size={18}/></button>
            <button className="mf-user"><UserCircle size={17}/><span>Livreur</span></button>
          </div>
        </header>

        <nav className="mf-mobile-nav">
          <div className="mf-mobile-nav-track">
            {[["accueil","Accueil",Truck],["missions","Missions",Package],["historique","Historique",Clock3]].map(([id,label,Icon]) =>
              <button key={id} className={tab === id ? "mf-mobile-nav-item active" : "mf-mobile-nav-item"} onClick={() => setTab(id)}><Icon size={17}/><span>{label}</span>{id === "missions" && active.length > 0 && <em>{active.length}</em>}</button>
            )}
          </div>
        </nav>

        <main className="mf-driver-content">
          {tab === "accueil" && <DriverHome next={next} active={active} onMissions={() => setTab("missions")} onAdvance={advance}/>}
          {tab === "missions" && <DriverMissions items={deliveries} onBack={() => setTab("accueil")} onAdvance={advance}/>}
          {tab === "historique" && <DriverHistory items={deliveries} />}
        </main>
      </div>

      {toast && <div className="toast"><Check size={18}/>{toast}</div>}
    </div>
  );
}

function MissionProgress({ status }) {
  const current = steps.indexOf(status);
  return <div className="driver-progress" aria-label={"Étape " + (current + 1) + " sur " + steps.length}>
    {steps.map((step, index) => <div className={index <= current ? "active" : ""} key={step}><span>{index < current ? <Check size={12}/> : index + 1}</span><small>{step}</small></div>)}
  </div>;
}

function DriverHome({ next, active, onMissions, onAdvance }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return <section className="mf-screen driver-screen">
    <div className="driver-heading">
      <div><span className="mf-eyebrow">Aujourd’hui · {active.length} mission{active.length > 1 ? "s" : ""}</span><h1>{greeting}, Livreur.</h1><p>Une seule mission à la fois. Le prochain geste est toujours visible.</p></div>
      <button className="mf-primary driver-outline-action" onClick={onMissions}><Package size={18}/> Mes missions</button>
    </div>

    {next ? <section className="driver-hero">
      <div className="driver-hero-label"><span>PROCHAINE MISSION</span><b>{next.status}</b></div>
      <div className="driver-order-id">{next.id}</div>
      <div className="driver-client"><div className="driver-avatar">{next.client.charAt(0)}</div><div><h2>{next.client}</h2><p>{next.items}</p></div></div>
      <div className="driver-route">
        <div><MapPin size={18}/><div><small>Livrer à</small><strong>{next.address}</strong></div></div>
        <div><Clock3 size={18}/><div><small>Créneau</small><strong>{next.time}</strong></div></div>
      </div>
      <MissionProgress status={next.status}/>
      <button className="mf-primary driver-main-action" onClick={() => onAdvance(next)}>
        {actionLabel(next.status)} <ChevronRight size={18}/>
      </button>
      {next.status === "En route" && <div className="driver-route-note"><Navigation size={16}/><span>Quand vous êtes prêt, utilisez votre navigation habituelle pour rejoindre le client.</span></div>}
      {next.status === "Arrivé" && <div className="driver-route-note"><Check size={16}/><span>Vérifiez le client et la commande avant de confirmer la remise.</span></div>}
    </section> : <section className="driver-complete"><Check size={30}/><h2>Journée terminée</h2><p>Toutes vos livraisons du jour sont confirmées.</p><button className="mf-secondary" onClick={onMissions}>Voir l’historique des missions</button></section>}

    <section className="driver-stats">
      <div><b>{active.length}</b><span>À terminer</span></div>
      <div><b>{active.filter(x => x.status === "À récupérer").length}</b><span>À récupérer</span></div>
      <div><b>{active.filter(x => x.status === "En route" || x.status === "Arrivé").length}</b><span>En livraison</span></div>
    </section>
  </section>;
}

function DriverMissions({ items, onBack, onAdvance }) {
  return <section className="mf-screen driver-screen">
    <div className="mf-screen-header"><button className="mf-back" onClick={onBack} aria-label="Retour"><ArrowLeft size={18}/></button><div><span className="mf-eyebrow">Terrain</span><h1>Mes missions</h1><p>Les commandes à prendre en charge aujourd’hui.</p></div></div>
    <section className="mf-card driver-mission-card">
      {items.map(item => {
        const done = item.status === "Livrée";
        return <article className={done ? "driver-mission done" : "driver-mission"} key={item.id}>
          <div className="driver-icon"><Package size={18}/></div>
          <div className="driver-mission-main">
            <div><b>{item.id} · {item.client}</b><span>{item.time}</span></div>
            <small>{item.items} · {item.address}</small>
            <span className={done ? "mf-status ready" : "mf-status"}>{item.status}</span>
          </div>
          {!done && <button className="mf-secondary small" onClick={() => onAdvance(item)}>{actionLabel(item.status)}</button>}
          {done && <Check size={20} className="driver-check"/>}
        </article>;
      })}
    </section>
  </section>;
}

function DriverHistory({ items }) {
  const delivered = useMemo(() => items.filter(item => item.status === "Livrée"), [items]);
  return <section className="mf-screen driver-screen">
    <div className="mf-screen-header"><div><span className="mf-eyebrow">Terminé</span><h1>Historique</h1><p>Les livraisons déjà confirmées.</p></div></div>
    <section className="mf-card driver-mission-card">
      {delivered.length ? delivered.map(item => <div className="driver-history-row" key={item.id}><Check size={18}/><div><b>{item.id} · {item.client}</b><small>{item.address} · {item.items}</small></div><span>Livrée</span></div>) : <div className="driver-empty"><Clock3 size={22}/><b>Aucune livraison terminée</b><span>Les livraisons terminées apparaîtront ici.</span></div>}
    </section>
  </section>;
}
