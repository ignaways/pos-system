export const seedCategories = [
  { id: "cat-coffee", name: "Coffee" },
  { id: "cat-noncoffee", name: "Tea & non-coffee" },
  { id: "cat-bakery", name: "Bakery" },
  { id: "cat-beans", name: "Beans & retail" },
];

export const seedProducts = [
  { sku: "CF-ESP", name: "Espresso", categoryId: "cat-coffee", price: 18000, stock: 120 },
  { sku: "CF-AMR", name: "Americano", categoryId: "cat-coffee", price: 22000, stock: 120 },
  { sku: "CF-LAT", name: "Caffe latte", categoryId: "cat-coffee", price: 28000, stock: 90 },
  { sku: "CF-KSS", name: "Kopi susu gula aren", categoryId: "cat-coffee", price: 25000, stock: 150 },
  { sku: "CF-CAP", name: "Cappuccino", categoryId: "cat-coffee", price: 28000, stock: 80 },
  { sku: "CF-V60", name: "V60 pour-over", categoryId: "cat-coffee", price: 32000, stock: 40 },
  { sku: "NC-MAT", name: "Matcha latte", categoryId: "cat-noncoffee", price: 30000, stock: 60 },
  { sku: "NC-TEH", name: "Teh tarik", categoryId: "cat-noncoffee", price: 20000, stock: 70 },
  { sku: "NC-CHO", name: "Hot chocolate", categoryId: "cat-noncoffee", price: 27000, stock: 4 },
  { sku: "BK-CRO", name: "Butter croissant", categoryId: "cat-bakery", price: 24000, stock: 18 },
  { sku: "BK-PAC", name: "Pain au chocolat", categoryId: "cat-bakery", price: 27000, stock: 12 },
  { sku: "BK-BAN", name: "Banana bread", categoryId: "cat-bakery", price: 21000, stock: 3 },
  { sku: "BK-KLP", name: "Klepon cake slice", categoryId: "cat-bakery", price: 26000, stock: 0 },
  { sku: "RT-GYO", name: "Gayo beans 250 g", categoryId: "cat-beans", price: 95000, stock: 15 },
  { sku: "RT-TRJ", name: "Toraja beans 250 g", categoryId: "cat-beans", price: 105000, stock: 9 },
  { sku: "RT-FLT", name: "V60 paper filters", categoryId: "cat-beans", price: 45000, stock: 22 },
].map((p) => ({ ...p, id: `prd-${p.sku.toLowerCase()}`, lowStockThreshold: 5 }));
