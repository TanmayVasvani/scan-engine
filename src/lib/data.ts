import { indexOn, table, type Table } from "./store";

const STAGES = ["molding", "tufting", "trimming", "packing"];
const SKUS = ["ZEC-PRO", "ZEC-KID", "TUL-CLA"];
const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Ahmedabad", "Vadodara", "Pune"];

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCatalog(rows = 80000): Map<string, Table> {
  const rng = mulberry(20261030);
  const id: number[] = [];
  const sku: string[] = [];
  const stage: string[] = [];
  const qty: number[] = [];
  const scrap: number[] = [];
  for (let i = 0; i < rows; i++) {
    id.push(i + 1);
    sku.push(SKUS[Math.floor(rng() * SKUS.length)] as string);
    stage.push(STAGES[Math.floor(rng() * STAGES.length)] as string);
    qty.push(20 + Math.floor(rng() * 400));
    scrap.push(Math.floor(rng() * 8));
  }
  const logs = table("logs", [
    { name: "id", values: id },
    { name: "sku", values: sku },
    { name: "stage", values: stage },
    { name: "qty", values: qty },
    { name: "scrap", values: scrap },
  ]);
  indexOn(logs, "stage");
  indexOn(logs, "sku");

  const oid: number[] = [];
  const customer: number[] = [];
  const city: string[] = [];
  const amount: number[] = [];
  const osku: string[] = [];
  for (let i = 0; i < 20000; i++) {
    oid.push(i + 1);
    customer.push(1 + Math.floor(rng() * 4000));
    city.push(CITIES[Math.floor(rng() * CITIES.length)] as string);
    osku.push(SKUS[Math.floor(rng() * SKUS.length)] as string);
    amount.push(99 + Math.floor(rng() * 250));
  }
  const orders = table("orders", [
    { name: "id", values: oid },
    { name: "customer_id", values: customer },
    { name: "city", values: city },
    { name: "sku", values: osku },
    { name: "amount", values: amount },
  ]);
  indexOn(orders, "city");
  indexOn(orders, "customer_id");
  indexOn(orders, "sku");
  return new Map([
    ["logs", logs],
    ["orders", orders],
  ]);
}
