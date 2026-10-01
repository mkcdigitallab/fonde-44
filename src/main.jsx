import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft, ArrowRight, Bell, CalendarDays, Check, ChevronRight, Clock3,
  CreditCard, Heart, Home, MapPin, Menu, Mic, Minus, Package, Pause, Phone,
  Plus, RotateCcw, Search, ShoppingBag, Sparkles, Truck, UserRound, Volume2,
  WalletCards, X, Utensils, CircleHelp, Sun, Moon
} from "lucide-react";
import "./styles.css";

const products = [
  {
    id: "fonde",
    name: "Fondé",
    subtitle: "Mil traditionnel, préparé du jour",
    price: 200,
    unit: "pot",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=85",
    badge: "Le classique",
    description: "Une préparation de mil douce et réconfortante, préparée chaque jour par Mère Fondé."
  },
  {
    id: "thiakry",
    name: "Thiakry",
    subtitle: "Mil & lait caillé, frais",
    price: 300,
    unit: "pot",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=85",
    badge: "Très demandé",
    description: "Un thiakry généreux et frais, idéal le matin, en dessert ou pour une pause gourmande."
  },
  {
    id: "poudre",
    name: "Poudre de mil",
    subtitle: "Pour vos préparations maison",
    price: 1500,
    unit: "kg",
    image: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=1200&q=85",
    badge: "Maison",
    description: "Poudre de mil préparée avec soin pour vos bouillies et recettes à la maison."
  }
];

const mockOrders = [
  { id: "FD-2048", date: "Aujourd’hui · 18:42", items: "3 pots · 2 Fondé + 1 Thiakry", total: 700, status: "En préparation", tone: "amber" },
  { id: "FD-1994", date: "Hier · 19:10", items: "4 pots · 2 Fondé + 2 Thiakry", total: 1000, status: "Livrée", tone: "green" },
  { id: "FD-1882", date: "28 sept. · 20:04", items: "3 pots · 3 Fondé", total: 600, status: "Livrée", tone: "green" }
];

const navItems = [
  { id: "home", label: "Accueil", icon: Home },
  { id: "shop", label: "Commander", icon: ShoppingBag },
  { id: "orders", label: "Commandes", icon: Package },
  { id: "profile", label: "Profil", icon: UserRound }
];

function money(value) {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
}

