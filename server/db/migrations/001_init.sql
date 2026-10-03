BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA catalog;
CREATE SCHEMA orders;
CREATE SCHEMA auth;
CREATE SCHEMA admin;

CREATE TABLE auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role text NOT NULL CHECK (role IN ('superadmin', 'mere-fonde', 'livreur', 'client')),
    email text,
    password_hash text NULL,
    google_sub text NULL UNIQUE,
    full_name text NOT NULL,
    phone text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz
);

CREATE UNIQUE INDEX users_email_lower_unique
    ON auth.users (lower(email))
    WHERE email IS NOT NULL;

CREATE UNIQUE INDEX users_staff_role_unique
    ON auth.users (role)
    WHERE role IN ('superadmin', 'mere-fonde', 'livreur');

CREATE TABLE auth.activation_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role text NOT NULL CHECK (role IN ('superadmin', 'mere-fonde', 'livreur')),
    code_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz NULL,
    created_by uuid NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    ip text,
    user_agent text
);

CREATE TABLE catalog.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    price_fcfa integer NOT NULL CHECK (price_fcfa > 0),
    unit text NOT NULL CHECK (unit IN ('pot', 'kg')),
    is_available boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE orders.order_reference_seq
    AS bigint
    START WITH 1
    INCREMENT BY 1;

CREATE TABLE orders.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference text NOT NULL UNIQUE DEFAULT (
        'FD-' || lpad(nextval('orders.order_reference_seq')::text, 6, '0')
    ),
    customer_user_id uuid NULL REFERENCES auth.users(id),
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    delivery_mode text NOT NULL CHECK (delivery_mode IN ('delivery', 'pickup')),
    delivery_address text NULL,
    status text NOT NULL DEFAULT 'new' CHECK (
        status IN (
            'new',
            'confirmed',
            'preparing',
            'ready',
            'to_collect',
            'delivering',
            'delivered',
            'cancelled'
        )
    ),
    subtotal_fcfa integer NOT NULL CHECK (subtotal_fcfa >= 0),
    delivery_fee_fcfa integer NOT NULL CHECK (delivery_fee_fcfa >= 0),
    total_fcfa integer NOT NULL CHECK (
        total_fcfa >= 0
        AND total_fcfa = subtotal_fcfa + delivery_fee_fcfa
    ),
    scheduled_for timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT orders_delivery_address_required CHECK (
        delivery_mode = 'pickup' OR delivery_address IS NOT NULL
    )
);

CREATE TABLE orders.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES catalog.products(id),
    product_name text NOT NULL,
    unit_price_fcfa integer NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    line_total_fcfa integer NOT NULL
);

CREATE TABLE orders.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders.orders(id),
    method text NOT NULL CHECK (method IN ('cash', 'wave', 'orange_money')),
    status text NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'paid', 'failed', 'refunded')
    ),
    amount_fcfa integer NOT NULL,
    provider_reference text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX payments_method_provider_reference_unique
    ON orders.payments (method, provider_reference)
    WHERE provider_reference IS NOT NULL;

CREATE TABLE admin.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid NULL REFERENCES auth.users(id),
    action text NOT NULL,
    target text NOT NULL,
    details jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO catalog.products (slug, name, price_fcfa, unit)
VALUES
    ('fonde', 'Fondé', 200, 'pot'),
    ('thiakry', 'Thiakry', 300, 'pot');

COMMIT;
