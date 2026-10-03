import pg from "pg";
import { randomBytes, scryptSync } from "node:crypto";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 5000,
});

try {
  await pool.query(`
    create schema if not exists catalog;
    create schema if not exists orders;
    create schema if not exists events;
    create schema if not exists media;
    create schema if not exists auth;

    do $$
    begin
      if to_regclass('public.products') is not null and to_regclass('catalog.products') is null then
        alter table public.products set schema catalog;
      end if;
      if to_regclass('public.orders') is not null and to_regclass('orders.orders') is null then
        alter table public.orders set schema orders;
      end if;
      if to_regclass('public.order_items') is not null and to_regclass('orders.order_items') is null then
        alter table public.order_items set schema orders;
      end if;
      if to_regclass('public.event_requests') is not null and to_regclass('events.event_requests') is null then
        alter table public.event_requests set schema events;
      end if;
    end $$;

    create table if not exists auth.staff_users (
      id bigserial primary key,
      public_id text not null unique default ('USR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
      email text not null unique,
      display_name text not null,
      role text not null check(role in ('mere-fonde','livreur')),
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

    alter table orders.orders add column if not exists client_reference text;
    alter table orders.subscriptions add column if not exists schedule jsonb not null default '{}'::jsonb;
    alter table orders.subscriptions add column if not exists fulfillment text not null default 'delivery';
    alter table orders.subscriptions add column if not exists delivery_address text not null default '';
    alter table orders.subscriptions add column if not exists payment_method text not null default 'cash';
    alter table orders.orders add column if not exists order_timing text not null default 'now';
    alter table orders.orders add column if not exists scheduled_at timestamptz;
    alter table events.event_requests add column if not exists location text not null default '';
    alter table events.event_requests add column if not exists details text not null default '';
    create unique index if not exists orders_client_reference_idx
      on orders.orders(client_reference)
      where client_reference is not null;

    insert into media.assets(storage_key, url, mime_type)
    select 'legacy/' || p.id, p.image_url, 'image/*'
    from catalog.products p
    where p.image_url is not null
      and not exists (select 1 from media.product_media pm where pm.product_id = p.id);

    insert into media.product_media(product_id, media_id, is_primary)
    select p.id, a.id, true
    from catalog.products p
    join media.assets a on a.url = p.image_url
    where not exists (select 1 from media.product_media pm where pm.product_id = p.id);
  `);
  const users = [
    { email: process.env.FONDE44_MERE_EMAIL || "mere@fonde44.local", name: "Mère Fondé", role: "mere-fonde", password: process.env.FONDE44_MERE_PASSWORD || "fonde44-local" },
    { email: process.env.FONDE44_LIVREUR_EMAIL || "livreur@fonde44.local", name: "Livreur", role: "livreur", password: process.env.FONDE44_LIVREUR_PASSWORD || "livreur44-local" }
  ];
  for (const user of users) {
    const exists = await pool.query("select id from auth.staff_users where email=$1",[user.email.toLowerCase()]);
    if (!exists.rows[0]) {
      const salt = randomBytes(16).toString("hex");
      const passwordHash = salt + ":" + scryptSync(user.password,salt,64).toString("hex");
      await pool.query("insert into auth.staff_users(email,display_name,role,password_hash) values($1,$2,$3,$4)",[user.email.toLowerCase(),user.name,user.role,passwordHash]);
    }
  }
  await pool.query("delete from auth.sessions where expires_at < now()");
  console.log("Fondé 44 DB local: migrations OK");
} finally {
  await pool.end();
}
