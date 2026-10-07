const KEY="fonde44-orders",MAX=5;
function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v.filter(x=>x&&typeof x.id==="string"&&typeof x.token==="string"):[];}catch{return[];}}
function write(v){try{localStorage.setItem(KEY,JSON.stringify(v.slice(0,MAX)));}catch{}}
export function getTrackedOrders(){return read();}
export function rememberTrackedOrder({id,token,createdAt=new Date().toISOString()}){if(!id||!token)return;write([{id,token,createdAt},...read().filter(x=>x.id!==id)].slice(0,MAX));}
export function removeTrackedOrder(id){write(read().filter(x=>x.id!==id));}
