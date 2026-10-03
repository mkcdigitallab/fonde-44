import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Clock3, Home, MapPin, Menu, Mic, Minus, Package, Phone, Plus, QrCode, Search, Share2, ShoppingBag, Sparkles, Sun, Moon, MessageCircle, Truck, UserRound, Utensils, CircleHelp, X, RefreshCcw } from "lucide-react";
import { DELIVERY_FEE, MIN_DELIVERY_POTS, money, cartCount, cartSubtotal, canDeliver } from "./data";
import { getProducts, createOrder, createEventRequest } from "./services/api";
import { storage } from "./storage";
import "./styles.css";

const WA_PHONE = import.meta.env.VITE_WHATSAPP_PHONE || "";

function makeClientReference() {
  return globalThis.crypto?.randomUUID?.() || "fd-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function spokenNumber(text) {
  const words = { un:1, une:1, deux:2, trois:3, quatre:4, cinq:5, six:6, sept:7, huit:8, neuf:9, dix:10 };
  const digit = text.match(/\d+/);
  if (digit) return Number(digit[0]);
  const word = Object.keys(words).find(key => new RegExp("\\b" + key + "\\b", "i").test(text));
  return word ? words[word] : 1;
}

function openWhatsApp(message) {
  if (!WA_PHONE) return false;
  const phone = WA_PHONE.replace(/\D/g, "");
  window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  return true;
}
const nav = [
  { id:"home", label:"Accueil", icon:Home }, { id:"shop", label:"Commander", icon:ShoppingBag },
  { id:"orders", label:"Commandes", icon:Package }, { id:"profile", label:"Profil", icon:UserRound }
];

