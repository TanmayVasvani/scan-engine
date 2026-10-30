import { describe, expect, it } from "vitest";
import { buildCatalog } from "./data";
import { run } from "./exec";
import { parse } from "./sql";

const db = buildCatalog(5000);

describe("sql", () => {
  it("parses a filtered aggregate", () => {
    const q = parse("SELECT sku, sum_qty FROM logs WHERE stage = 'packing' GROUP BY sku");
    expect(q.from).toBe("logs");
    expect(q.groupBy).toBe("sku");
    expect(q.where?.kind).toBe("eq");
  });
});

describe("exec", () => {
  it("uses the index for an equality", () => {
    const r = run("SELECT id, sku FROM orders WHERE city = 'Vadodara' LIMIT 5", db);
    expect(r.plan[0]?.op).toBe("IndexScan");
    expect(r.rows.length).toBeLessThanOrEqual(5);
    expect(r.rows.every((row) => row.city === undefined || row.sku)).toBe(true);
  });

  it("scans when there is no usable index predicate", () => {
    const r = run("SELECT id FROM logs WHERE qty > 300", db);
    expect(r.plan[0]?.op).toBe("SeqScan");
    expect(r.rows.every((row) => Number(row.id) > 0)).toBe(true);
  });

  it("aggregates after a filter", () => {
    const r = run("SELECT sku, sum_qty, n FROM logs WHERE stage = 'packing' GROUP BY sku", db);
    expect(r.plan.some((p) => p.op === "IndexScan")).toBe(true);
    expect(r.plan.some((p) => p.op === "Aggregate")).toBe(true);
    const total = r.rows.reduce((s, row) => s + Number(row.n), 0);
    const scanned = run("SELECT id FROM logs WHERE stage = 'packing'", db).rows.length;
    expect(total).toBe(scanned);
  });

  it("index path reads fewer rows than a scan", () => {
    const indexed = run("SELECT id FROM orders WHERE city = 'Pune'", db);
    const scan = run("SELECT id FROM orders WHERE amount > 0", db);
    expect(indexed.scanned).toBeLessThan(scan.scanned);
  });
});