function App() {
  const [screen, setScreen] = useState("home");
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("fonde44-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  const [cart, setCart] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [delivery, setDelivery] = useState("delivery");
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [toast, setToast] = useState("");
  const [favorite, setFavorite] = useState([]);
  const [subscription, setSubscription] = useState(true);
  const [address, setAddress] = useState("Liberté 6, Dakar");
  const [payment, setPayment] = useState("wave");
  const [eventOpen, setEventOpen] = useState(false);

  function toggleTheme() {
    setTheme(current => {
      const next = current === "dark" ? "light" : "dark";
      try { localStorage.setItem("fonde44-theme", next); } catch {}
      return next;
    });
  }

  const filtered = useMemo(
    () => products.filter(p => `${p.name} ${p.subtitle}`.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const cartCount = cart.reduce((n, x) => n + x.qty, 0);
  const subtotal = cart.reduce((n, x) => n + x.price * x.qty, 0);
  const eligibleDelivery = cartCount >= 3;
  const deliveryFee = delivery === "delivery" && eligibleDelivery ? 500 : 0;
  const total = subtotal + deliveryFee;

  function notify(message) {
    setToast(message);
    window.clearTimeout(window.__fondeToast);
    window.__fondeToast = window.setTimeout(() => setToast(""), 2600);
  }

  function add(product, qty = 1) {
    setCart(current => {
      const found = current.find(x => x.id === product.id);
      if (found) return current.map(x => x.id === product.id ? { ...x, qty: x.qty + qty } : x);
      return [...current, { ...product, qty }];
    });
    notify(`${product.name} ajouté au panier`);
  }

  function changeQty(id, delta) {
    setCart(current => current
      .map(x => x.id === id ? { ...x, qty: x.qty + delta } : x)
      .filter(x => x.qty > 0)
    );
  }

  function go(screenName) {
    setScreen(screenName);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className={`app-shell theme-${theme}`} data-theme={theme}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <button className="brand" onClick={() => go("home")} aria-label="Accueil Fondé 44">
          <span className="brand-mark">F</span>
          <span><b>Fondé</b> 44</span>
        </button>
        <div className="top-actions">
          <button className="icon-button" onClick={toggleTheme} aria-label={theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"} title={theme === "dark" ? "Mode clair" : "Mode sombre"}>
            {theme === "dark" ? <Sun size={19}/> : <Moon size={19}/>}
          </button>
          <button className="icon-button" onClick={() => notify("Aucune nouvelle notification")}><Bell size={19}/></button>
          <button className="cart-pill" onClick={() => go("cart")}><ShoppingBag size={18}/><span>{cartCount}</span></button>
        </div>
      </header>

      <main className="content">
        {screen === "home" && <HomeScreen onShop={() => go("shop")} onOrders={() => go("orders")} onAdd={add} favorite={favorite} setFavorite={setFavorite} onSubscription={() => go("subscription")} onEvent={() => setEventOpen(true)} />}
        {screen === "shop" && <ShopScreen products={filtered} search={search} setSearch={setSearch} onBack={() => go("home")} onSelect={setSelected} onAdd={add} />}
        {screen === "product" && selected && <ProductScreen product={selected} onBack={() => go("shop")} onAdd={add} />}
        {screen === "cart" && <CartScreen cart={cart} onBack={() => go("shop")} onChange={changeQty} delivery={delivery} setDelivery={setDelivery} eligibleDelivery={eligibleDelivery} subtotal={subtotal} deliveryFee={deliveryFee} total={total} onCheckout={() => { if (!cart.length) return notify("Votre panier est vide"); setCheckoutStep(0); go("checkout"); }} />}
        {screen === "checkout" && <CheckoutScreen step={checkoutStep} setStep={setCheckoutStep} delivery={delivery} setDelivery={setDelivery} eligibleDelivery={eligibleDelivery} address={address} setAddress={setAddress} payment={payment} setPayment={setPayment} total={total} cart={cart} onBack={() => go("cart")} onDone={() => { setCart([]); go("tracking"); notify("Commande confirmée"); }} />}
        {screen === "tracking" && <TrackingScreen onHome={() => go("home")} />}
        {screen === "orders" && <OrdersScreen onBack={() => go("home")} onReorder={() => { add(products[0], 2); add(products[1], 1); go("cart"); }} />}
        {screen === "profile" && <ProfileScreen address={address} setAddress={setAddress} subscription={subscription} setSubscription={setSubscription} onBack={() => go("home")} onSubscription={() => go("subscription")} />}
        {screen === "subscription" && <SubscriptionScreen active={subscription} setActive={setSubscription} onBack={() => go("profile")} onAdd={() => { add(products[0], 2); add(products[1], 1); notify("Les prochaines quantités ont été préparées"); }} />}
      </main>

      <nav className="bottom-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = screen === item.id || (item.id === "shop" && ["product","cart","checkout"].includes(screen));
          return <button key={item.id} className={active ? "nav-item active" : "nav-item"} onClick={() => go(item.id)}>
            <Icon size={20}/><span>{item.label}</span>
          </button>
        })}
      </nav>

      {eventOpen && <EventModal onClose={() => setEventOpen(false)} onSubmit={() => { setEventOpen(false); notify("Demande événement enregistrée"); }} />}
      {toast && <div className="toast"><Check size={18}/>{toast}</div>}
    </div>
  );
}

function HomeScreen({ onShop, onOrders, onAdd, favorite, setFavorite, onSubscription, onEvent }) {
  return <div className="stack">
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow"><Sparkles size={14}/> Préparé aujourd’hui</span>
        <h1>Le bon goût du mil,<br/><em>chez vous.</em></h1>
        <p>Fondé et thiakry préparés avec soin par Mère Fondé, livrés à Dakar.</p>
        <div className="hero-actions">
          <button className="primary" onClick={onShop}>Commander <ArrowRight size={18}/></button>
          <button className="voice" onClick={() => alert("Mode vocal : bientôt disponible")}><Mic size={18}/><span>Commander par voix</span></button>
        </div>
      </div>
      <div className="hero-image-wrap">
        <img src={products[1].image} alt="Thiakry" className="hero-image"/>
        <div className="floating-note"><span className="dot"/><div><b>Frais du jour</b><small>Préparé ce matin</small></div></div>
      </div>
    </section>

    <section className="quick-row">
      <button onClick={onShop}><span className="quick-icon"><Truck size={19}/></span><b>Livraison</b><small>Dès 3 pots</small></button>
      <button onClick={onSubscription}><span className="quick-icon"><RotateCcw size={19}/></span><b>Abonnement</b><small>Matin & soir</small></button>
      <button onClick={onEvent}><span className="quick-icon"><CalendarDays size={19}/></span><b>Événement</b><small>Nous contacter</small></button>
    </section>

    <section className="section">
      <div className="section-head"><div><span className="eyebrow">Nos essentiels</span><h2>Choisissez votre envie</h2></div><button className="text-link" onClick={onShop}>Tout voir <ChevronRight size={16}/></button></div>
      <div className="product-grid">
        {products.slice(0,2).map(p => <ProductCard key={p.id} product={p} onAdd={onAdd} favorite={favorite} setFavorite={setFavorite} />)}
      </div>
    </section>

    <section className="dark-card">
      <div><span className="eyebrow muted">Pour vos habitudes</span><h3>Votre fondé,<br/>sans y penser.</h3><p>Programmez vos achats du matin ou du soir et ajustez quand vous voulez.</p><button className="light-button" onClick={onSubscription}>Découvrir l’abonnement <ArrowRight size={16}/></button></div>
      <div className="mini-orbit"><Utensils size={34}/></div>
    </section>

    <section className="section">
      <div className="section-head"><div><span className="eyebrow">Déjà client ?</span><h2>Retrouvez vos commandes</h2></div></div>
      <button className="order-preview" onClick={onOrders}><span className="order-icon"><Package size={21}/></span><div><b>Commande FD-2048</b><small>3 pots · En préparation · Aujourd’hui 18:42</small></div><ChevronRight size={19}/></button>
    </section>
  </div>
}

function ProductCard({ product, onAdd, favorite, setFavorite }) {
  const isFav = favorite.includes(product.id);
  return <article className="product-card">
    <div className="image-box"><img src={product.image} alt={product.name}/><button className={isFav ? "heart active" : "heart"} onClick={() => setFavorite(f => isFav ? f.filter(x => x !== product.id) : [...f, product.id])}><Heart size={17} fill={isFav ? "currentColor" : "none"}/></button><span className="badge">{product.badge}</span></div>
    <div className="product-info"><div><h3>{product.name}</h3><p>{product.subtitle}</p></div><strong>{money(product.price)}</strong></div>
    <button className="add-button" onClick={() => onAdd(product)}><Plus size={18}/> Ajouter</button>
  </article>
}

function ShopScreen({ products, search, setSearch, onBack, onSelect, onAdd }) {
  return <div className="stack">
    <div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Catalogue</span><h1>Commander</h1></div><button className="icon-button"><CircleHelp size={19}/></button></div>
    <div className="search-box"><Search size={19}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher fondé, thiakry..." /></div>
    <div className="filter-row"><span className="filter active">Tout</span><span className="filter">Fondé</span><span className="filter">Thiakry</span><span className="filter">Maison</span></div>
    <div className="catalog-list">{products.map(p => <article className="catalog-card" key={p.id} onClick={() => onSelect(p)}>
      <img src={p.image} alt={p.name}/><div className="catalog-copy"><span className="tiny-badge">{p.badge}</span><h3>{p.name}</h3><p>{p.subtitle}</p><strong>{money(p.price)} <small>/ {p.unit}</small></strong></div><button className="round-add" onClick={e => { e.stopPropagation(); onAdd(p); }}><Plus size={19}/></button>
    </article>)}</div>
    {!products.length && <div className="empty"><Search size={28}/><h3>Aucun produit trouvé</h3><p>Essayez un autre mot.</p></div>}
  </div>
}

function ProductScreen({ product, onBack, onAdd }) {
  const [qty, setQty] = useState(1);
  return <div className="stack">
    <div className="product-detail-image"><img src={product.image} alt={product.name}/><button className="floating-back" onClick={onBack}><ArrowLeft size={20}/></button><span className="badge detail-badge">{product.badge}</span></div>
    <div className="detail-content"><span className="eyebrow">Préparé avec soin</span><div className="detail-title"><div><h1>{product.name}</h1><p>{product.subtitle}</p></div><strong>{money(product.price)}</strong></div><p className="detail-description">{product.description}</p>
      <div className="info-strip"><div><Clock3 size={18}/><span>Préparé du jour</span></div><div><Package size={18}/><span>Qualité maison</span></div><div><Truck size={18}/><span>Livraison</span></div></div>
      <div className="qty-line"><div><b>Quantité</b><small>{product.unit}</small></div><div className="stepper"><button onClick={() => setQty(Math.max(1, qty-1))}><Minus size={16}/></button><b>{qty}</b><button onClick={() => setQty(qty+1)}><Plus size={16}/></button></div></div>
      <button className="primary full" onClick={() => onAdd(product, qty)}>Ajouter au panier · {money(product.price*qty)} <ShoppingBag size={18}/></button>
    </div>
  </div>
}

function CartScreen({ cart, onBack, onChange, delivery, setDelivery, eligibleDelivery, subtotal, deliveryFee, total, onCheckout }) {
  return <div className="stack">
    <div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Votre sélection</span><h1>Panier</h1></div></div>
    {!cart.length ? <div className="empty large"><ShoppingBag size={35}/><h2>Votre panier est vide</h2><p>Ajoutez quelques pots préparés du jour.</p><button className="primary" onClick={onBack}>Voir les produits</button></div> :
      <>
        <div className="cart-list">{cart.map(item => <div className="cart-item" key={item.id}><img src={item.image} alt={item.name}/><div className="cart-main"><b>{item.name}</b><small>{money(item.price)} / {item.unit}</small><div className="cart-bottom"><strong>{money(item.price*item.qty)}</strong><div className="stepper small"><button onClick={() => onChange(item.id,-1)}><Minus size={14}/></button><b>{item.qty}</b><button onClick={() => onChange(item.id,1)}><Plus size={14}/></button></div></div></div></div>)}</div>
        <div className="delivery-choice"><div className="section-head"><div><span className="eyebrow">Réception</span><h2>Comment voulez-vous recevoir ?</h2></div></div>
          <div className="choice-grid"><button className={delivery==="delivery" ? "choice active" : "choice"} onClick={() => setDelivery("delivery")}><Truck size={20}/><b>Livraison</b><small>{eligibleDelivery ? "500 FCFA" : "À partir de 3 pots"}</small></button><button className={delivery==="pickup" ? "choice active" : "choice"} onClick={() => setDelivery("pickup")}><MapPin size={20}/><b>Retrait</b><small>Gratuit</small></button></div>
        </div>
        <div className="summary"><div><span>Sous-total</span><b>{money(subtotal)}</b></div><div><span>Livraison</span><b>{deliveryFee ? money(deliveryFee) : "—"}</b></div><div className="total"><span>Total</span><strong>{money(total)}</strong></div></div>
        <button className="primary full" onClick={onCheckout}>Continuer <ArrowRight size={18}/></button>
      </>}
  </div>
}

function CheckoutScreen({ step, setStep, delivery, setDelivery, eligibleDelivery, address, setAddress, payment, setPayment, total, cart, onBack, onDone }) {
  const steps = ["Réception", "Adresse", "Paiement"];
  if (step === 3) return <div className="success-screen"><div className="success-icon"><Check size={32}/></div><span className="eyebrow">C’est confirmé</span><h1>Votre commande est confirmée.</h1><p>Nous préparons votre commande. Vous pourrez suivre son évolution à tout moment.</p><button className="primary" onClick={onDone}>Suivre la commande <ArrowRight size={18}/></button></div>;
  return <div className="stack">
    <div className="page-head"><button className="back" onClick={() => step === 0 ? onBack() : setStep(step-1)}><ArrowLeft size={20}/></button><div><span className="eyebrow">Commande</span><h1>{steps[step]}</h1></div></div>
    <div className="progress">{steps.map((s,i)=><div key={s} className={i<=step ? "progress-dot active" : "progress-dot"}><span>{i+1}</span><small>{s}</small></div>)}</div>
    {step===0 && <div className="stack compact"><button disabled={!eligibleDelivery} className={delivery==="delivery" ? "big-choice active" : "big-choice"} onClick={() => eligibleDelivery && setDelivery("delivery")}><Truck size={23}/><div><b>Livraison à domicile</b><small>{eligibleDelivery ? "500 FCFA · minimum 3 pots" : "Disponible à partir de 3 pots"}</small></div>{eligibleDelivery && delivery==="delivery" && <Check size={19}/>}</button><button className={delivery==="pickup" ? "big-choice active" : "big-choice"} onClick={() => setDelivery("pickup")}><MapPin size={23}/><div><b>Retrait</b><small>Gratuit</small></div>{delivery==="pickup" && <Check size={19}/>}</button><button className="primary full" onClick={() => setStep(1)}>Continuer</button></div>
    {step===1 && <div className="stack compact">{delivery === "delivery" ? <><label className="field"><span>Adresse de livraison</span><div className="input-icon"><MapPin size={18}/><input value={address} onChange={e=>setAddress(e.target.value)} /></div></label><div className="map-placeholder"><MapPin size={28}/><b>Votre zone</b><small>Dakar · position approximative</small></div></> : <div className="pickup-note"><MapPin size={24}/><div><b>Retrait sur place</b><small>Vous récupérerez la commande directement. Aucune adresse de livraison n'est nécessaire.</small></div></div>}<button className="primary full" onClick={() => setStep(2)}>Continuer</button></div>
    {step===2 && <div className="stack compact"><div className="payment-list">{[["wave","Wave","Paiement mobile"],["om","Orange Money","Paiement mobile"],["cash","Espèces","À la livraison"]].map(([id,name,desc])=><button key={id} className={payment===id ? "payment active" : "payment"} onClick={()=>setPayment(id)}><span className={"payment-logo "+id}>{id==="wave"?"W":id==="om"?"O":"₣"}</span><div><b>{name}</b><small>{desc}</small></div>{payment===id && <Check size={19}/>}</button>)}</div><div className="summary"><div className="total"><span>À payer</span><strong>{money(total)}</strong></div></div><button className="primary full" onClick={() => setStep(3)}>Confirmer la commande <Check size={18}/></button></div>}
  </div>
}

function TrackingScreen({ onHome }) {
  return <div className="stack">
    <div className="page-head"><button className="back" onClick={onHome}><ArrowLeft size={20}/></button><div><span className="eyebrow">Commande FD-2048</span><h1>En préparation</h1></div></div>
    <div className="tracking-card"><div className="tracking-hero"><Package size={30}/><div><b>3 pots</b><small>2 Fondé · 1 Thiakry</small></div><span className="status amber">En préparation</span></div><div className="timeline"><Track label="Commande confirmée" time="18:42" done/><Track label="Préparation par Mère Fondé" time="En cours" done current/><Track label="Prise en charge" time="À venir"/><Track label="Livraison" time="À venir"/></div></div>
    <div className="address-card"><MapPin size={20}/><div><small>Livraison à</small><b>Liberté 6, Dakar</b></div><button><Phone size={17}/></button></div>
    <button className="secondary full" onClick={onHome}>Retour à l’accueil</button>
  </div>
}
function Track({label,time,done,current}) {
  return <div className="track-row"><span className={done ? "track-dot done" : "track-dot"}>{done && <Check size={12}/>}</span><div><b>{label}</b><small>{time}</small></div></div>
}

function OrdersScreen({ onBack, onReorder }) {
  return <div className="stack"><div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Votre historique</span><h1>Commandes</h1></div></div><div className="order-list">{mockOrders.map(o=><article className="order-card" key={o.id}><div className="order-top"><b>{o.id}</b><span className={"status "+o.tone}>{o.status}</span></div><p>{o.items}</p><div className="order-bottom"><span>{o.date}</span><strong>{money(o.total)}</strong></div><button className="secondary full" onClick={onReorder}><RotateCcw size={16}/> Commander à nouveau</button></article>)}</div></div>
}

function ProfileScreen({ address, setAddress, subscription, setSubscription, onBack, onSubscription }) {
  return <div className="stack"><div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Votre espace</span><h1>Profil</h1></div></div>
    <div className="profile-card"><div className="avatar">MK</div><div><b>Malang</b><small>Client Fondé 44</small></div><button className="icon-button"><ChevronRight size={18}/></button></div>
    <div className="settings-list">
      <div className="setting"><MapPin size={19}/><div><b>Adresse principale</b><small>{address}</small></div><button onClick={()=>{const a=prompt("Nouvelle adresse",address); if(a) setAddress(a)}}><ChevronRight size={18}/></button></div>
      <div className="setting"><RotateCcw size={19}/><div><b>Mon abonnement</b><small>{subscription ? "Matin + soir · actif" : "Aucun abonnement actif"}</small></div><button onClick={onSubscription}><ChevronRight size={18}/></button></div>
      <div className="setting"><CreditCard size={19}/><div><b>Moyens de paiement</b><small>Wave · Orange Money · Espèces</small></div><button><ChevronRight size={18}/></button></div>
      <div className="setting"><CircleHelp size={19}/><div><b>Aide & contact</b><small>Une question ? Nous sommes là.</small></div><button><ChevronRight size={18}/></button></div>
    </div>
    <button className="secondary full"><LogOutIcon/> Se déconnecter</button>
  </div>
}
function LogOutIcon(){ return <ArrowLeft size={17}/> }

function SubscriptionScreen({ active, setActive, onBack, onAdd }) {
  return <div className="stack"><div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Achats récurrents</span><h1>Mon abonnement</h1></div></div>
    <div className="subscription-hero"><span className="eyebrow muted">Votre routine</span><h2>Du fondé quand<br/>vous en avez envie.</h2><p>Une règle simple, que vous pouvez modifier, mettre en pause ou arrêter.</p></div>
    <div className="subscription-card"><div className="sub-head"><div><span className="status green">Actif</span><h3>Matin + soir</h3><p>2 Fondé le matin · 2 Fondé le soir</p></div><button className="toggle" onClick={()=>setActive(!active)}><span className={active ? "on" : ""}/></button></div><div className="sub-details"><div><Clock3 size={17}/><span>Tous les jours</span></div><div><WalletCards size={17}/><span>Paiement à chaque commande</span></div></div><div className="sub-actions"><button className="secondary" onClick={()=>notifySimple("Modification bientôt disponible")}>Modifier</button><button className="secondary" onClick={()=>setActive(!active)}>{active ? "Mettre en pause" : "Reprendre"}</button></div></div>
    <div className="next-orders"><div className="section-head"><div><span className="eyebrow">À venir</span><h2>Prochaines commandes</h2></div></div><div className="mini-order"><div><b>Demain · matin</b><small>2 Fondé · 400 FCFA</small></div><ChevronRight size={17}/></div><div className="mini-order"><div><b>Demain · soir</b><small>2 Fondé · 400 FCFA</small></div><ChevronRight size={17}/></div></div>
    <button className="primary full" onClick={onAdd}>Ajouter à mon panier maintenant <ShoppingBag size={18}/></button>
  </div>
}
function notifySimple(msg){ alert(msg); }

function EventModal({ onClose, onSubmit }) {
  const [type,setType]=useState("Baptême");
  return <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={onClose}><X size={19}/></button><span className="eyebrow">Service événement</span><h2>Parlez-nous de votre événement.</h2><p>Pour un baptême, une fête religieuse, une cérémonie familiale ou un autre événement, envoyez-nous les premiers détails.</p><div className="event-types">{["Baptême","Pâques","Cérémonie","Autre"].map(x=><button className={type===x?"selected":""} onClick={()=>setType(x)} key={x}>{x}</button>)}</div><label className="field"><span>Date prévue</span><input type="date"/></label><label className="field"><span>Nombre de personnes</span><input type="number" placeholder="Ex. 80"/></label><label className="field"><span>Votre message</span><textarea placeholder="Dites-nous ce dont vous avez besoin..."/></label><button className="voice full"><Mic size={18}/> Envoyer aussi un message vocal</button><button className="primary full" onClick={onSubmit}>Envoyer la demande <ArrowRight size={18}/></button></div></div>
}

createRoot(document.getElementById("root")).render(<App />);
