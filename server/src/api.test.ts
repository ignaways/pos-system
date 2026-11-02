import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

process.env.PGLITE_DIR = "memory://";

const { default: app } = await import("./app.js");
const { closeDb, getDb } = await import("./db/client.js");
const { resetData } = await import("./db/setup.js");

let server: Server;
let base: string;

const call = async (method: string, path: string, body?: unknown) => {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
};

beforeAll(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.close();
  await closeDb();
});
beforeEach(async () => {
  await resetData(await getDb());
});

describe("checkout", () => {
  it("records a sale, snapshots lines and decrements stock in one transaction", async () => {
    const { status, body } = await call("POST", "/sales", {
      lines: [
        { productId: "prd-cf-lat", qty: 1 },
        { productId: "prd-bk-cro", qty: 1 },
        { productId: "prd-cf-lat", qty: 1 }, // duplicate lines are merged
      ],
      discountPercent: 10,
      paymentMethod: "cash",
      paid: 100000,
    });
    expect(status).toBe(201);
    expect(body.sale).toMatchObject({ number: "S-00001", subtotal: 80000, discountAmount: 8000, tax: 7920, total: 79920, change: 20080 });
    expect(body.sale.lines.map((l: { sku: string; qty: number }) => [l.sku, l.qty])).toEqual([
      ["CF-LAT", 2],
      ["BK-CRO", 1],
    ]);
    const products = (await call("GET", "/products")).body as { id: string; stock: number }[];
    expect(products.find((p) => p.id === "prd-cf-lat")?.stock).toBe(88);
  });

  it("rolls back every line when one item is short", async () => {
    const { status, body } = await call("POST", "/sales", {
      lines: [
        { productId: "prd-cf-esp", qty: 2 },
        { productId: "prd-bk-ban", qty: 9 },
      ],
      paymentMethod: "card",
    });
    expect(status).toBe(409);
    expect(body.code).toBe("insufficient_stock");
    expect(body.details.shortages).toEqual([{ productId: "prd-bk-ban", name: "Banana bread", requested: 9, available: 3 }]);
    const products = (await call("GET", "/products")).body as { id: string; stock: number }[];
    expect(products.find((p) => p.id === "prd-cf-esp")?.stock).toBe(120); // espresso untouched
    expect((await call("GET", "/sales")).body).toEqual([]);
  });

  it("sells the last unit only once when two tills race", async () => {
    const sale = { lines: [{ productId: "prd-bk-ban", qty: 3 }], paymentMethod: "qris" };
    const results = await Promise.all([call("POST", "/sales", sale), call("POST", "/sales", sale)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it("rejects cash below the total", async () => {
    const { status, body } = await call("POST", "/sales", {
      lines: [{ productId: "prd-cf-esp", qty: 1 }],
      paymentMethod: "cash",
      paid: 1000,
    });
    expect([status, body.code]).toEqual([400, "payment_short"]);
  });
});

describe("catalogue", () => {
  it("returns translatable field codes", async () => {
    const { status, body } = await call("POST", "/products", { sku: "", name: "", categoryId: "cat-coffee", price: -1, stock: 1.5 });
    expect(status).toBe(400);
    expect(body).toMatchObject({ code: "validation_failed", fields: { sku: "required", name: "required", price: "negative", stock: "not_integer" } });
  });

  it("enforces unique SKU and existing category through constraints", async () => {
    const product = { sku: "cf-lat", name: "Dup", categoryId: "cat-coffee", price: 1, stock: 1 };
    expect((await call("POST", "/products", product)).body).toMatchObject({ code: "sku_taken", fields: { sku: "taken" } });
    expect((await call("POST", "/products", { ...product, sku: "NEW", categoryId: "nope" })).body.code).toBe("category_missing");
  });

  it("blocks deleting a category that still has products", async () => {
    const { status, body } = await call("DELETE", "/categories/cat-coffee");
    expect([status, body.code, body.details]).toEqual([409, "category_in_use", { count: 6 }]);
  });

  it("treats category names case-insensitively", async () => {
    expect((await call("POST", "/categories", { name: "bakery" })).body.code).toBe("category_name_taken");
  });

  it("keeps sale history after a product is deleted", async () => {
    await call("POST", "/sales", { lines: [{ productId: "prd-nc-teh", qty: 1 }], paymentMethod: "card" });
    expect((await call("DELETE", "/products/prd-nc-teh")).status).toBe(204);
    const sales = (await call("GET", "/sales")).body;
    expect(sales[0].lines[0].name).toBe("Teh tarik");
  });
});
