create extension if not exists pgcrypto;

create schema if not exists catalog;
create schema if not exists orders;
create schema if not exists events;
create schema if not exists media;
create schema if not exists auth;
create schema if not exists admin;

create table if not exists catalog.products (
  id text primary key, name text not null, unit text not null, price integer not null check(price>0),
  badge text, subtitle text, description text, image_url text, sort_order integer not null default 0,
  is_active boolean not null default true, stock_quantity integer not null default 0 check(stock_quantity>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists auth.staff_users (
  id bigserial primary key,
  public_id text not null unique default ('USR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  email text not null unique,
  display_name text not null,
  role text not null check(role in ('superadmin','mere-fonde','livreur')),
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists auth.sessions (
  id bigserial primary key,
  token_hash text not null unique,
  user_id bigint not null references auth.staff_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists auth.customers (
  id bigserial primary key,
  public_id text not null unique default ('CLI-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  email text not null,
  password_hash text null,
  google_sub text null unique,
  display_name text not null,
  phone text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz null,
  constraint auth_customers_auth_method_check check(password_hash is not null or google_sub is not null)
);
create unique index if not exists auth_customers_lower_email_idx on auth.customers(lower(email));

create table if not exists auth.customer_sessions (
  id bigserial primary key,
  token_hash text not null unique,
  customer_id bigint not null references auth.customers(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists auth_customer_sessions_customer_idx on auth.customer_sessions(customer_id);
create index if not exists auth_customer_sessions_expiry_idx on auth.customer_sessions(expires_at);
create index if not exists auth_sessions_expiry_idx on auth.sessions(expires_at);

create unique index if not exists auth_staff_users_active_role_idx
  on auth.staff_users(role) where is_active = true;

create table if not exists auth.activation_codes (
  id bigserial primary key,
  role text not null check(role in ('superadmin','mere-fonde','livreur')),
  code_hash text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists auth.login_attempts (
  id bigserial primary key,
  key text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists auth_login_attempts_key_time_idx
  on auth.login_attempts(key, attempted_at);

create table if not exists admin.audit_log (
  id bigserial primary key,
  actor_user_id bigint null references auth.staff_users(id),
  action text not null,
  target text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_at_idx
  on admin.audit_log(created_at desc);

create table if not exists orders.orders (
  id bigserial primary key,
  public_id text not null unique default ('FD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  client_reference text, customer_name text not null, customer_phone text not null, customer_address text,
  fulfillment text not null check(fulfillment in ('delivery','pickup')),
  payment_method text not null check(payment_method in ('cash','wave','orange_money')),
  order_timing text not null default 'now' check(order_timing in ('now','scheduled')),
  scheduled_at timestamptz,
  status text not null default 'received' check(status in ('received','confirmed','preparing','ready','assigned','out_for_delivery','delivered','cancelled')),
  subtotal integer not null check(subtotal>=0), delivery_fee integer not null default 0 check(delivery_fee>=0),
  total integer not null check(total>=0), customer_id bigint null references auth.customers(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists orders.order_items (
  id bigserial primary key, order_id bigint not null references orders.orders(id) on delete cascade,
  product_id text not null references catalog.products(id), product_name text not null, unit text not null,
  unit_price integer not null, quantity integer not null check(quantity>0), line_total integer not null
);

create table if not exists orders.subscriptions (
  id bigserial primary key,
  public_id text not null unique,
  customer_name text not null,
  customer_phone text not null,
  frequency text not null check(frequency in ('daily','weekly')),
  status text not null default 'active' check(status in ('active','paused','cancelled')),
  management_token_hash text not null,
  next_run_at timestamptz not null,
  schedule jsonb not null default '{}'::jsonb,
  fulfillment text not null default 'delivery' check(fulfillment in ('delivery','pickup')),
  delivery_address text not null default '',
  payment_method text not null default 'cash' check(payment_method in ('cash','wave','orange_money')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists orders.subscription_items (
  id bigserial primary key,
  subscription_id bigint not null references orders.subscriptions(id) on delete cascade,
  product_id text not null references catalog.products(id),
  quantity integer not null check(quantity > 0),
  unique(subscription_id, product_id)
);

create table if not exists orders.payments (
  id bigserial primary key,
  public_id text not null unique,
  order_id bigint not null references orders.orders(id) on delete cascade,
  provider text not null check(provider in ('cash','wave','orange_money')),
  method text not null check(method in ('cash','wave','orange_money')),
  provider_reference text,
  payment_url text,
  amount integer not null check(amount >= 0),
  status text not null default 'pending' check(status in ('pending','paid','failed','refunded')),
  failure_reason text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create unique index if not exists orders_client_reference_idx on orders.orders(client_reference) where client_reference is not null;
create index if not exists orders_customer_id_idx on orders.orders(customer_id);

create table if not exists events.voice_requests (
  id bigserial primary key,
  public_id text not null unique,
  storage_key text not null,
  url text not null,
  mime_type text not null,
  size_bytes integer not null check(size_bytes > 0),
  duration_seconds integer not null default 0 check(duration_seconds between 0 and 600),
  status text not null default 'new' check(status in ('new','heard','processed','archived')),
  created_at timestamptz not null default now()
);

create table if not exists events.event_requests (
  id bigserial primary key,
  public_id text not null unique default ('EV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  type text not null, people integer not null check(people>0), requested_date date not null,
  phone text not null, location text not null default '', details text not null default '', status text not null default 'new' check(status in ('new','contacted','quoted','confirmed','cancelled')),
  created_at timestamptz not null default now()
);

insert into catalog.products(id,name,unit,price,badge,subtitle,description,image_url,sort_order)
values
('fonde','Fondé','pot',200,'Le classique','Mil traditionnel, préparé du jour','Une préparation de mil douce et réconfortante, préparée chaque jour par Mère Fondé.','https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=85',1),
('thiakry','Thiakry','pot',300,'Très demandé','Mil & lait caillé, frais','Un thiakry généreux et frais, idéal le matin, en dessert ou pour une pause gourmande.','https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=85',2),
('poudre','Poudre de mil','kg',1500,'Maison','Pour vos préparations maison','Poudre de mil préparée avec soin pour vos bouillies et recettes à la maison.','https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=1200&q=85',3)
on conflict(id) do update set price=excluded.price,name=excluded.name,is_active=true;


create table if not exists media.assets (
  id text primary key default ('MED-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  storage_key text,
  url text not null,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

create table if not exists media.product_media (
  product_id text primary key references catalog.products(id) on delete cascade,
  media_id text not null references media.assets(id) on delete cascade,
  is_primary boolean not null default true,
  sort_order integer not null default 0
);

insert into media.assets(id, storage_key, url, mime_type)
select 'MED-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)), 'legacy/' || p.id, p.image_url, 'image/*'
from catalog.products p
where p.image_url is not null
  and not exists (
    select 1 from media.product_media pm where pm.product_id = p.id
  );

insert into media.product_media(product_id, media_id, is_primary)
select p.id, a.id, true
from catalog.products p
join media.assets a on a.url = p.image_url
where not exists (
  select 1 from media.product_media pm where pm.product_id = p.id
);
