BEGIN;

ALTER TABLE orders.order_items
    ADD CONSTRAINT order_items_unit_price_positive
        CHECK (unit_price_fcfa > 0),
    ADD CONSTRAINT order_items_line_total_consistent
        CHECK (line_total_fcfa = unit_price_fcfa * quantity);

ALTER TABLE orders.payments
    ADD CONSTRAINT payments_amount_non_negative
        CHECK (amount_fcfa >= 0);

ALTER TABLE auth.users
    ADD CONSTRAINT users_auth_method_required
        CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL);

CREATE INDEX order_items_order_id_idx
    ON orders.order_items (order_id);

CREATE INDEX payments_order_id_idx
    ON orders.payments (order_id);

CREATE INDEX sessions_user_id_idx
    ON auth.sessions (user_id);

CREATE INDEX sessions_expires_at_idx
    ON auth.sessions (expires_at);

CREATE INDEX orders_customer_user_id_idx
    ON orders.orders (customer_user_id);

CREATE INDEX orders_status_created_at_idx
    ON orders.orders (status, created_at DESC);

CREATE INDEX audit_log_created_at_idx
    ON admin.audit_log (created_at DESC);

COMMIT;
