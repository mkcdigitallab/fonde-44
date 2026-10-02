import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft, ArrowRight, Bell, CalendarDays, Check, ChevronRight, Clock3,
  CreditCard, Heart, Home, MapPin, Menu, Mic, Minus, Package, Pause, Phone,
  Plus, RotateCcw, Search, ShoppingBag, Square, Send, Trash2, Sparkles, Truck, Volume2,
  WalletCards, X, Utensils, CircleHelp, Sun, Moon, UserCircle
} from "lucide-react";
import "./styles.css";
import MereFondeDashboard from "./MereFondeDashboard.jsx";

const products = [
  {
    id: "fonde",
    name: "Fondé",
    subtitle: "Mil traditionnel, préparé du jour",
    price: 200,
    unit: "pot",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=85"
    ],
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
    gallery: [
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=900&q=85"
    ],
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
    gallery: [
      "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=85"
    ],
    badge: "Maison",
    description: "Poudre de mil préparée avec soin pour vos bouillies et recettes à la maison."
  }
];

const deliveryZone = {
  name: "Dakar",
  allowedCities: ["dakar"]
};

function normalizePlace(value = "") {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function isDakarAddress(address = {}) {
  return [address.city, address.town, address.municipality, address.city_district]
    .filter(Boolean).map(normalizePlace).some(place => deliveryZone.allowedCities.includes(place));
}

const planningRules = {
  // Les horaires réels de Mère Fondé seront configurés côté métier/backend.
  // Tant qu’ils ne sont pas définis, le client peut demander un créneau,
  // mais celui-ci reste une demande à vérifier avant validation finale.
  salesHoursConfigured: false
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSchedule(date, time) {
  if (!date || !time) return "";
  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime())) return `${date} · ${time}`;
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

const navItems = [
  { id: "home", label: "Accueil", icon: Home },
  { id: "shop", label: "Commander", icon: ShoppingBag },
  { id: "orders", label: "Commandes", icon: Package },
  { id: "profile", label: "Profil", icon: UserCircle }
];

function money(value) {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
}

function App() {
  const [screen, setScreen] = useState("home");
  const [actor, setActor] = useState("client");
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
  const [deliveryZoneStatus, setDeliveryZoneStatus] = useState("unknown");
  const [payment, setPayment] = useState("wave");
  const [eventOpen, setEventOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [orderTiming, setOrderTiming] = useState("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [eventRequest, setEventRequest] = useState(null);
  const [transitionKey, setTransitionKey] = useState("home");

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

  function applyReverseGeocodedLocation(data) {
    const label = data.display_name || [
      data.address?.road,
      data.address?.suburb || data.address?.neighbourhood,
      data.address?.city || data.address?.town,
      data.address?.country
    ].filter(Boolean).join(", ");

    setDeliveryZoneStatus(isDakarAddress(data.address || {}) ? "available" : "outside_zone");
    if (label) {
      setAddress(label);
      try { localStorage.setItem("fonde44-address", label); } catch {}
    }
    setLocationStatus(label ? "ready" : "coordinates");
  }

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
          applyReverseGeocodedLocation(data);
        } catch {
          setLocationStatus("coordinates");
        }
      },
      error => {
        setLocationStatus(error.code === 1 ? "denied" : "error");
        setDeliveryZoneStatus("unknown");
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
      error => { setLocationStatus(error.code === 1 ? "denied" : "error"); setDeliveryZoneStatus("unknown"); },
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
    const item = cart.find(x => x.id === id);
    if (!item) return;

    const nextQty = item.qty + delta;
    if (nextQty < 0) return;

    const nextPotCount = potCount + (["fonde", "thiakry"].includes(id) ? delta : 0);
    if (delivery === "delivery" && nextPotCount < 3) {
      setDelivery("pickup");
    }

    setCart(current => current
      .map(x => x.id === id ? { ...x, qty: x.qty + delta } : x)
      .filter(x => x.qty > 0)
    );
  }

  function go(screenName) {
    setScreen(screenName);
    setTransitionKey(screenName);
    window.scrollTo({ top: 0, behavior: "auto" });
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
          <button className="icon-button" aria-label="Notifications" onClick={() => notify("Aucune nouvelle notification")}><Bell size={19}/></button>
          <button className="cart-pill" onClick={() => go("cart")} aria-label={`Voir ma commande, ${cartCount} article${cartCount > 1 ? "s" : ""}`}><ShoppingBag size={18}/><span>{cartCount}</span></button>
        </div>
      </header>

      <main key={transitionKey} className="content screen-transition" aria-live="polite">
        {screen === "home" && <HomeScreen onShop={() => go("shop")} onVoice={() => go("voice")} onOrders={() => go("orders")} onAdd={add} favorite={favorite} setFavorite={setFavorite} onSubscription={() => go("subscription")} onEvent={() => go("event")} confirmedOrder={confirmedOrder} />}
        {screen === "voice" && <VoiceOrderScreen onBack={() => go("home")} onSaved={() => notify("Votre message vocal est enregistré sur cet écran.")} />}
        {screen === "shop" && <ShopScreen products={filtered} search={search} setSearch={setSearch} onBack={() => go("home")} onSelect={setSelected} onAdd={add} onNotify={notify} />}
        {screen === "product" && selected && <ProductScreen product={selected} onBack={() => go("shop")} onAdd={add} />}
        {screen === "cart" && <CartScreen cart={cart} onBack={() => go("shop")} onChange={changeQty} delivery={delivery} setDelivery={setDelivery} eligibleDelivery={eligibleDelivery} subtotal={subtotal} deliveryFee={deliveryFee} total={total} orderTiming={orderTiming} setOrderTiming={setOrderTiming} scheduledDate={scheduledDate} setScheduledDate={setScheduledDate} scheduledTime={scheduledTime} setScheduledTime={setScheduledTime} onCheckout={(schedule) => {
          if (!cart.length) return notify("Votre commande est vide");
          if (delivery === "delivery" && !eligibleDelivery) {
            setDelivery("pickup");
            return notify("La livraison est disponible à partir de 3 pots");
          }
          if (delivery === "delivery" && deliveryZoneStatus === "outside_zone") {
            return notify("La livraison est disponible uniquement à Dakar");
          }
          setCheckoutStep(0);
          go("checkout");
        }} />}
        {screen === "checkout" && <CheckoutScreen step={checkoutStep} setStep={setCheckoutStep} delivery={delivery} setDelivery={setDelivery} eligibleDelivery={eligibleDelivery} address={address} setAddress={saveAddress} location={location} locationStatus={locationStatus} deliveryZoneStatus={deliveryZoneStatus} onLocate={requestLocation} payment={payment} setPayment={setPayment} total={total} cart={cart} orderTiming={orderTiming} scheduledDate={scheduledDate} scheduledTime={scheduledTime} onBack={() => go("cart")} onDone={() => {
          setConfirmedOrder({
            id: `FD-${Math.floor(1000 + Math.random() * 9000)}`,
            items: cart.map(({ id, name, qty, price, unit }) => ({ id, name, qty, price, unit })),
            total,
            delivery,
            address: delivery === "delivery" ? address : "Retrait sur place",
            payment,
            timing: orderTiming,
            scheduledDate: orderTiming === "scheduled" ? scheduledDate : null,
            scheduledTime: orderTiming === "scheduled" ? scheduledTime : null,
            scheduleStatus: orderTiming === "scheduled" ? "pending_validation" : "confirmed"
          });
          setCart([]);
          go("tracking");
          notify(orderTiming === "scheduled" ? "Demande de créneau enregistrée" : "Commande confirmée");
        }} />}
        {screen === "tracking" && <TrackingScreen order={confirmedOrder} onHome={() => go("home")} />}
        {screen === "orders" && <OrdersScreen order={confirmedOrder} onBack={() => go("home")} onReorder={(order) => {
          order.items.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if (product) add(product, item.qty);
          });
          go("cart");
        }} />}
        {screen === "profile" && <ProfileScreen address={address} setAddress={saveAddress} subscription={subscription} setSubscription={setSubscription} onBack={() => go("home")} onSubscription={() => go("subscription")} onNotify={notify} />}
        {screen === "subscription" && <SubscriptionScreen active={subscription} setActive={setSubscription} onBack={() => go("profile")} onAdd={() => { add(products[0], 4); notify("Votre commande est prête à être vérifiée"); }} onNotify={notify} />}
        {screen === "event" && <EventServiceScreen onBack={() => go("home")} onSubmit={(request) => {
          setEventRequest(request);
          notify("Votre demande événementielle est enregistrée.");
          go("event-confirmation");
        }} />}
        {screen === "event-confirmation" && <EventRequestConfirmationScreen request={eventRequest} onHome={() => go("home")} onBack={() => go("event")} />}
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

      {eventOpen && <EventModal onClose={() => setEventOpen(false)} onSubmit={(request) => {
        setEventOpen(false);
        notify(`Demande ${request.type.toLowerCase()} préparée pour ${request.people} personnes`);
      }} />}
      {toast && <div className="toast"><Check size={18}/>{toast}</div>}
    </div>
  );
}

