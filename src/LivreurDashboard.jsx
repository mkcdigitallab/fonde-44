import React, { useMemo, useState } from "react";
import {
  ArrowLeft, Bell, Check, ChevronRight, CircleHelp, Clock3,
  MapPin, Moon, Package, Phone, Sun, Truck, UserCircle
} from "lucide-react";

const initialDeliveries = [
  { id: "FD-2047", client: "Moussa Diop", address: "Dakar", time: "11:00", items: "2 Fondé + 1 Thiakry", amount: 700, status: "À récupérer" },
  { id: "FD-2045", client: "Awa Fall", address: "Dakar", time: "10:15", items: "4 pots de Fondé", amount: 800, status: "En route" }
];

function money(value) {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
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
    const nextStatus = item.status === "À récupérer" ? "En route" : "Livrée";
    setDeliveries(list => list.map(x => x.id === item.id ? { ...x, status: nextStatus } : x));
    notify(nextStatus === "Livrée" ? `${item.id} · Livraison confirmée.` : `${item.id} récupérée. Bon trajet.`);
  }

  return (
    <div className={`mf-app mf-theme-${theme} driver-app`}>
      <aside className="mf-sidebar">
        <button className="mf-brand" onClick={() => setTab("accueil")}><span>F</span><strong>Fondé 44</strong></button>
        <div className="mf-role-card"><Truck size={18}/><div><b>Espace Livreur</b><small>Mission du jour</small></div></div>
        <nav className="mf-sidebar-nav">
          {[["accueil","Accueil",Truck],["missions","Missions",Package],["historique","Historique",Clock3]].map(([id,label,Icon]) =>
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={18}/><span>{label}</span>{id === "missions" && active.length > 0 && <em>{active.length}</em>}</button>
          )}
        </nav>
        <button className="mf-exit" onClick={onExit}><ArrowLeft size={16}/> Quitter l’espace livreur</button>
      </aside>

      <div className="mf-main">
        <header className="mf-topbar">
          <div><span className="mf-eyebrow">Livreur</span><b>Fondé 44</b></div>
          <div className="mf-top-actions">
            <button className="mf-icon" onClick={onToggleTheme} aria-label="Changer de thème">{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>
            <button className="mf-icon" onClick={() => notify("Aucune nouvelle notification")} aria-label="Notifications"><Bell size={18}/></button>
            <button className="mf-user"><UserCircle size={17}/><span>Liv​reur</span></button>
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

function DriverHome({ next, active, onMissions, onAdvance }) {
  const greeting = new Date().getHours() < 12 ? "Bonjour" : new Date().getHours() < 18 ? "Bon après-midi" : "Bonsoir";
  return <section className="mf-screen driver-screen">
    <div className="mf-welcome">
      <div><span className="mf-eyebrow">Aujourd’hui · Livraisons</span><h1>{greeting} Livreur.</h1><p>Une mission à la fois. Voici ce qui doit être fait maintenant.</p></div>
      <button className="mf-primary" onClick={onMissions}><Package size={18}/> Voir mes missions</button>
    </div>

    <section className="driver-next">
      <div className="driver-next-top"><span className="mf-eyebrow">À faire maintenant</span>{next && <span className="mf-status">{next.status}</span>}</div>
      {next ? <>
        <div className="driver-next-main"><div className="driver-icon"><Truck size={22}/></div><div><b>{next.id} · {next.client}</b><small>{next.items} · {next.address} · {next.time}</small></div></div>
        <div className="driver-next-meta"><span><MapPin size={15}/> {next.address}</span><strong>{money(next.amount)}</strong></div>
        <button className="mf-primary full" onClick={() => onAdvance(next)}>{next.status === "À récupérer" ? "Confirmer la récupération" : "Confirmer la livraison"} <ChevronRight size={17}/></button>
      </> : <div className="driver-empty"><Check size={25}/><b>Toutes les livraisons sont terminées.</b><span>Vous n’avez plus rien à faire pour le moment.</span></div>}
    </section>

    <section className="driver-stats">
      <div><b>{active.length}</b><span>À suivre</span></div>
      <div><b>{active.filter(x => x.status === "À récupérer").length}</b><span>À récupérer</span></div>
      <div><b>{active.filter(x => x.status === "En route").length}</b><span>En route</span></div>
    </section>

    <section className="driver-principle"><CircleHelp size={18}/><div><b>Votre espace reste simple</b><small>Fondé 44 vous donne la prochaine action. Le trajet, l’adresse et la confirmation client viendront ensuite.</small></div></section>
  </section>;
}

function DriverMissions({ items, onBack, onAdvance }) {
  return <section className="mf-screen driver-screen">
    <div className="mf-screen-header"><button className="mf-back" onClick={onBack} aria-label="Retour"><ArrowLeft size={18}/></button><div><span className="mf-eyebrow">Terrain</span><h1>Missions</h1><p>Vos livraisons, dans l’ordre où vous devez les prendre en charge.</p></div></div>
    <section className="mf-card driver-mission-card">
      <div className="mf-card-head"><div><span className="mf-eyebrow">Aujourd’hui</span><h2>À suivre</h2></div><span className="mf-muted">{items.length} mission{items.length > 1 ? "s" : ""}</span></div>
      <div className="driver-mission-list">{items.map(item => {
        const done = item.status === "Livrée";
        return <article className={done ? "driver-mission done" : "driver-mission"} key={item.id}>
          <div className="driver-icon"><Package size={18}/></div>
          <div className="driver-mission-main"><div><b>{item.id} · {item.client}</b><span>{item.time}</span></div><small>{item.items} · {item.address}</small><span className={done ? "mf-status ready" : "mf-status"}>{item.status}</span></div>
          {!done && <button className="mf-secondary small" onClick={() => onAdvance(item)}>{item.status === "À récupérer" ? "Récupérer" : "Livrée"}</button>}
          {done && <Check size={20} className="driver-check"/>}
        </article>;
      })}</div>
    </section>
  </section>;
}

function DriverHistory({ items }) {
  const delivered = useMemo(() => items.filter(item => item.status === "Livrée"), [items]);
  return <section className="mf-screen driver-screen">
    <div className="mf-screen-header"><div><span className="mf-eyebrow">Terminé</span><h1>Historique</h1><p>Les livraisons déjà effectuées aujourd’hui.</p></div></div>
    <section className="mf-card driver-mission-card">
      {delivered.length ? delivered.map(item => <div className="driver-history-row" key={item.id}><Check size={18}/><div><b>{item.id} · {item.client}</b><small>{item.address} · {money(item.amount)}</small></div><span>Livrée</span></div>) : <div className="driver-empty"><Clock3 size={22}/><b>Aucune livraison terminée</b><span>Les livraisons terminées apparaîtront ici.</span></div>}
    </section>
  </section>;
}