function App(){
  const source=new URLSearchParams(location.search).get("source"), qrEntry=location.pathname==="/q"||source;
  const [screen,setScreen]=useState("home"), [cart,setCart]=useState(storage.getCart()), [orders,setOrders]=useState(storage.getOrders());
  const [products,setProducts]=useState([]), [productsLoading,setProductsLoading]=useState(true), [productsError,setProductsError]=useState("");
  const [profile,setProfile]=useState(storage.getProfile()), [theme,setTheme]=useState(storage.getTheme()), [selected,setSelected]=useState(null);
  const [toast,setToast]=useState(""), [qrBanner,setQrBanner]=useState(qrEntry), [search,setSearch]=useState(""), [checkoutStep,setCheckoutStep]=useState(0), [category,setCategory]=useState("all"), [submitting,setSubmitting]=useState(false);
  const [deliveryMode,setDeliveryMode]=useState("delivery"), [payment,setPayment]=useState("cash"), [eventOpen,setEventOpen]=useState(false), [menuOpen,setMenuOpen]=useState(false), [voiceListening,setVoiceListening]=useState(false);
  useEffect(()=>{document.documentElement.dataset.theme=theme;storage.setTheme(theme)},[theme]);
  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true);
    getProducts()
      .then(items => { if (!cancelled) { setProducts(items); setProductsError(""); } })
      .catch(() => { if (!cancelled) setProductsError("Le catalogue est momentanément indisponible."); })
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(()=>storage.setCart(cart),[cart]); useEffect(()=>storage.setOrders(orders),[orders]); useEffect(()=>storage.setProfile(profile),[profile]);
  const filtered=useMemo(()=>products.filter(p=>{
    const matchesSearch=(p.name+" "+p.subtitle+" "+(p.badge||"")).toLowerCase().includes(search.toLowerCase());
    const matchesCategory=category==="all" || (category==="maison" ? p.id==="poudre" : category==="fonde" ? p.id==="fonde" : category==="thiakry" ? p.id==="thiakry" : true);
    return matchesSearch && matchesCategory;
  }),[products,search,category]);
  const count=cartCount(cart), subtotal=cartSubtotal(cart), eligible=canDeliver(cart), deliveryFee=deliveryMode==="delivery"&&eligible?DELIVERY_FEE:0, total=subtotal+deliveryFee;
  function go(next){setScreen(next);setMenuOpen(false);window.scrollTo({top:0,behavior:"smooth"})}
  function notify(message){setToast(message);clearTimeout(window.__fondeToast);window.__fondeToast=setTimeout(()=>setToast(""),2600)}
  function add(product,qty=1){setCart(c=>{const e=c.find(x=>x.id===product.id);return e?c.map(x=>x.id===product.id?{...x,qty:x.qty+qty}:x):[...c,{...product,qty}]});notify(product.name+" ajouté au panier")}
  function changeQty(id,delta){setCart(c=>c.map(x=>x.id===id?{...x,qty:x.qty+delta}:x).filter(x=>x.qty>0))}
  async function submitOrder(){
    if(!profile.name.trim()||!profile.phone.trim()) return notify("Ajoutez votre nom et votre téléphone");
    if(!cart.length) return notify("Votre panier est vide");
    if(deliveryMode==="delivery"&&(!eligible||!profile.address.trim())) return notify(!eligible?"Livraison à partir de 3 pots":"Ajoutez votre adresse");
    setSubmitting(true);
    try {
      const response=await createOrder({
        clientReference: makeClientReference(),
        customer:{name:profile.name.trim(),phone:profile.phone.trim(),address:profile.address.trim()},
        items:cart.map(item=>({productId:item.id,quantity:item.qty})),
        fulfillment:deliveryMode,
        paymentMethod:payment==="om"?"orange_money":payment,
      });
      const data=response.data;
      const order={
        id:data.id, createdAt:data.createdAt, status:data.status,
        customer:{...profile},
        items:data.items.map(item=>({id:item.productId,name:item.name,price:item.unitPrice,unit:item.unit,qty:item.quantity})),
        deliveryMode, address:profile.address.trim(), payment,
        subtotal:data.subtotal, delivery:data.delivery, total:data.total,
      };
      setOrders(current=>[order,...current]);
      setCart([]); setCheckoutStep(3);
      const text=[
        "Bonjour Mère Fondé 👋","Nouvelle commande "+order.id,
        "Client : "+order.customer.name,"Téléphone : "+order.customer.phone,
        ...order.items.map(i=>"• "+i.qty+" "+i.name+" — "+money(i.price*i.qty)),
        "Réception : "+(order.deliveryMode==="delivery"?"Livraison":"Retrait"),
        order.address?"Adresse : "+order.address:"",
        "Paiement souhaité : "+({cash:"Espèces",wave:"Wave",om:"Orange Money"}[order.payment]||order.payment),
        "Total : "+money(order.total)
      ].filter(Boolean).join("\n");
      if(WA_PHONE) openWhatsApp(text);
    } catch(error) {
      const messages={minimum_delivery_quantity:"Livraison à partir de 3 pots",delivery_address_required:"Ajoutez votre adresse de livraison",product_unavailable:"Un produit de votre panier n'est plus disponible. Actualisez le catalogue."};
      notify(messages[error.message]||"Impossible d'enregistrer la commande. Vérifiez votre connexion.");
    } finally { setSubmitting(false); }
  }
  function startVoice(){
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition) return notify("La commande vocale n’est pas disponible sur ce navigateur");
    if(!products.length) return notify("Le catalogue n’est pas encore chargé");
    const r=new Recognition(); r.lang="fr-FR"; r.interimResults=false; setVoiceListening(true);
    r.onresult=e=>{
      const text=e.results[0][0].transcript.toLowerCase();
      const found=products.find(p=>text.includes(p.name.toLowerCase()));
      const number=Math.max(1,spokenNumber(text));
      if(found){add(found,number);go("cart");notify("J’ai compris : "+number+" "+found.name)}
      else notify("Dites par exemple « 3 fondé » ou « trois thiakry »");
      setVoiceListening(false);
    };
    r.onerror=()=>{setVoiceListening(false);notify("Je n’ai pas compris. Réessayez.")};
    r.onend=()=>setVoiceListening(false);
    r.start();
  }
  return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={()=>go("home")}><span className="brand-mark">F</span><span><b>Fondé</b> 44</span></button>
      <div className="top-actions"><button className="icon-button" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label="Changer de thème">{theme==="dark"?<Sun size={19}/>:<Moon size={19}/>}</button>
      <button className="icon-button menu-button" onClick={()=>setMenuOpen(v=>!v)} aria-label="Menu"><Menu size={20}/></button>
      <button className="cart-pill" onClick={()=>go("cart")} aria-label={"Panier "+count}><ShoppingBag size={18}/><span>{count}</span></button></div>
    </header>
    {menuOpen&&<div className="mobile-menu"><button onClick={()=>go("about")}><Sparkles size={17}/>Pourquoi Fondé 44</button><button onClick={()=>{setEventOpen(true);setMenuOpen(false)}}><CalendarDays size={17}/>Événements / cérémonies</button><button onClick={()=>{setMenuOpen(false);if(!openWhatsApp("Bonjour Mère Fondé, je souhaite avoir des informations sur Fondé 44."))notify("Le contact WhatsApp sera configuré avant le lancement.")}}><MessageCircle size={17}/>Contacter Mère Fondé</button></div>}
    {qrBanner&&<div className="qr-banner"><QrCode size={17}/><span>Bienvenue chez Fondé 44. Vous avez scanné notre QR : découvrez, puis commandez quand vous êtes prêt.</span><button onClick={()=>setQrBanner(false)}><X size={16}/></button></div>}
    <main className="content">
      {screen==="home"&&<HomeScreen onShop={()=>go("shop")} onAdd={add} onVoice={startVoice} voiceListening={voiceListening} onOrders={()=>go("orders")} onEvent={()=>setEventOpen(true)} source={source}/>}
      {screen==="shop"&&<ShopScreen products={filtered} search={search} setSearch={setSearch} onBack={()=>go("home")} onSelect={p=>{setSelected(p);go("product")}} onAdd={add}/>}
      {screen==="product"&&selected&&<ProductScreen product={selected} onBack={()=>go("shop")} onAdd={add}/>}
      {screen==="cart"&&<CartScreen cart={cart} onBack={()=>go("shop")} onChange={changeQty} deliveryMode={deliveryMode} setDeliveryMode={setDeliveryMode} eligible={eligible} subtotal={subtotal} deliveryFee={deliveryFee} total={total} onCheckout={()=>{if(!cart.length)return notify("Votre panier est vide");setCheckoutStep(0);go("checkout")}}/>}
      {screen==="checkout"&&<CheckoutScreen step={checkoutStep} setStep={setCheckoutStep} profile={profile} setProfile={setProfile} deliveryMode={deliveryMode} setDeliveryMode={setDeliveryMode} payment={payment} setPayment={setPayment} total={total} onBack={()=>go("cart")} onDone={()=>go("orders")} onSubmit={submitOrder}/>}
      {screen==="orders"&&<OrdersScreen orders={orders} onBack={()=>go("home")} onReorder={order=>{order.items.forEach(i=>{const p=PRODUCTS.find(x=>x.id===i.id);if(p)add(p,i.qty)});go("cart")}}/>}
      {screen==="profile"&&<ProfileScreen profile={profile} setProfile={setProfile} theme={theme} setTheme={setTheme} onBack={()=>go("home")} onShare={()=>shareSite(notify)}/>}
      {screen==="about"&&<AboutScreen onBack={()=>go("home")} onShop={()=>go("shop")}/>}
    </main>
    <nav className="bottom-nav">{nav.map(item=>{const Icon=item.icon,active=screen===item.id||(item.id==="shop"&&["product","cart","checkout"].includes(screen));return <button key={item.id} className={active?"nav-item active":"nav-item"} onClick={()=>go(item.id)}><Icon size={20}/><span>{item.label}</span></button>})}</nav>
    {eventOpen&&<EventModal onClose={()=>setEventOpen(false)} onSubmit={async payload=>{try{const response=await createEventRequest(payload);setEventOpen(false);notify("Demande envoyée. Référence "+response.data.public_id)}catch(error){notify("Impossible d'envoyer la demande pour le moment.")}}}/>} {toast&&<div className="toast"><Check size={18}/>{toast}</div>}
  </div>
}