function HomeScreen({ onShop, onVoice, onOrders, onAdd, favorite, setFavorite, onSubscription, onEvent, confirmedOrder }) {
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
      {confirmedOrder ? (
        <button className="order-preview" onClick={onOrders}>
          <span className="order-icon"><Package size={21}/></span>
          <div>
            <b>Commande {confirmedOrder.id}</b>
            <small>{confirmedOrder.timing === "scheduled" ? "Créneau à vérifier" : "En préparation"} · {money(confirmedOrder.total)}</small>
          </div>
          <ChevronRight size={19}/>
        </button>
      ) : (
        <button className="order-preview" onClick={onOrders}>
          <span className="order-icon"><Package size={21}/></span>
          <div>
            <b>Aucune commande récente</b>
            <small>Vos commandes apparaîtront ici.</small>
          </div>
          <ChevronRight size={19}/>
        </button>
      )}
    </section>
  </div>
}


function VoiceOrderScreen({ onBack, onSaved }) {
  const [status, setStatus] = useState("ready");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("L’enregistrement vocal n’est pas disponible dans ce navigateur. Vous pouvez commander autrement.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
      setDuration(0);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus("review");
      };

      recorder.start();
      setStatus("recording");
      timerRef.current = setInterval(() => setDuration(value => value + 1), 1000);
    } catch (err) {
      setStatus("ready");
      setError(err?.name === "NotAllowedError"
        ? "L’accès au micro a été refusé. Autorisez le micro pour envoyer votre commande vocale."
        : "Impossible d’utiliser le micro. Réessayez ou commandez autrement.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function discardRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
    setAudioBlob(null);
    setDuration(0);
    setError("");
    setStatus("ready");
  }

  function sendVoiceOrder() {
    if (!audioBlob) return;
    onSaved?.({ audioBlob, duration });
    setStatus("sent");
  }

  const formatDuration = value => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

  return <div className="stack">
    <div className="page-head">
      <button className="back" onClick={onBack}><ArrowLeft size={20}/></button>
      <div><span className="eyebrow">Commande vocale</span><h1>Parlez, on vous écoute.</h1></div>
    </div>

    <section className="voice-order-card">
      <div className={status === "recording" ? "voice-orb listening" : "voice-orb"}>
        <Mic size={34}/>
      </div>

      <span className="eyebrow">
        {status === "recording" ? "Enregistrement en cours" : status === "review" ? "Votre message vocal est prêt" : status === "sent" ? "Message vocal enregistré" : "Comme dans WhatsApp"}
      </span>

      <h2>
        {status === "recording" ? "Parlez naturellement" : status === "review" ? "Écoutez avant d’envoyer" : status === "sent" ? "Votre message vocal est prêt" : "Dites simplement ce que vous voulez"}
      </h2>

      <p>
        {status === "recording"
          ? "Dites votre commande, votre adresse ou toute précision utile. Nous gardons votre voix telle quelle."
          : "Enregistrez votre message vocal. Il sera conservé tel quel, sans transcription dans l’application."}
      </p>

      {status === "recording" && <div className="voice-recording-time">{formatDuration(duration)}</div>}

      {audioUrl && <audio className="voice-audio-player" controls src={audioUrl} />}

      {status === "ready" && <button className="primary voice-record-button" onClick={startRecording}><Mic size={20}/> Enregistrer ma commande</button>}

      {status === "recording" && <button className="primary voice-record-button voice-stop-button" onClick={stopRecording}><Square size={18}/> Arrêter l’enregistrement</button>}

      {status === "review" && <div className="voice-review-actions">
        <button className="secondary" onClick={discardRecording}><Trash2 size={17}/> Recommencer</button>
        <button className="primary" onClick={sendVoiceOrder}><Send size={17}/> Envoyer ma commande</button>
      </div>}

      {status === "sent" && <button className="primary voice-record-button" onClick={onBack}><ArrowRight size={20}/> Retourner à l’accueil</button>}

      {error && <div className="voice-error"><CircleHelp size={17}/><span>{error}</span></div>}
    </section>

    <div className="voice-privacy-note">
      <Mic size={16}/>
      <span>Votre message vocal est envoyé comme un fichier audio original. La compréhension automatique sera traitée côté serveur.</span>
    </div>

    <button className="voice-manual-link" onClick={onBack}>{status === "sent" ? "Commander avec les produits" : "Commander autrement"}</button>
  </div>
}
function ProductCard({ product, onAdd, favorite, setFavorite }) {
  const isFav = favorite.includes(product.id);
  const gallery = product.gallery?.length ? product.gallery.slice(0, 3) : [product.image];
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (gallery.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveImage(current => (current + 1) % gallery.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [gallery.length]);

  return <article className="product-card">
    <div className="image-gallery">
      <div className="gallery-track" style={{ transform: `translateX(-${activeImage * 100}%)` }}>
        {gallery.map((image, index) => (
          <img key={image} src={image} alt={index === 0 ? product.name : `${product.name}, photo ${index + 1}`} />
        ))}
      </div>
      <div className="gallery-shade" aria-hidden="true"/>
      <div className="gallery-meta">
        <span className="gallery-count"><span>{activeImage + 1}</span> / {gallery.length}</span>
        <button
          className={isFav ? "heart active" : "heart"}
          onClick={() => setFavorite(f => isFav ? f.filter(x => x !== product.id) : [...f, product.id])}
          aria-label={isFav ? `Retirer ${product.name} des favoris` : `Ajouter ${product.name} aux favoris`}
        >
          <Heart size={17} fill={isFav ? "currentColor" : "none"}/>
        </button>
      </div>
      <div className="gallery-dots" aria-label={`Photos de ${product.name}`}>
        {gallery.map((_, index) => (
          <button
            key={index}
            className={index === activeImage ? "gallery-dot active" : "gallery-dot"}
            onClick={() => setActiveImage(index)}
            aria-label={`Afficher la photo ${index + 1} de ${product.name}`}
          />
        ))}
      </div>
      <span className="badge">{product.badge}</span>
    </div>
    <div className="product-info"><div><h3>{product.name}</h3><p>{product.subtitle}</p></div><strong>{money(product.price)}</strong></div>
    <button className="add-button" onClick={() => onAdd(product)}><Plus size={18}/> Ajouter</button>
  </article>
}
function ShopScreen({ products, search, setSearch, onBack, onSelect, onAdd, onNotify }) {
  const [category, setCategory] = useState("Tout");
  const visibleProducts = products.filter(p => category === "Tout" || (category === "Maison" ? p.id === "poudre" : p.name === category));
  return <div className="stack">
    <div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Catalogue</span><h1>Commander</h1></div><button className="icon-button" aria-label="Aide" onClick={() => onNotify?.("Choisissez un produit pour voir les détails, ou utilisez Ajouter pour commander plus vite.")}><CircleHelp size={19}/></button></div>
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

function CartScreen({ cart, onBack, onChange, delivery, setDelivery, eligibleDelivery, subtotal, deliveryFee, total, orderTiming, setOrderTiming, scheduledDate, setScheduledDate, scheduledTime, setScheduledTime, onCheckout }) {
  const potCount = cart.reduce((n, item) => n + (["fonde", "thiakry"].includes(item.id) ? item.qty : 0), 0);
  const articleCount = cart.reduce((n, item) => n + item.qty, 0);
  const [scheduleError, setScheduleError] = useState("");

  function chooseTiming(value) {
    setScheduleError("");
    setOrderTiming(value);
  }

  function validateSchedule() {
    if (orderTiming !== "scheduled") return true;
    if (!scheduledDate || !scheduledTime) {
      setScheduleError("Choisissez le jour et l’heure souhaités.");
      return false;
    }

    const selected = new Date(`${scheduledDate}T${scheduledTime}:00`);
    if (Number.isNaN(selected.getTime()) || selected.getTime() <= Date.now()) {
      setScheduleError("Choisissez un moment à venir.");
      return false;
    }

    return true;
  }

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
              <p className="order-builder-subtitle">Vérifiez simplement ce que vous voulez recevoir.</p>
            </div>
            <span className="order-count">{articleCount} article{articleCount > 1 ? "s" : ""}</span>
          </div>

          <div className="order-lines">
            {cart.map(item => <div className="order-line" key={item.id}>
              <div className="order-line-main">
                <img src={item.image} alt={item.name}/>
                <div><b>{item.name}</b><small>{money(item.price)} / {item.unit}</small><span className="order-line-calculation">{item.qty} × {money(item.price)}</span></div>
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

        <section className="schedule-choice">
          <div className="section-head">
            <div>
              <span className="eyebrow">Quand ?</span>
              <h2>Quand voulez-vous votre commande ?</h2>
              <p className="section-note">Maintenant pour le prochain créneau disponible, ou programmez votre demande.</p>
            </div>
          </div>

          <div className="choice-grid">
            <button className={orderTiming==="now" ? "choice active" : "choice"} onClick={() => chooseTiming("now")}>
              <Clock3 size={20}/><b>Maintenant</b><small>Dès que possible</small>
            </button>
            <button className={orderTiming==="scheduled" ? "choice active" : "choice"} onClick={() => chooseTiming("scheduled")}>
              <CalendarDays size={20}/><b>Programmer</b><small>Choisir un jour et une heure</small>
            </button>
          </div>

          {orderTiming==="scheduled" && <div className="schedule-panel">
            <div className="schedule-picker">
              <div className="picker-group">
                <div className="picker-title"><CalendarDays size={17}/><b>Choisissez le jour</b></div>
                <div className="date-options">
                  {Array.from({ length: 7 }, (_, index) => {
                    const date = new Date();
                    date.setHours(12, 0, 0, 0);
                    date.setDate(date.getDate() + index);
                    const key = localDateKey(date);
                    const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date).replace(".", "");
                    const dayNumber = new Intl.DateTimeFormat("fr-FR", { day: "numeric" }).format(date);
                    return <button key={key} type="button" className={scheduledDate === key ? "date-option active" : "date-option"} onClick={() => { setScheduledDate(key); setScheduleError(""); }}>
                      <span>{index === 0 ? "Aujourd’hui" : index === 1 ? "Demain" : weekday}</span>
                      <b>{index < 2 ? dayNumber : dayNumber}</b>
                    </button>;
                  })}
                </div>
              </div>

              <div className="picker-group">
                <div className="picker-title"><Clock3 size={17}/><b>Choisissez l’heure</b></div>
                <div className="time-options">
                  {["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"].map(time => (
                    <button key={time} type="button" className={scheduledTime === time ? "time-option active" : "time-option"} onClick={() => { setScheduledTime(time); setScheduleError(""); }}>
                      {time.replace(":","h")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {scheduledDate && scheduledTime && <div className="schedule-preview"><CalendarDays size={17}/><div><b>Votre choix</b><span>{formatSchedule(scheduledDate, scheduledTime)}</span></div></div>}
            <div className="schedule-rule">
              <Clock3 size={16}/>
              <span>Le créneau sera vérifié selon les horaires de vente et le temps de préparation avant validation.</span>
            </div>
            {!planningRules.salesHoursConfigured && <div className="schedule-config-note">Les horaires réels de Mère Fondé ne sont pas encore configurés dans cette version.</div>}
            {scheduleError && <div className="schedule-error" role="alert">{scheduleError}</div>}
          </div>}</section>

        <div className="delivery-choice">
          <div className="section-head"><div><span className="eyebrow">Ensuite</span><h2>Comment voulez-vous recevoir ?</h2><p className="section-note">Choisissez livraison ou retrait. Vous pourrez vérifier l’adresse et le paiement ensuite.</p></div></div>
          <div className="choice-grid">
            <button disabled={!eligibleDelivery} className={delivery==="delivery" ? "choice active" : "choice"} onClick={() => eligibleDelivery && setDelivery("delivery")}>
              <Truck size={20}/><b>À domicile</b><small>{eligibleDelivery ? "Disponible dès 3 pots" : (`Encore ${3 - potCount} pot${3 - potCount > 1 ? "s" : ""} pour la livraison`)}</small>
            </button>
            <button className={delivery==="pickup" ? "choice active" : "choice"} onClick={() => setDelivery("pickup")}>
              <MapPin size={20}/><b>Je viens chercher</b><small>Retrait sur place</small>
            </button>
          </div>
        </div>

        <section className="order-total-card">
          <div className="order-total-row"><span>Produits</span><strong>{money(subtotal)}</strong></div>
          <div className="order-total-row"><span>Livraison</span><span className="order-total-muted">{delivery === "delivery" ? "Vérifiée ensuite" : "Retrait sur place"}</span></div>
          <div className="order-total-divider" />
          <div className="order-total-final"><span>Montant des produits</span><strong>{money(total)}</strong></div>
          <p className="order-total-note">Le montant de la livraison, s’il y en a un, sera affiché avant la validation du paiement.</p>
        </section>

        <button className="primary full order-main-action" onClick={() => {
          if (!validateSchedule()) return;
          onCheckout({ timing: orderTiming, date: scheduledDate, time: scheduledTime });
        }}>
          {orderTiming === "scheduled" ? "Continuer avec ce créneau" : "Continuer"} <ArrowRight size={18}/>
        </button>
      </>}
  </div>
}

function CheckoutScreen({ step, setStep, delivery, setDelivery, eligibleDelivery, address, setAddress, location, locationStatus, deliveryZoneStatus, onLocate, payment, setPayment, total, cart, orderTiming, scheduledDate, scheduledTime, onBack, onDone }) {
  const [addressError, setAddressError] = useState("");
  const steps = ["Réception", "Adresse", "Paiement"];
  if (step === 3) return <div className="success-screen"><div className="success-icon"><Check size={32}/></div><span className="eyebrow">{orderTiming === "scheduled" ? "Demande enregistrée" : "C’est confirmé"}</span><h1>{orderTiming === "scheduled" ? "Votre créneau est demandé." : "Votre commande est confirmée."}</h1><p>{orderTiming === "scheduled" ? "Nous allons vérifier l’horaire de vente et de préparation avant de confirmer ce créneau." : "Nous préparons votre commande. Vous pourrez suivre son évolution à tout moment."}</p>
      <div className="confirmation-summary"><b>Votre commande</b><div><span>{orderTiming === "scheduled" ? "Créneau demandé" : "Quand"}</span><strong>{orderTiming === "now" ? "Dès que possible" : formatSchedule(scheduledDate, scheduledTime)}</strong></div>{cart.map(item => <div key={item.id}><span>{item.qty} × {item.name}</span><strong>{money(item.price * item.qty)}</strong></div>)}<div><span>Total</span><strong>{money(total)}</strong></div></div><button className="primary" onClick={onDone}>Voir le suivi <ArrowRight size={18}/></button></div>
  return <div className="stack">
    <div className="page-head"><button className="back" onClick={() => step === 0 ? onBack() : setStep(step-1)}><ArrowLeft size={20}/></button><div><span className="eyebrow">Commande</span><h1>{steps[step]}</h1></div></div>
    <div className="progress">{steps.map((s,i)=><div key={s} className={i<=step ? "progress-dot active" : "progress-dot"}><span>{i+1}</span><small>{s}</small></div>)}</div>
    {step===0 && <div className="stack compact"><button disabled={!eligibleDelivery || deliveryZoneStatus === "outside_zone"} className={delivery==="delivery" ? "big-choice active" : "big-choice"} onClick={() => {
      if (!eligibleDelivery) return;
      if (deliveryZoneStatus === "outside_zone") return;
      setDelivery("delivery");
    }}><Truck size={23}/><div><b>Livraison à domicile</b><small>{deliveryZoneStatus === "outside_zone" ? "Indisponible hors Dakar" : eligibleDelivery ? "Minimum 3 pots · Dakar" : "Disponible à partir de 3 pots"}</small></div>{eligibleDelivery && delivery==="delivery" && <Check size={19}/>}</button><button className={delivery==="pickup" ? "big-choice active" : "big-choice"} onClick={() => setDelivery("pickup")}><MapPin size={23}/><div><b>Retrait</b><small>Gratuit</small></div>{delivery==="pickup" && <Check size={19}/>}</button><button className="primary full" onClick={() => setStep(1)}>Continuer</button></div>}
    {step===1 && <div className="stack compact">{delivery === "delivery" ? <><div className="location-card">
          <div className="location-card-head"><MapPin size={20}/><div><b>Adresse de livraison</b><small>{locationStatus === "loading" ? "Détection de votre position…" : locationStatus === "ready" ? "Position détectée automatiquement" : locationStatus === "denied" ? "Localisation refusée · vous pouvez saisir l’adresse" : "Votre position peut être utilisée automatiquement"}</small></div></div>
          {address ? <div className="detected-address"><span>{address}</span><button className="text-link" onClick={onLocate}>Actualiser</button></div> : <button className="primary full" onClick={onLocate} disabled={locationStatus === "loading"}><MapPin size={18}/>{locationStatus === "loading" ? "Détection…" : "Détecter ma position"}</button>}
          {locationStatus !== "ready" && <label className="field"><span>Ou saisir une adresse</span><div className="input-icon"><MapPin size={18}/><input value={address} onChange={e=>{setAddress(e.target.value); setDeliveryZoneStatus("unknown"); setAddressError("");}} placeholder="Quartier, rue, repère..." /></div></label>}
        </div>
        {deliveryZoneStatus === "outside_zone" && <div className="delivery-zone-warning" role="alert"><MapPin size={18}/><div><b>Livraison indisponible ici</b><small>Nous livrons actuellement uniquement à Dakar.</small></div><button className="text-link" onClick={() => setDelivery("pickup")}>Choisir le retrait</button></div>}
        {deliveryZoneStatus === "available" && <div className="delivery-zone-ok"><Check size={17}/><span>Cette adresse est dans la zone de livraison de Dakar.</span></div>}
        <div className="map-placeholder"><MapPin size={28}/><b>{location ? "Position enregistrée" : "Votre zone"}</b><small>{location ? `Précision GPS : ±${location.accuracy} m` : "La position sera utilisée pour la livraison"}</small></div></> : <div className="pickup-note"><MapPin size={24}/><div><b>Retrait sur place</b><small>Vous récupérerez la commande directement. Aucune adresse de livraison n'est nécessaire.</small></div></div>}{addressError && <div className="schedule-error" role="alert">{addressError}</div>}<button className="primary full" onClick={() => {
          if (delivery === "delivery" && deliveryZoneStatus === "outside_zone") {
            setAddressError("La livraison est disponible uniquement à Dakar. Choisissez le retrait sur place ou une adresse à Dakar.");
            return;
          }
          if (delivery === "delivery" && deliveryZoneStatus !== "available") {
            setAddressError("Vérifiez votre position pour confirmer que l’adresse est bien à Dakar.");
            return;
          }
          if (delivery === "delivery" && !address.trim()) {
            setAddressError("Ajoutez une adresse de livraison pour continuer.");
            return;
          }
          setAddressError("");
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
    <div className="tracking-card"><div className="tracking-hero"><Package size={30}/><div><b>{itemCount} article{itemCount > 1 ? "s" : ""}</b><small>{itemLabel || "Commande en préparation"}</small></div><span className="status amber">{order?.scheduleStatus === "pending_validation" ? "Créneau à vérifier" : "En préparation"}</span></div><div className="timeline">{order?.scheduleStatus === "pending_validation" ? <><Track label="Demande enregistrée" time="Maintenant" done/><Track label="Vérification du créneau" time="À venir" current/><Track label="Préparation par Mère Fondé" time="Après validation"/><Track label={order?.delivery === "pickup" ? "Retrait" : "Livraison"} time="À venir"/></> : <><Track label="Commande confirmée" time="Maintenant" done/><Track label="Préparation par Mère Fondé" time="En cours" done current/><Track label="Prise en charge" time="À venir"/><Track label={order?.delivery === "pickup" ? "Retrait" : "Livraison"} time="À venir"/></>}</div></div>
    {order?.timing === "scheduled" && <div className="address-card"><CalendarDays size={20}/><div><small>Créneau demandé</small><b>{formatSchedule(order.scheduledDate, order.scheduledTime)}</b></div></div>}
    <div className="address-card"><MapPin size={20}/><div><small>{order?.delivery === "pickup" ? "Mode de réception" : "Livraison à"}</small><b>{order?.address || "Informations indisponibles"}</b></div></div>
    <div className="summary"><div className="total"><span>Total</span><strong>{money(order?.total || 0)}</strong></div></div>
    <button className="secondary full" onClick={onHome}>Retour à l’accueil</button>
  </div>
}
function Track({label,time,done,current}) {
  return <div className="track-row"><span className={done ? "track-dot done" : "track-dot"}>{done && <Check size={12}/>}</span><div><b>{label}</b><small>{time}</small></div></div>
}

function OrdersScreen({ order, onBack, onReorder }) {
  return <div className="stack">
    <div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Votre historique</span><h1>Commandes</h1></div></div>
    {!order ? (
      <div className="empty">
        <Package size={28}/>
        <h3>Aucune commande ici pour le moment</h3>
        <p>Vos commandes apparaîtront ici dès qu’une commande sera enregistrée dans votre compte.</p>
        <button className="primary" onClick={onBack}>Retour à l’accueil</button>
      </div>
    ) : (
      <div className="order-list">
        <article className="order-card">
          <div className="order-top">
            <b>{order.id}</b>
            <span className={"status "+(order.scheduleStatus === "pending_validation" ? "amber" : "green")}>
              {order.scheduleStatus === "pending_validation" ? "Créneau à vérifier" : "En préparation"}
            </span>
          </div>
          <p>{order.items.map(item => item.qty + " " + item.name).join(" · ")}</p>
          <div className="order-bottom"><span>{order.timing === "scheduled" ? formatSchedule(order.scheduledDate, order.scheduledTime) : "Dès que possible"}</span><strong>{money(order.total)}</strong></div>
          <button className="secondary full" onClick={() => onReorder({ id: order.id, items: order.items })}><RotateCcw size={16}/> Commander à nouveau</button>
        </article>
      </div>
    )}
  </div>
}
function ProfileScreen({ address, setAddress, subscription, setSubscription, onBack, onSubscription, onNotify }) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [draftAddress, setDraftAddress] = useState(address);

  return <div className="stack"><div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Votre espace</span><h1>Profil</h1></div></div>
    <div className="profile-card"><div className="avatar">MK</div><div><b>Client Fondé 44</b><small>Profil local</small></div></div>
    <div className="settings-list">
      {editingAddress ? <div className="setting setting-edit"><MapPin size={19}/><div className="stack compact"><b>Adresse principale</b><input value={draftAddress} onChange={e=>setDraftAddress(e.target.value)} placeholder="Quartier, rue, repère..." /><div className="sub-actions"><button className="secondary" onClick={()=>{setEditingAddress(false);setDraftAddress(address);}}>Annuler</button><button className="primary" disabled={!draftAddress.trim()} onClick={()=>{setAddress(draftAddress.trim());setEditingAddress(false);onNotify?.("Adresse enregistrée.");}}>Enregistrer</button></div></div></div> : <div className="setting"><MapPin size={19}/><div><b>Adresse principale</b><small>{address || "Aucune adresse enregistrée"}</small></div><button onClick={()=>{setDraftAddress(address);setEditingAddress(true)}}><ChevronRight size={18}/></button></div>}
      <div className="setting"><RotateCcw size={19}/><div><b>Mon abonnement</b><small>{subscription ? "Matin + soir · actif" : "Aucun abonnement actif"}</small></div><button onClick={onSubscription}><ChevronRight size={18}/></button></div>
      <div className="setting"><CreditCard size={19}/><div><b>Moyens de paiement</b><small>Wave · Orange Money · Espèces</small></div><button onClick={()=>onNotify?.("Le choix du moyen de paiement se fait au moment de la commande.")}><ChevronRight size={18}/></button></div>
      <div className="setting"><CircleHelp size={19}/><div><b>Aide & contact</b><small>Assistance disponible bientôt.</small></div><button onClick={()=>onNotify?.("L’aide en ligne n’est pas encore disponible.")}><ChevronRight size={18}/></button></div>
    </div>
    <button className="secondary full" onClick={()=>onNotify?.("La déconnexion sera disponible avec le compte client.")}><LogOutIcon/> Se déconnecter</button>
  </div>
}
function LogOutIcon(){ return <ArrowLeft size={17}/> }

function SubscriptionScreen({ active, setActive, onBack, onAdd, onNotify }) {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(2);
  const [slots, setSlots] = useState(["matin", "soir"]);
  const [days, setDays] = useState([1, 2, 3, 4, 5, 6, 0]);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const dayLabels = [
    { value: 1, label: "L" }, { value: 2, label: "M" }, { value: 3, label: "M" },
    { value: 4, label: "J" }, { value: 5, label: "V" }, { value: 6, label: "S" }, { value: 0, label: "D" }
  ];

  function toggleSlot(slot) {
    setSlots(current => current.includes(slot) ? current.filter(item => item !== slot) : [...current, slot]);
  }

  function toggleDay(day) {
    setDays(current => current.includes(day) ? current.filter(item => item !== day) : [...current, day]);
  }

  const slotLabel = slots.length === 2 ? "matin + soir" : slots[0] === "matin" ? "matin" : slots[0] === "soir" ? "soir" : "aucun créneau";
  const dailyQty = quantity * slots.length;
  const dailyTotal = dailyQty * 200;
  const dayText = days.length === 7 ? "Tous les jours" : days.length === 5 && [1,2,3,4,5].every(day => days.includes(day)) ? "Lundi à vendredi" : days.length + " jours / semaine";

  const upcoming = useMemo(() => {
    if (!active || !slots.length || !days.length) return [];
    const result = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (let offset = 1; offset <= 14 && result.length < 4; offset += 1) {
      const date = new Date(cursor);
      date.setDate(cursor.getDate() + offset);
      if (!days.includes(date.getDay())) continue;
      const label = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(date);
      const selectedSlots = slots.includes("matin") && slots.includes("soir") ? ["matin", "soir"] : [...slots];
      selectedSlots.forEach(slot => {
        if (result.length >= 4) return;
        result.push({ label, slot, total: quantity * 200 });
      });
    }
    return result;
  }, [active, days, quantity, slots]);

  function saveChanges() {
    if (!slots.length || !days.length) {
      onNotify?.("Choisissez au moins un créneau et un jour.");
      return;
    }
    setEditing(false);
    onNotify?.("Votre abonnement a été mis à jour.");
  }

  function cancelSubscription() {
    setActive(false);
    setConfirmCancel(false);
    setEditing(false);
    onNotify?.("Votre abonnement est en pause. Il n’y aura plus de nouvelles commandes.");
  }

  return <div className="stack">
    <div className="page-head">
      <button className="back" onClick={onBack} aria-label="Retour"><ArrowLeft size={20}/></button>
      <div><span className="eyebrow">Achats récurrents</span><h1>Mon abonnement</h1></div>
    </div>

    <div className="subscription-hero">
      <span className="eyebrow muted">Votre routine</span>
      <h2>Votre routine,<br/>sans y penser.</h2>
      <p>Vous choisissez quand et combien. Les commandes sont ensuite générées selon cette règle.</p>
    </div>

    <section className="subscription-card">
      <div className="sub-head">
        <div>
          <span className={active ? "status green" : "status amber"}>{active ? "Actif" : "En pause"}</span>
          <h3>{quantity} Fondé · {slotLabel}</h3>
          <p>{dayText} · {dailyQty || 0} pots par jour sélectionné</p>
        </div>
        <span className="sub-status-icon">{active ? <Check size={18}/> : <Pause size={18}/>}</span>
      </div>

      <div className="sub-summary-grid">
        <div><Clock3 size={17}/><span><b>{dayText}</b><small>{slots.length ? slotLabel : "Aucun créneau"}</small></span></div>
        <div><WalletCards size={17}/><span><b>{money(dailyTotal)}</b><small>par jour sélectionné</small></span></div>
      </div>

      <div className="sub-actions">
        <button className="secondary" onClick={() => setEditing(value => !value)}>{editing ? "Fermer" : "Modifier"}</button>
        <button className={active ? "secondary" : "primary"} onClick={() => setActive(!active)}>
          {active ? <><Pause size={16}/> Mettre en pause</> : <><RotateCcw size={16}/> Reprendre</>}
        </button>
      </div>
    </section>

    {editing && <section className="subscription-editor">
      <div className="section-head"><div><span className="eyebrow">Réglages</span><h2>Comment voulez-vous recevoir votre fondé ?</h2></div></div>

      <div className="sub-editor-block">
        <div className="sub-editor-title"><b>Quantité par passage</b><span>{quantity} pot{quantity > 1 ? "s" : ""}</span></div>
        <div className="sub-quantity">
          <button className="stepper-btn" onClick={() => setQuantity(value => Math.max(1, value - 1))} aria-label="Retirer un pot"><Minus size={16}/></button>
          <strong>{quantity}</strong>
          <button className="stepper-btn" onClick={() => setQuantity(value => value + 1)} aria-label="Ajouter un pot"><Plus size={16}/></button>
        </div>
      </div>

      <div className="sub-editor-block">
        <div className="sub-editor-title"><b>Quand ?</b><span>{slotLabel}</span></div>
        <div className="sub-choice-row">
          <button className={slots.includes("matin") ? "sub-choice active" : "sub-choice"} onClick={() => toggleSlot("matin")}><Clock3 size={16}/><span>Matin</span></button>
          <button className={slots.includes("soir") ? "sub-choice active" : "sub-choice"} onClick={() => toggleSlot("soir")}><Clock3 size={16}/><span>Soir</span></button>
        </div>
      </div>

      <div className="sub-editor-block">
        <div className="sub-editor-title"><b>Quels jours ?</b><span>{dayText}</span></div>
        <div className="sub-days">
          {dayLabels.map(day => <button key={day.value} className={days.includes(day.value) ? "sub-day active" : "sub-day"} onClick={() => toggleDay(day.value)} aria-label={day.value === 0 ? "Dimanche" : "Jour " + day.value}><span>{day.label}</span></button>)}
        </div>
      </div>

      <div className="sub-editor-preview">
        <b>Votre règle</b>
        <span>{quantity} Fondé · {slotLabel} · {dayText}</span>
        <small>Chaque passage sera facturé séparément au moment de la commande.</small>
      </div>

      <button className="primary full" onClick={saveChanges}>Enregistrer les changements <Check size={17}/></button>
    </section>}

    <section className="next-orders">
      <div className="section-head">
        <div><span className="eyebrow">À venir</span><h2>Prochaines commandes</h2></div>
        {active && <span className="section-count">{upcoming.length}</span>}
      </div>

      {active && upcoming.length > 0 ? upcoming.map((order, index) =>
        <div className="mini-order" key={index}>
          <div><b>{order.label} · {order.slot}</b><small>{quantity} Fondé · {money(order.total)}</small></div>
          <ChevronRight size={17}/>
        </div>
      ) : <div className="subscription-empty"><Pause size={18}/><div><b>{active ? "Aucune prochaine commande" : "Abonnement en pause"}</b><small>{active ? "Choisissez au moins un jour et un créneau." : "Reprenez l’abonnement pour générer de nouvelles commandes."}</small></div></div>}
    </section>

    <div className="subscription-note"><WalletCards size={16}/><span>Chaque commande reste une commande normale : elle apparaîtra ensuite dans votre historique.</span></div>

    {confirmCancel ? <div className="subscription-danger">
      <b>Arrêter l’abonnement ?</b>
      <p>Les commandes déjà créées ne sont pas supprimées. Seules les prochaines ne seront plus générées.</p>
      <div><button className="secondary" onClick={() => setConfirmCancel(false)}>Garder</button><button className="danger-button" onClick={cancelSubscription}>Arrêter l’abonnement</button></div>
    </div> : <button className="text-link subscription-cancel" onClick={() => setConfirmCancel(true)}><Trash2 size={15}/> Arrêter l’abonnement</button>}

    <button className="primary full" onClick={onAdd}>Commander maintenant <ShoppingBag size={18}/></button>
  </div>
}
function EventRequestConfirmationScreen({ request, onHome, onBack }) {
  const isVoice = Boolean(request?.voice);
  return <div className="stack">
    <div className="page-head">
      <button className="back" onClick={onBack} aria-label="Retour"><ArrowLeft size={20}/></button>
      <div><span className="eyebrow">Service événement</span><h1>Votre demande</h1></div>
    </div>
    <section className="success-screen event-success-screen">
      <div className="success-icon"><Check size={32}/></div>
      <span className="eyebrow">{isVoice ? "Vocal reçu" : "Demande enregistrée"}</span>
      <h1>Votre demande est bien enregistrée.</h1>
      <p>Nous allons vérifier les détails de votre événement avant de vous proposer la suite.</p>
      <div className="event-request-status">
        <div className="event-status-step active"><span><Check size={14}/></span><div><b>Demande reçue</b><small>Votre demande est enregistrée.</small></div></div>
        <div className="event-status-step"><span>2</span><div><b>Vérification</b><small>Les détails et les disponibilités seront étudiés.</small></div></div>
        <div className="event-status-step"><span>3</span><div><b>Échange & proposition</b><small>Nous revenons vers vous pour valider les quantités et conditions.</small></div></div>
      </div>
      <div className="confirmation-summary">
        <b>Votre demande</b>
        <div><span>Format</span><strong>{isVoice ? "Message vocal original" : "Demande écrite"}</strong></div>
        <div><span>Statut</span><strong>Reçue</strong></div>
      </div>
      <div className="event-confirmation-actions">
        <button className="primary" onClick={onHome}>Retour à l’accueil <ArrowRight size={18}/></button>
        <button className="secondary" onClick={onBack}>Modifier ma demande</button>
      </div>
    </section>
  </div>;
}

function EventServiceScreen({ onBack, onSubmit }) {
  const [mode, setMode] = useState("voice");
  const [recording, setRecording] = useState(false);
  const [review, setReview] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => () => {
    window.clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    recorderRef.current?.stream?.getTracks().forEach(track => track.stop());
  }, [audioUrl]);

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("L’enregistrement vocal n’est pas disponible sur cet appareil.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setDuration(0);
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setRecording(false);
        setReview(true);
        stream.getTracks().forEach(track => track.stop());
        window.clearInterval(timerRef.current);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch {
      setError("Le micro n’a pas pu être utilisé. Vérifiez l’autorisation du navigateur.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function resetRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
    setAudioBlob(null);
    setDuration(0);
    setReview(false);
    setError("");
  }

  function formatDuration(value) {
    const minutes = Math.floor(value / 60);
    const seconds = String(value % 60).padStart(2, "0");
    return minutes + ":" + seconds;
  }

  function submitVoice() {
    if (!audioBlob) return;
    onSubmit({ voice: true, audio: audioBlob });
  }

  return <div className="stack">
    <div className="page-head">
      <button className="back" onClick={onBack} aria-label="Retour"><ArrowLeft size={20}/></button>
      <div><span className="eyebrow">Service événement</span><h1>Votre événement</h1></div>
    </div>

    <section className="event-intro">
      <span className="eyebrow"><CalendarDays size={14}/> Pour les grandes occasions</span>
      <h2>Expliquez-nous simplement ce qu’il vous faut.</h2>
      <p>Vous pouvez parler naturellement. Pas besoin de remplir un long formulaire.</p>
    </section>

    <div className="event-mode-tabs" role="tablist" aria-label="Mode de demande">
      <button className={mode === "voice" ? "active" : ""} onClick={() => setMode("voice")}><Mic size={18}/> Parler</button>
      <button className={mode === "text" ? "active" : ""} onClick={() => setMode("text")}><Utensils size={18}/> Écrire</button>
    </div>

    {mode === "voice" ? (
      <section className="event-voice-card">
        {!review ? <>
          <div className={recording ? "event-mic recording" : "event-mic"}><Mic size={34}/></div>
          <div className="event-record-time">{formatDuration(duration)}</div>
          <h3>{recording ? "Parlez naturellement" : "Parlez-nous de votre événement"}</h3>
          <p>{recording ? "Quand vous avez terminé, arrêtez l’enregistrement." : "Date, lieu, nombre de personnes, ce que vous souhaitez… dites tout comme à quelqu’un au téléphone."}</p>
          <button className={recording ? "secondary event-record-button" : "primary event-record-button"} onClick={recording ? stopRecording : startRecording}>
            {recording ? <><Square size={17}/> Arrêter</> : <><Mic size={18}/> Enregistrer mon vocal</>}
          </button>
          {recording && <span className="event-privacy-note">Le vocal original est conservé tel quel. Il n’est pas transcrit sur votre téléphone.</span>}
        </> : <>
          <span className="eyebrow">Votre vocal est prêt</span>
          <h3>Écoutez avant d’envoyer.</h3>
          <audio className="event-audio" controls src={audioUrl}/>
          <span className="event-audio-meta">{formatDuration(duration)} · fichier audio original</span>
          <div className="event-review-actions">
            <button className="secondary" onClick={resetRecording}>Recommencer</button>
            <button className="primary" onClick={submitVoice}><Send size={17}/> Envoyer ma demande</button>
          </div>
          <span className="event-privacy-note">Votre vocal sera traité côté service événement. Le client n’a pas besoin de le retranscrire.</span>
        </>}
        {error && <div className="voice-error" role="alert"><CircleHelp size={17}/>{error}</div>}
      </section>
    ) : (
      <section className="event-text-card">
        <div className="event-text-grid">
          <label className="field"><span>Quel événement ?</span><input placeholder="Ex. baptême, mariage, anniversaire..." /></label>
          <label className="field"><span>Date prévue</span><input type="date" min={localDateKey()} /></label>
          <label className="field"><span>Nombre de personnes</span><input type="number" min="1" inputMode="numeric" placeholder="Ex. 80" /></label>
          <label className="field"><span>Lieu</span><input placeholder="Quartier, salle, adresse..." /></label>
        </div>
        <label className="field"><span>Ce que vous souhaitez</span><textarea placeholder="Dites-nous les produits, quantités ou besoins particuliers..."/></label>
        <button className="primary full" onClick={() => onSubmit({ voice: false })}>Envoyer ma demande <ArrowRight size={18}/></button>
        <p className="event-text-note">Le prix et les détails définitifs seront confirmés après étude de votre demande.</p>
      </section>
    )}

    <div className="event-examples">
      <span className="eyebrow">Vous pouvez simplement dire</span>
      <p>« C’est pour un baptême samedi, environ 80 personnes. Je voudrais du fondé et du thiakry à Yeumbeul. »</p>
    </div>
  </div>
}

createRoot(document.getElementById("root")).render(<App />);
