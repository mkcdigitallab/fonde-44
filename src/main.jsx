import React, { useEffect, useMemo, useState } from "react";
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
  const [address, setAddress] = useState(() => {
    try { return localStorage.getItem("fonde44-address") || ""; } catch { return ""; }
  });
  const [location, setLocation] = useState(() => {
    try {
      const saved = localStorage.getItem("fonde44-location");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [locationStatus, setLocationStatus] = useState("idle");
  const [payment, setPayment] = useState("wave");
  const [eventOpen, setEventOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [voiceOrder, setVoiceOrder] = useState(null);

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
  const potCount = cart.reduce((n, x) => n + (["fonde", "thiakry"].includes(x.id) ? x.qty : 0), 0);
  const subtotal = cart.reduce((n, x) => n + x.price * x.qty, 0);
  const eligibleDelivery = potCount >= 3;
  const deliveryFee = 0;
  const total = subtotal;

  useEffect(() => {
    if (screen !== "checkout" || delivery !== "delivery" || location || locationStatus === "loading") return;
    if (!("geolocation" in navigator)) {
      setLocationStatus("unavailable");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const nextLocation = {
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
          accuracy: Math.round(coords.accuracy)
        };

        setLocation(nextLocation);
        try { localStorage.setItem("fonde44-location", JSON.stringify(nextLocation)); } catch {}

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nextLocation.latitude}&lon=${nextLocation.longitude}&zoom=18&addressdetails=1`,
            { headers: { Accept: "application/json" } }
          );
          if (!response.ok) throw new Error("reverse geocoding failed");
          const data = await response.json();
          const label = data.display_name || [
            data.address?.road,
            data.address?.suburb || data.address?.neighbourhood,
            data.address?.city || data.address?.town,
            data.address?.country
          ].filter(Boolean).join(", ");

          if (label) {
            setAddress(label);
            try { localStorage.setItem("fonde44-address", label); } catch {}
          }
          setLocationStatus(label ? "ready" : "coordinates");
        } catch {
          setLocationStatus("coordinates");
        }
      },
      error => {
        setLocationStatus(error.code === 1 ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [screen, delivery, location, locationStatus]);

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unavailable");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const nextLocation = {
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
          accuracy: Math.round(coords.accuracy)
        };
        setLocation(nextLocation);
        try { localStorage.setItem("fonde44-location", JSON.stringify(nextLocation)); } catch {}
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nextLocation.latitude}&lon=${nextLocation.longitude}&zoom=18&addressdetails=1`,
            { headers: { Accept: "application/json" } }
          );
          if (!response.ok) throw new Error("reverse geocoding failed");
          const data = await response.json();
          const label = data.display_name || [
            data.address?.road,
            data.address?.suburb || data.address?.neighbourhood,
            data.address?.city || data.address?.town,
            data.address?.country
          ].filter(Boolean).join(", ");
          if (label) {
            setAddress(label);
            try { localStorage.setItem("fonde44-address", label); } catch {}
          }
          setLocationStatus(label ? "ready" : "coordinates");
        } catch {
          setLocationStatus("coordinates");
        }
      },
      error => setLocationStatus(error.code === 1 ? "denied" : "error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  function saveAddress(value) {
    setAddress(value);
    try {
      if (value.trim()) localStorage.setItem("fonde44-address", value.trim());
    } catch {}
  }

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
    notify(`${product.name} ajouté à votre commande`);
  }

  function changeQty(id, delta) {
    setCart(current => current
      .map(x => x.id === id ? { ...x, qty: x.qty + delta } : x)
      .filter(x => x.qty > 0)
    );
    if (delivery === "delivery" && potCount + delta < 3 && cart.find(x => x.id === id)?.id && ["fonde", "thiakry"].includes(id)) {
      setDelivery("pickup");
    }
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
          <button className="cart-pill" onClick={() => go("cart")} aria-label={`Voir ma commande, ${cartCount} article${cartCount > 1 ? "s" : ""}`}><ShoppingBag size={18}/><span>{cartCount}</span></button>
        </div>
      </header>

      <main className="content">
        {screen === "home" && <HomeScreen onShop={() => go("shop")} onVoice={() => go("voice")} onOrders={() => go("orders")} onAdd={add} favorite={favorite} setFavorite={setFavorite} onSubscription={() => go("subscription")} onEvent={() => setEventOpen(true)} />}
        {screen === "voice" && <VoiceOrderScreen onBack={() => go("home")} products={products} onConfirm={(items) => { setCart(items); setDelivery(items.reduce((n, x) => n + (["fonde", "thiakry"].includes(x.id) ? x.qty : 0), 0) >= 3 ? "delivery" : "pickup"); go("cart"); notify("Votre commande a été préparée"); }} />}
        {screen === "shop" && <ShopScreen products={filtered} search={search} setSearch={setSearch} onBack={() => go("home")} onSelect={setSelected} onAdd={add} />}
        {screen === "product" && selected && <ProductScreen product={selected} onBack={() => go("shop")} onAdd={add} />}
        {screen === "cart" && <CartScreen cart={cart} onBack={() => go("shop")} onChange={changeQty} delivery={delivery} setDelivery={setDelivery} eligibleDelivery={eligibleDelivery} subtotal={subtotal} deliveryFee={deliveryFee} total={total} onCheckout={() => {
          if (!cart.length) return notify("Votre commande est vide");
          if (delivery === "delivery" && !eligibleDelivery) {
            setDelivery("pickup");
            return notify("La livraison est disponible à partir de 3 pots");
          }
          setCheckoutStep(0);
          go("checkout");
        }} />}
        {screen === "checkout" && <CheckoutScreen step={checkoutStep} setStep={setCheckoutStep} delivery={delivery} setDelivery={setDelivery} eligibleDelivery={eligibleDelivery} address={address} setAddress={saveAddress} location={location} locationStatus={locationStatus} onLocate={requestLocation} payment={payment} setPayment={setPayment} total={total} cart={cart} onBack={() => go("cart")} onDone={() => {
          setConfirmedOrder({
            id: `FD-${Math.floor(1000 + Math.random() * 9000)}`,
            items: cart.map(({ id, name, qty, price, unit }) => ({ id, name, qty, price, unit })),
            total,
            delivery,
            address: delivery === "delivery" ? address : "Retrait sur place",
            payment
          });
          setCart([]);
          go("tracking");
          notify("Commande confirmée");
        }} />}
        {screen === "tracking" && <TrackingScreen order={confirmedOrder} onHome={() => go("home")} />}
        {screen === "orders" && <OrdersScreen onBack={() => go("home")} onReorder={(order) => {
          order.items.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if (product) add(product, item.qty);
          });
          go("cart");
        }} />}
        {screen === "profile" && <ProfileScreen address={address} setAddress={setAddress} subscription={subscription} setSubscription={setSubscription} onBack={() => go("home")} onSubscription={() => go("subscription")} />}
        {screen === "subscription" && <SubscriptionScreen active={subscription} setActive={setSubscription} onBack={() => go("profile")} onAdd={() => { add(products[0], 4); notify("Votre commande est prête à être vérifiée"); }} />}
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

function HomeScreen({ onShop, onVoice, onOrders, onAdd, favorite, setFavorite, onSubscription, onEvent }) {
  return <div className="stack">
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow"><Sparkles size={14}/> Préparé aujourd’hui</span>
        <h1>Le bon goût du mil,<br/><em>chez vous.</em></h1>
        <p>Fondé et thiakry préparés avec soin par Mère Fondé, livrés à Dakar.</p>
        <div className="hero-actions">
          <button className="primary" onClick={onShop}>Commander <ArrowRight size={18}/></button>
          <button className="voice voice-primary" onClick={onVoice}><Mic size={18}/><span>Commander à la voix</span></button>
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


function VoiceOrderScreen({ onBack, products, onConfirm }) {
  const [status, setStatus] = useState("ready");
  const [transcript, setTranscript] = useState("");
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  function parseOrder(text) {
    const normalized = text.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
    const quantities = {};
    const patterns = [
      { id: "fonde", names: ["fonde", "fonde"] },
      { id: "thiakry", names: ["thiakry", "tiakry", "thiacre"] },
      { id: "poudre", names: ["poudre de mil", "poudre"] }
    ];

    patterns.forEach(({ id, names }) => {
      const namePattern = names.join("|");
      const match = normalized.match(new RegExp("(\\\\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\\\\s+(?:pots?\\\\s+de\\\\s+)?(?:" + namePattern + ")\\\\b"));
      if (!match) return;
      const words = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10 };
      const qty = Number(match[1]) || words[match[1]] || 1;
      quantities[id] = qty;
    });

    if (!Object.keys(quantities).length) return [];

    return products
      .filter(product => quantities[product.id])
      .map(product => ({ ...product, qty: quantities[product.id] }));
  }

  function startListening() {
    setError("");
    setTranscript("");
    setItems([]);
    if (!supported) {
      setError("La commande vocale n’est pas disponible dans ce navigateur. Utilisez Chrome ou un navigateur mobile compatible, ou commandez manuellement.");
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setStatus("listening");
    recognition.onresult = event => {
      const text = Array.from(event.results).map(result => result[0].transcript).join(" ");
      setTranscript(text);
      if (event.results[event.results.length - 1].isFinal) {
        const parsed = parseOrder(text);
        setItems(parsed);
        setStatus(parsed.length ? "review" : "ready");
        if (!parsed.length) setError("Je n’ai pas reconnu de produit. Dites par exemple : « 3 fondé et 2 thiakry ».");
      }
    };
    recognition.onerror = event => {
      setStatus("ready");
      setError(event.error === "not-allowed" ? "L’accès au micro a été refusé. Autorisez le micro pour commander à la voix." : "Je n’ai pas pu entendre correctement. Réessayez.");
    };
    recognition.onend = () => setStatus(current => current === "listening" ? "ready" : current);

    recognition.start();
  }

  function changeQty(id, delta) {
    setItems(current => current.map(item => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item).filter(item => item.qty > 0));
  }

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const potCount = items.reduce((sum, item) => sum + (["fonde", "thiakry"].includes(item.id) ? item.qty : 0), 0);

  return <div className="stack">
    <div className="page-head">
      <button className="back" onClick={onBack}><ArrowLeft size={20}/></button>
      <div><span className="eyebrow">Commande vocale</span><h1>Parlez, on prépare.</h1></div>
    </div>

    <section className="voice-order-card">
      <div className={status === "listening" ? "voice-orb listening" : "voice-orb"}>
        <Mic size={34}/>
      </div>
      <span className="eyebrow">{status === "listening" ? "Je vous écoute" : status === "review" ? "Vérifiez votre commande" : "Dites simplement ce que vous voulez"}</span>
      <h2>{status === "listening" ? "Parlez maintenant" : status === "review" ? "Voilà ce que j’ai compris" : "Pas besoin de choisir mot par mot"}</h2>
      <p>Vous pouvez parler naturellement : « 3 fondé et 2 thiakry pour demain matin ».</p>
      <button className="primary voice-record-button" onClick={startListening} disabled={status === "listening"}>
        <Mic size={20}/>
        {status === "listening" ? "Écoute en cours…" : "Parler pour commander"}
      </button>
      {!supported && <small className="voice-support-note">Votre navigateur ne propose pas encore la reconnaissance vocale. Vous pouvez continuer avec la commande classique.</small>}
      {transcript && <div className="voice-transcript"><span>Vous avez dit</span><b>« {transcript} »</b></div>}
      {error && <div className="voice-error"><CircleHelp size={17}/><span>{error}</span></div>}
    </section>

    {items.length > 0 && <section className="voice-review">
      <div className="section-head">
        <div><span className="eyebrow">Votre sélection</span><h2>Est-ce bien ça ?</h2></div>
      </div>
      <div className="voice-items">
        {items.map(item => <div className="voice-item" key={item.id}>
          <img src={item.image} alt={item.name}/>
          <div><b>{item.name}</b><small>{money(item.price)} / {item.unit}</small></div>
          <div className="stepper"><button onClick={() => changeQty(item.id, -1)}><Minus size={16}/></button><b>{item.qty}</b><button onClick={() => changeQty(item.id, 1)}><Plus size={16}/></button></div>
        </div>)}
      </div>
      <div className="voice-total"><span>Total</span><strong>{money(total)}</strong></div>
      <div className="voice-review-actions">
        <button className="secondary" onClick={startListening}><Mic size={17}/> Modifier à la voix</button>
        <button className="primary" onClick={() => onConfirm(items)}>C’est bien ma commande <ArrowRight size={17}/></button>
      </div>
      <small className="voice-delivery-note">{potCount >= 3 ? "La livraison est disponible pour cette commande." : "La livraison sera disponible à partir de 3 pots."}</small>
    </section>}

    <button className="voice-manual-link" onClick={onBack}>Commander autrement</button>
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
  const [category, setCategory] = useState("Tout");
  const visibleProducts = products.filter(p => category === "Tout" || (category === "Maison" ? p.id === "poudre" : p.name === category));
  return <div className="stack">
    <div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Catalogue</span><h1>Commander</h1></div><button className="icon-button"><CircleHelp size={19}/></button></div>
    <div className="search-box"><Search size={19}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher fondé, thiakry..." /></div>
    <div className="filter-row">{["Tout","Fondé","Thiakry","Maison"].map(item => <button key={item} className={category === item ? "filter active" : "filter"} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <div className="catalog-list">{visibleProducts.map(p => <article className="catalog-card" key={p.id} onClick={() => onSelect(p)}>
      <img src={p.image} alt={p.name}/><div className="catalog-copy"><span className="tiny-badge">{p.badge}</span><h3>{p.name}</h3><p>{p.subtitle}</p><strong>{money(p.price)} <small>/ {p.unit}</small></strong></div><button className="round-add" onClick={e => { e.stopPropagation(); onAdd(p); }}><Plus size={19}/></button>
    </article>)}</div>
    {!visibleProducts.length && <div className="empty"><Search size={28}/><h3>Aucun produit trouvé</h3><p>Essayez un autre mot.</p></div>}
  </div>
}

function ProductScreen({ product, onBack, onAdd }) {
  const [qty, setQty] = useState(1);
  return <div className="stack">
    <div className="product-detail-image"><img src={product.image} alt={product.name}/><button className="floating-back" onClick={onBack}><ArrowLeft size={20}/></button><span className="badge detail-badge">{product.badge}</span></div>
    <div className="detail-content"><span className="eyebrow">Préparé avec soin</span><div className="detail-title"><div><h1>{product.name}</h1><p>{product.subtitle}</p></div><strong>{money(product.price)}</strong></div><p className="detail-description">{product.description}</p>
      <div className="info-strip"><div><Clock3 size={18}/><span>Préparé du jour</span></div><div><Package size={18}/><span>Qualité maison</span></div><div><Truck size={18}/><span>Livraison</span></div></div>
      <div className="qty-line"><div><b>Quantité</b><small>{product.unit}</small></div><div className="stepper"><button onClick={() => setQty(Math.max(1, qty-1))}><Minus size={16}/></button><b>{qty}</b><button onClick={() => setQty(qty+1)}><Plus size={16}/></button></div></div>
      <button className="primary full" onClick={() => onAdd(product, qty)}>Ajouter à ma commande · {money(product.price*qty)} <ShoppingBag size={18}/></button>
    </div>
  </div>
}

function CartScreen({ cart, onBack, onChange, delivery, setDelivery, eligibleDelivery, subtotal, deliveryFee, total, onCheckout }) {
  const potCount = cart.reduce((n, item) => n + (["fonde", "thiakry"].includes(item.id) ? item.qty : 0), 0);
  const articleCount = cart.reduce((n, item) => n + item.qty, 0);

  return <div className="stack">
    <div className="page-head">
      <button className="back" onClick={onBack}><ArrowLeft size={20}/></button>
      <div><span className="eyebrow">Ce que vous prenez</span><h1>Ma commande</h1></div>
    </div>

    {!cart.length ? <div className="empty large">
      <ShoppingBag size={35}/>
      <h2>Votre commande est vide</h2>
      <p>Choisissez ce que vous voulez aujourd’hui. Les quantités et le total se calculent pour vous.</p>
      <button className="primary" onClick={onBack}>Choisir mes produits</button>
    </div> :
      <>
        <section className="order-builder">
          <div className="order-builder-head">
            <div>
              <span className="eyebrow">Votre sélection</span>
              <h2>{potCount ? `${potCount} pot${potCount > 1 ? "s" : ""}` : "Votre sélection"}</h2>
            </div>
            <span className="order-count">{articleCount} article{articleCount > 1 ? "s" : ""}</span>
          </div>

          <div className="order-lines">
            {cart.map(item => <div className="order-line" key={item.id}>
              <div className="order-line-main">
                <img src={item.image} alt={item.name}/>
                <div><b>{item.name}</b><small>{money(item.price)} / {item.unit}</small></div>
              </div>
              <div className="order-line-right">
                <strong>{money(item.price * item.qty)}</strong>
                <div className="stepper small">
                  <button aria-label={`Retirer un ${item.name}`} onClick={() => onChange(item.id, -1)}><Minus size={14}/></button>
                  <b>{item.qty}</b>
                  <button aria-label={`Ajouter un ${item.name}`} onClick={() => onChange(item.id, 1)}><Plus size={14}/></button>
                </div>
              </div>
            </div>)}
          </div>

          <div className="order-help">
            <Check size={17}/>
            <span>Vous pouvez ajuster les quantités ici. Le total se met à jour automatiquement.</span>
          </div>
        </section>

        <div className="delivery-choice">
          <div className="section-head"><div><span className="eyebrow">Ensuite</span><h2>Comment voulez-vous recevoir ?</h2></div></div>
          <div className="choice-grid">
            <button disabled={!eligibleDelivery} className={delivery==="delivery" ? "choice active" : "choice"} onClick={() => eligibleDelivery && setDelivery("delivery")}>
              <Truck size={20}/><b>À domicile</b><small>{eligibleDelivery ? "Dès 3 pots" : "À partir de 3 pots"}</small>
            </button>
            <button className={delivery==="pickup" ? "choice active" : "choice"} onClick={() => setDelivery("pickup")}>
              <MapPin size={20}/><b>Je viens chercher</b><small>Retrait sur place</small>
            </button>
          </div>
        </div>

        <div className="summary">
          <div><span>Mes produits</span><b>{money(subtotal)}</b></div>
          <div><span>Livraison</span><b>{deliveryFee ? money(deliveryFee) : "—"}</b></div>
          <div className="total"><span>Total à payer</span><strong>{money(total)}</strong></div>
        </div>

        <button className="primary full" onClick={onCheckout}>Continuer ma commande <ArrowRight size={18}/></button>
      </>}
  </div>
}
function CheckoutScreen({ step, setStep, delivery, setDelivery, eligibleDelivery, address, setAddress, location, locationStatus, onLocate, payment, setPayment, total, cart, onBack, onDone }) {
  const steps = ["Réception", "Adresse", "Paiement"];
  if (step === 3) return <div className="success-screen"><div className="success-icon"><Check size={32}/></div><span className="eyebrow">C’est confirmé</span><h1>Votre commande est confirmée.</h1><p>Nous préparons votre commande. Vous pourrez suivre son évolution à tout moment.</p>
      <div className="confirmation-summary"><b>Votre commande</b>{cart.map(item => <div key={item.id}><span>{item.qty} × {item.name}</span><strong>{money(item.price * item.qty)}</strong></div>)}<div><span>Total</span><strong>{money(total)}</strong></div></div><button className="primary" onClick={onDone}>Suivre la commande <ArrowRight size={18}/></button></div>;
  return <div className="stack">
    <div className="page-head"><button className="back" onClick={() => step === 0 ? onBack() : setStep(step-1)}><ArrowLeft size={20}/></button><div><span className="eyebrow">Commande</span><h1>{steps[step]}</h1></div></div>
    <div className="progress">{steps.map((s,i)=><div key={s} className={i<=step ? "progress-dot active" : "progress-dot"}><span>{i+1}</span><small>{s}</small></div>)}</div>
    {step===0 && <div className="stack compact"><button disabled={!eligibleDelivery} className={delivery==="delivery" ? "big-choice active" : "big-choice"} onClick={() => eligibleDelivery && setDelivery("delivery")}><Truck size={23}/><div><b>Livraison à domicile</b><small>{eligibleDelivery ? "Minimum 3 pots" : "Disponible à partir de 3 pots"}</small></div>{eligibleDelivery && delivery==="delivery" && <Check size={19}/>}</button><button className={delivery==="pickup" ? "big-choice active" : "big-choice"} onClick={() => setDelivery("pickup")}><MapPin size={23}/><div><b>Retrait</b><small>Gratuit</small></div>{delivery==="pickup" && <Check size={19}/>}</button><button className="primary full" onClick={() => setStep(1)}>Continuer</button></div>}
    {step===1 && <div className="stack compact">{delivery === "delivery" ? <><div className="location-card">
          <div className="location-card-head"><MapPin size={20}/><div><b>Adresse de livraison</b><small>{locationStatus === "loading" ? "Détection de votre position…" : locationStatus === "ready" ? "Position détectée automatiquement" : locationStatus === "denied" ? "Localisation refusée · vous pouvez saisir l’adresse" : "Votre position peut être utilisée automatiquement"}</small></div></div>
          {address ? <div className="detected-address"><span>{address}</span><button className="text-link" onClick={onLocate}>Actualiser</button></div> : <button className="primary full" onClick={onLocate} disabled={locationStatus === "loading"}><MapPin size={18}/>{locationStatus === "loading" ? "Détection…" : "Détecter ma position"}</button>}
          {locationStatus !== "ready" && <label className="field"><span>Ou saisir une adresse</span><div className="input-icon"><MapPin size={18}/><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Quartier, rue, repère..." /></div></label>}
        </div>
        <div className="map-placeholder"><MapPin size={28}/><b>{location ? "Position enregistrée" : "Votre zone"}</b><small>{location ? `Précision GPS : ±${location.accuracy} m` : "La position sera utilisée pour la livraison"}</small></div></> : <div className="pickup-note"><MapPin size={24}/><div><b>Retrait sur place</b><small>Vous récupérerez la commande directement. Aucune adresse de livraison n'est nécessaire.</small></div></div>}<button className="primary full" onClick={() => {
          if (delivery === "delivery" && !address.trim()) return alert("Ajoutez une adresse de livraison.");
          setStep(2);
        }}>Continuer</button></div>}
    {step===2 && <div className="stack compact"><div className="payment-list">{[["wave","Wave","Paiement mobile"],["om","Orange Money","Paiement mobile"],["cash","Espèces","À la livraison"]].map(([id,name,desc])=><button key={id} className={payment===id ? "payment active" : "payment"} onClick={()=>setPayment(id)}><span className={"payment-logo "+id}>{id==="wave"?"W":id==="om"?"O":"₣"}</span><div><b>{name}</b><small>{desc}</small></div>{payment===id && <Check size={19}/>}</button>)}</div><div className="summary"><div className="total"><span>À payer</span><strong>{money(total)}</strong></div></div><button className="primary full" onClick={() => setStep(3)}>Confirmer la commande <Check size={18}/></button></div>}
  </div>
}

function TrackingScreen({ order, onHome }) {
  const items = order?.items || [];
  const itemCount = items.reduce((n, item) => n + item.qty, 0);
  const itemLabel = items.map(item => `${item.qty} ${item.name}`).join(" · ");
  return <div className="stack">
    <div className="page-head"><button className="back" onClick={onHome}><ArrowLeft size={20}/></button><div><span className="eyebrow">Commande {order?.id || "en cours"}</span><h1>En préparation</h1></div></div>
    <div className="tracking-card"><div className="tracking-hero"><Package size={30}/><div><b>{itemCount} article{itemCount > 1 ? "s" : ""}</b><small>{itemLabel || "Commande en préparation"}</small></div><span className="status amber">En préparation</span></div><div className="timeline"><Track label="Commande confirmée" time="Maintenant" done/><Track label="Préparation par Mère Fondé" time="En cours" done current/><Track label="Prise en charge" time="À venir"/><Track label={order?.delivery === "pickup" ? "Retrait" : "Livraison"} time="À venir"/></div></div>
    <div className="address-card"><MapPin size={20}/><div><small>{order?.delivery === "pickup" ? "Mode de réception" : "Livraison à"}</small><b>{order?.address || "Informations indisponibles"}</b></div>{order?.delivery !== "pickup" && <button><Phone size={17}/></button>}</div>
    <div className="summary"><div className="total"><span>Total</span><strong>{money(order?.total || 0)}</strong></div></div>
    <button className="secondary full" onClick={onHome}>Retour à l’accueil</button>
  </div>
}
function Track({label,time,done,current}) {
  return <div className="track-row"><span className={done ? "track-dot done" : "track-dot"}>{done && <Check size={12}/>}</span><div><b>{label}</b><small>{time}</small></div></div>
}

function OrdersScreen({ onBack, onReorder }) {
  return <div className="stack"><div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Votre historique</span><h1>Commandes</h1></div></div><div className="order-list">{mockOrders.map(o=><article className="order-card" key={o.id}><div className="order-top"><b>{o.id}</b><span className={"status "+o.tone}>{o.status}</span></div><p>{o.items}</p><div className="order-bottom"><span>{o.date}</span><strong>{money(o.total)}</strong></div><button className="secondary full" onClick={() => onReorder({ id:o.id, items:o.id==="FD-2048" ? [{id:"fonde",qty:2},{id:"thiakry",qty:1}] : o.id==="FD-1994" ? [{id:"fonde",qty:2},{id:"thiakry",qty:2}] : [{id:"fonde",qty:3}] })}><RotateCcw size={16}/> Commander à nouveau</button></article>)}</div></div>
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
    <div className="subscription-card"><div className="sub-head"><div><span className={active ? "status green" : "status amber"}>{active ? "Actif" : "En pause"}</span><h3>Matin + soir</h3><p>2 Fondé le matin · 2 Fondé le soir</p></div><button className="toggle" onClick={()=>setActive(!active)}><span className={active ? "on" : ""}/></button></div><div className="sub-details"><div><Clock3 size={17}/><span>Tous les jours</span></div><div><WalletCards size={17}/><span>Paiement à chaque commande</span></div></div><div className="sub-actions"><button className="secondary" onClick={()=>notifySimple("Modification bientôt disponible")}>Modifier</button><button className="secondary" onClick={()=>setActive(!active)}>{active ? "Mettre en pause" : "Reprendre"}</button></div></div>
    <div className="next-orders"><div className="section-head"><div><span className="eyebrow">À venir</span><h2>Prochaines commandes</h2></div></div><div className="mini-order"><div><b>Demain · matin</b><small>2 Fondé · 400 FCFA</small></div><ChevronRight size={17}/></div><div className="mini-order"><div><b>Demain · soir</b><small>2 Fondé · 400 FCFA</small></div><ChevronRight size={17}/></div></div>
    <button className="primary full" onClick={onAdd}>Préparer cette commande <ShoppingBag size={18}/></button>
  </div>
}
function notifySimple(msg){ alert(msg); }

function EventModal({ onClose, onSubmit }) {
  const [type,setType]=useState("Baptême");
  return <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={onClose}><X size={19}/></button><span className="eyebrow">Service événement</span><h2>Parlez-nous de votre événement.</h2><p>Pour un baptême, une fête religieuse, une cérémonie familiale ou un autre événement, envoyez-nous les premiers détails.</p><div className="event-types">{["Baptême","Pâques","Cérémonie","Autre"].map(x=><button className={type===x?"selected":""} onClick={()=>setType(x)} key={x}>{x}</button>)}</div><label className="field"><span>Date prévue</span><input type="date"/></label><label className="field"><span>Nombre de personnes</span><input type="number" placeholder="Ex. 80"/></label><label className="field"><span>Votre message</span><textarea placeholder="Dites-nous ce dont vous avez besoin..."/></label><button className="voice full"><Mic size={18}/> Envoyer aussi un message vocal</button><button className="primary full" onClick={onSubmit}>Envoyer la demande <ArrowRight size={18}/></button></div></div>
}

createRoot(document.getElementById("root")).render(<App />);
