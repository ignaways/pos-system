/**
 * Idempotent schema. Constraints do the integrity work (unique SKU, unique category name,
 * no negative stock, no deleting a category in use), so concurrent requests can't
 * slip past an application-level check.
 */
export const SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS categories (
  id          text PRIMARY KEY,
  name        text NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_key ON categories (lower(name));

CREATE TABLE IF NOT EXISTS products (
  id                   text PRIMARY KEY,
  sku                  text NOT NULL,
  name                 text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  category_id          text NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  price                integer NOT NULL CHECK (price >= 0),
  stock                integer NOT NULL CHECK (stock >= 0),
  low_stock_threshold  integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_sku_key UNIQUE (sku)
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id);

CREATE SEQUENCE IF NOT EXISTS sale_number_seq;

CREATE TABLE IF NOT EXISTS sales (
  id                text PRIMARY KEY,
  number            text NOT NULL UNIQUE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  subtotal          integer NOT NULL,
  discount_percent  numeric(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  discount_amount   integer NOT NULL,
  tax               integer NOT NULL,
  total             integer NOT NULL,
  paid              integer NOT NULL,
  change_due        integer NOT NULL CHECK (change_due >= 0),
  payment_method    text NOT NULL CHECK (payment_method IN ('cash', 'card', 'qris'))
);
CREATE INDEX IF NOT EXISTS sales_created_at_idx ON sales (created_at DESC);

-- Lines are snapshots: no FK to products, so deleting or repricing a product never rewrites history.
CREATE TABLE IF NOT EXISTS sale_lines (
  sale_id     text NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
  line_no     integer NOT NULL,
  product_id  text NOT NULL,
  sku         text NOT NULL,
  name        text NOT NULL,
  unit_price  integer NOT NULL,
  qty         integer NOT NULL CHECK (qty > 0),
  line_total  integer NOT NULL,
  PRIMARY KEY (sale_id, line_no)
);
`;