function shareSite(notify){if(navigator.share)navigator.share({title:"Fondé 44",text:"Découvrez Fondé 44",url:location.origin+"/q"}).catch(()=>{});else navigator.clipboard?.writeText(location.origin+"/q").then(()=>notify("Lien Fondé 44 copié"))}
function HomeScreen({products,loading,error,onRetry,onShop,onAdd,onVoice,voiceListening,onOrders,onEvent,source}){return <div className="stack">
  <section className="hero"><div className="hero-copy"><span className="eyebrow"><Sparkles size={14}/>Préparé aujourd’hui</span><h1>Le goût du mil,<br/><em>à portée de main.</em></h1><p>Fondé et thiakry préparés avec soin par Mère Fondé. Découvrez d’abord, commandez quand vous êtes prêt.</p><div className="hero-actions"><button className="primary" onClick={onShop}>Découvrir <ArrowRight size={18}/></button><button className="voice" onClick={onVoice}><Mic size={18}/><span>{voiceListening?"J’écoute…":"Commander par voix"}</span></button></div>{source&&<small className="source-note">QR · {source.replaceAll("-"," ")}</small>}</div><div className="hero-image-wrap">{products[1]&&<img src={products[1].image} alt={products[1].name}/>} {!products[1]&&<div className="hero-image-placeholder">Fondé 44</div>}<div className="floating-note"><span className="dot"/><div><b>Frais du jour</b><small>Préparé avec soin</small></div></div></div></section>
  <section className="trust-row"><div><b>200 F</b><span>le pot de fondé</span></div><div><b>300 F</b><span>le pot de thiakry</span></div><div><b>3 pots</b><span>minimum pour livraison</span></div></section>
  <section className="section"><div className="section-head"><div><span className="eyebrow">Nos essentiels</span><h2>Choisissez votre envie</h2></div><button className="text-link" onClick={onShop}>Tout voir <ChevronRight size={16}/></button></div>{loading?<div className="loading-card">Chargement du catalogue…</div>:error?<div className="empty"><h3>Catalogue indisponible</h3><p>{error}</p><button className="secondary" onClick={onRetry}>Réessayer</button></div>:<div className="product-grid">{products.slice(0,2).map(p=><ProductCard key={p.id} product={p} onAdd={onAdd}/>)}</div>}</section>
  <section className="dark-card"><div><span className="eyebrow muted">Simple pour vous</span><h3>Vous dites.<br/>Fondé 44 s’occupe du reste.</h3><p>Vous pouvez commander par écran ou à la voix. Pas besoin de compte pour découvrir.</p><button className="light-button" onClick={onVoice}><Mic size={16}/>Essayer la commande vocale</button></div><div className="mini-orbit"><Utensils size={34}/></div></section>
  <section className="section two-col"><button className="feature-card" onClick={onEvent}><CalendarDays size={22}/><b>Baptême, fête, cérémonie</b><span>Parlez-nous de votre événement et de vos quantités.</span></button><button className="feature-card" onClick={onOrders}><Package size={22}/><b>Déjà commandé ?</b><span>Retrouvez vos commandes sur cet appareil.</span></button></section>
</div>}
function ProductCard({product,onAdd}){return <article className="product-card"><div className="image-box"><img src={product.image} alt={product.name}/><span className="badge">{product.badge}</span></div><div className="product-info"><div><h3>{product.name}</h3><p>{product.subtitle}</p></div><strong>{money(product.price)}</strong></div><button className="add-button" onClick={()=>onAdd(product)}><Plus size={18}/>Ajouter</button></article>}
function ShopScreen({products,loading,error,search,setSearch,category,setCategory,onBack,onSelect,onAdd}){return <div className="stack"><div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Catalogue</span><h1>Commander</h1></div><button className="icon-button"><CircleHelp size={19}/></button></div><div className="search-box"><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher fondé, thiakry…" aria-label="Rechercher"/></div><div className="filter-row">{[["all","Tout"],["fonde","Fondé"],["thiakry","Thiakry"],["maison","Maison"]].map(([id,label])=><button key={id} className={category===id?"filter active":"filter"} onClick={()=>setCategory(id)}>{label}</button>)}</div>{loading?<div className="loading-card">Chargement du catalogue…</div>:error?<div className="empty"><h3>Impossible de charger les produits</h3><p>{error}</p></div>:<div className="catalog-list">{products.map(p=><article className="catalog-card" key={p.id} onClick={()=>onSelect(p)}><img src={p.image} alt={p.name}/><div className="catalog-copy"><span className="tiny-badge">{p.badge}</span><h3>{p.name}</h3><p>{p.subtitle}</p><strong>{money(p.price)} <small>/ {p.unit}</small></strong></div><button className="round-add" aria-label={"Ajouter "+p.name} onClick={e=>{e.stopPropagation();onAdd(p)}}><Plus size={19}/></button></article>)}</div>{!products.length&&<div className="empty"><Search size={28}/><h3>Aucun produit</h3><p>Essayez un autre mot.</p></div>}</div>}
function ProductScreen({product,onBack,onAdd}){const [qty,setQty]=useState(1);return <div className="stack"><div className="product-detail-image"><img src={product.image} alt={product.name}/><button className="floating-back" onClick={onBack}><ArrowLeft size={20}/></button><span className="badge detail-badge">{product.badge}</span></div><div className="detail-content"><span className="eyebrow">Préparé avec soin</span><div className="detail-title"><div><h1>{product.name}</h1><p>{product.subtitle}</p></div><strong>{money(product.price)}</strong></div><p className="detail-description">{product.description}</p><div className="info-strip"><div><Clock3 size={18}/><span>Préparé du jour</span></div><div><Package size={18}/><span>Qualité maison</span></div><div><Truck size={18}/><span>Livraison dès 3 pots</span></div></div><div className="qty-line"><div><b>Quantité</b><small>{product.unit}</small></div><div className="stepper"><button onClick={()=>setQty(Math.max(1,qty-1))}><Minus size={16}/></button><b>{qty}</b><button onClick={()=>setQty(qty+1)}><Plus size={16}/></button></div></div><button className="primary full" onClick={()=>onAdd(product,qty)}>Ajouter au panier · {money(product.price*qty)} <ShoppingBag size={18}/></button></div></div>}
function CartScreen({cart,onBack,onChange,deliveryMode,setDeliveryMode,eligible,subtotal,deliveryFee,total,onCheckout}){return <div className="stack"><div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Votre sélection</span><h1>Panier</h1></div></div>{!cart.length?<div className="empty large"><ShoppingBag size={35}/><h2>Votre panier est vide</h2><p>Ajoutez quelques pots préparés du jour.</p><button className="primary" onClick={onBack}>Voir les produits</button></div>:<><div className="cart-list">{cart.map(item=><div className="cart-item" key={item.id}><img src={item.image} alt={item.name}/><div className="cart-main"><b>{item.name}</b><small>{money(item.price)} / {item.unit}</small><div className="cart-bottom"><strong>{money(item.price*item.qty)}</strong><div className="stepper small"><button onClick={()=>onChange(item.id,-1)}><Minus size={14}/></button><b>{item.qty}</b><button onClick={()=>onChange(item.id,1)}><Plus size={14}/></button></div></div></div></div>)}</div><div className="delivery-choice"><span className="eyebrow">Réception</span><h2>Comment recevoir ?</h2><div className="choice-grid"><button className={deliveryMode==="delivery"?"choice active":"choice"} onClick={()=>setDeliveryMode("delivery")}><Truck size={20}/><b>Livraison</b><small>{eligible?"500 FCFA":"À partir de 3 pots"}</small></button><button className={deliveryMode==="pickup"?"choice active":"choice"} onClick={()=>setDeliveryMode("pickup")}><MapPin size={20}/><b>Retrait</b><small>Gratuit</small></button></div></div>{deliveryMode==="delivery"&&!eligible&&<div className="notice"><Truck size={18}/><span>Ajoutez encore {MIN_DELIVERY_POTS-cartCount(cart)} pot(s) pour débloquer la livraison.</span></div>}<div className="summary"><div><span>Sous-total</span><b>{money(subtotal)}</b></div><div><span>Livraison</span><b>{deliveryFee?money(deliveryFee):"—"}</b></div><div className="total"><span>Total</span><strong>{money(total)}</strong></div></div><button className="primary full" onClick={onCheckout}>Continuer <ArrowRight size={18}/></button></>}</div>}
function CheckoutScreen({step,setStep,profile,setProfile,deliveryMode,setDeliveryMode,payment,setPayment,total,submitting,onBack,onDone,onSubmit}){if(step===3)return <div className="success-screen"><div className="success-icon"><Check size={32}/></div><span className="eyebrow">C’est confirmé</span><h1>Commande reçue.</h1><p>Votre commande est enregistrée sur cet appareil. Si WhatsApp est configuré, le récapitulatif a aussi été envoyé à Mère Fondé.</p><button className="primary" onClick={onDone}>Voir mes commandes <ArrowRight size={18}/></button></div>;const labels=["Réception","Vos infos","Paiement"];return <div className="stack"><div className="page-head"><button className="back" onClick={()=>step===0?onBack():setStep(step-1)}><ArrowLeft size={20}/></button><div><span className="eyebrow">Commande</span><h1>{labels[step]}</h1></div></div><div className="progress">{labels.map((x,i)=><div key={x} className={i<=step?"progress-dot active":"progress-dot"}><span>{i+1}</span><small>{x}</small></div>)}</div>{step===0&&<div className="stack compact"><button className={deliveryMode==="delivery"?"big-choice active":"big-choice"} onClick={()=>setDeliveryMode("delivery")}><Truck size={23}/><div><b>Livraison à domicile</b><small>Disponible à partir de {MIN_DELIVERY_POTS} pots.</small></div>{deliveryMode==="delivery"&&<Check size={19}/>}</button><button className={deliveryMode==="pickup"?"big-choice active":"big-choice"} onClick={()=>setDeliveryMode("pickup")}><MapPin size={23}/><div><b>Retrait</b><small>Vous récupérez directement votre commande.</small></div>{deliveryMode==="pickup"&&<Check size={19}/>}</button><button className="primary full" onClick={()=>setStep(1)}>Continuer</button></div>}{step===1&&<div className="stack compact"><label className="field"><span>Votre nom</span><input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Ex. Awa Diop" autoComplete="name"/></label><label className="field"><span>Téléphone</span><input value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="+221 77 000 00 00" inputMode="tel" autoComplete="tel"/></label>{deliveryMode==="delivery"&&<label className="field"><span>Adresse / quartier</span><div className="input-icon"><MapPin size={18}/><input value={profile.address} onChange={e=>setProfile({...profile,address:e.target.value})} placeholder="Quartier, repère, rue…" autoComplete="street-address"/></div></label>}<div className="privacy-note"><Check size={15}/>Vos informations restent sur cet appareil dans cette version MVP.</div><button className="primary full" onClick={()=>{if(!profile.name.trim()||!profile.phone.trim())return;if(deliveryMode==="delivery"&&!profile.address.trim())return;setStep(2)}}>Continuer</button></div>}{step===2&&<div className="stack compact"><div className="payment-list">{[["cash","Espèces","À la livraison"],["wave","Wave","Paiement mobile"],["om","Orange Money","Paiement mobile"]].map(([id,name,desc])=><button key={id} className={payment===id?"payment active":"payment"} onClick={()=>setPayment(id)}><span className={"payment-logo "+id}>{id==="wave"?"W":id==="om"?"O":"₣"}</span><div><b>{name}</b><small>{desc}</small></div>{payment===id&&<Check size={19}/>}</button>)}</div><div className="summary"><div><span>Total à confirmer</span><strong>{money(total)}</strong></div></div><button className="primary full" disabled={submitting} onClick={onSubmit}>{submitting?"Enregistrement…":"Confirmer la commande"} {!submitting&&<Check size={18}/>}</button></div>}</div>}
function OrdersScreen({orders,onBack,onReorder}){return <div className="stack"><div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Votre espace</span><h1>Commandes</h1></div></div>{!orders.length?<div className="empty large"><Package size={34}/><h2>Aucune commande</h2><p>Votre historique apparaîtra ici après votre première commande.</p></div>:<div className="order-list">{orders.map(order=><article className="order-card" key={order.id}><div className="order-top"><div><b>{order.id}</b><small>{new Date(order.createdAt).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})}</small></div><span className="status">Reçue</span></div><p>{order.items.map(i=>i.qty+" × "+i.name).join(" · ")}</p><div className="order-bottom"><span>{order.deliveryMode==="delivery"?"Livraison":"Retrait"}</span><strong>{money(order.total)}</strong></div><button className="secondary full" onClick={()=>onReorder(order)}><RefreshCcw size={16}/>Recommander</button></article>)}</div>}</div>}
function ProfileScreen({profile,setProfile,theme,setTheme,onBack,onShare}){return <div className="stack"><div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Votre espace</span><h1>Profil</h1></div></div><div className="profile-card"><div className="avatar">{(profile.name||"F").slice(0,1).toUpperCase()}</div><div><b>{profile.name||"Votre nom"}</b><small>{profile.phone||"Ajoutez votre téléphone à la prochaine commande"}</small></div></div><div className="settings-list"><label className="setting"><UserRound size={18}/><div><b>Nom</b><small>Pour vos commandes</small></div><input className="setting-input" value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="Votre nom"/></label><label className="setting"><Phone size={18}/><div><b>Téléphone</b><small>Pour vous joindre</small></div><input className="setting-input" value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="+221…"/></label><button className="setting" onClick={()=>setTheme(theme==="dark"?"light":"dark")}><Sun size={18}/><div><b>Apparence</b><small>{theme==="dark"?"Mode sombre":"Mode clair"}</small></div>{theme==="dark"?<Moon size={18}/>:<Sun size={18}/>}</button><button className="setting" onClick={onShare}><Share2 size={18}/><div><b>Partager Fondé 44</b><small>Copier ou partager le lien QR</small></div><ChevronRight size={17}/></button></div><div className="contact-card"><MessageCircle size={22}/><div><b>Besoin d’aide ?</b><span>La commande doit rester simple : vous pouvez toujours nous contacter.</span></div></div></div>}
function AboutScreen({onBack,onShop}){return <div className="stack"><div className="page-head"><button className="back" onClick={onBack}><ArrowLeft size={20}/></button><div><span className="eyebrow">Fondé 44</span><h1>Une histoire simple.</h1></div></div><section className="about-card"><span className="eyebrow">Mère Fondé</span><h2>Du mil préparé avec soin, maintenant accessible sans se déplacer.</h2><p>Fondé 44 commence par une idée simple : découvrir le produit facilement, commander quand on le souhaite et garder une relation directe avec Mère Fondé.</p><div className="about-points"><div><QrCode size={19}/><b>Scannez</b><span>sur un pot, une affiche ou chez un partenaire.</span></div><div><ShoppingBag size={19}/><b>Découvrez</b><span>les produits et leurs prix.</span></div><div><Truck size={19}/><b>Commandez</b><span>avec livraison dès 3 pots.</span></div></div><button className="primary full" onClick={onShop}>Voir les produits <ArrowRight size={18}/></button></section></div>}
function EventModal({onClose,onSubmit}){
  const [type,setType]=useState("Baptême"),[people,setPeople]=useState(""),[date,setDate]=useState(""),[phone,setPhone]=useState("");
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal"><button className="modal-close" onClick={onClose}><X size={19}/></button><span className="eyebrow">Sur mesure</span><h2>Vous préparez un événement ?</h2><p>Donnez-nous quelques informations. Mère Fondé pourra vous recontacter pour les quantités et la préparation.</p><div className="event-types">{["Baptême","Fête","Religieux","Autre"].map(x=><button key={x} className={type===x?"selected":""} onClick={()=>setType(x)}>{x}</button>)}</div><label className="field"><span>Nombre de personnes</span><input type="number" min="1" value={people} onChange={e=>setPeople(e.target.value)} placeholder="Ex. 50"/></label><label className="field"><span>Date souhaitée</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="field"><span>Téléphone</span><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+221…"/></label><button className="primary full" disabled={!people||!date||!phone} onClick={()=>onSubmit({type,people:Number(people),date,phone})}>Envoyer ma demande <ArrowRight size={17}/></button></div></div>
}

createRoot(document.getElementById("root")).render(<App />);
