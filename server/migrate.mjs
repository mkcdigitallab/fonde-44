import pg from "pg";

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
    alter table orders.orders add column if not exists order_timing text not null default 'now';
    alter table orders.orders add column if not exists scheduled_at timestamptz;
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
  console.log("Fondé 44 DB local: migrations OK");
} finally {
  await pool.end();
}
