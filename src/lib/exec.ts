import { col, row, type Table, type Value } from "./store";
import { parse, type Expr, type Query } from "./sql";

export type Plan =
  | { op: "IndexScan"; table: string; column: string; rows: number }
  | { op: "SeqScan"; table: string; rows: number }
  | { op: "Filter"; pred: string }
  | { op: "Aggregate"; groupBy: string }
  | { op: "Project"; columns: string[] }
  | { op: "Sort"; column: string }
  | { op: "Limit"; n: number };

export type Result = {
  columns: string[];
  rows: Record<string, Value>[];
  plan: Plan[];
  ms: number;
  scanned: number;
};

export function run(sql: string, tables: Map<string, Table>): Result {
  const q = parse(sql);
  const t = tables.get(q.from);
  if (!t) throw new Error(`no table ${q.from}`);
  const t0 = performance.now();
  const { ids, plan, scanned } = scan(t, q);
  let out = ids.map((i) => row(t, i));
  if (q.groupBy) {
    plan.push({ op: "Aggregate", groupBy: q.groupBy });
    out = aggregate(out, q);
  }
  plan.push({ op: "Project", columns: q.columns });
  if (!q.columns.includes("*")) {
    out = out.map((r) => {
      const p: Record<string, Value> = {};
      for (const c of q.columns) p[c] = r[c] as Value;
      return p;
    });
  }
  if (q.orderBy) {
    plan.push({ op: "Sort", column: q.orderBy });
    out.sort((a, b) => Number(a[q.orderBy as string]) - Number(b[q.orderBy as string]));
  }
  if (q.limit != null) {
    plan.push({ op: "Limit", n: q.limit });
    out = out.slice(0, q.limit);
  }
  return {
    columns: q.columns.includes("*") ? t.columns.map((c) => c.name) : q.columns,
    rows: out,
    plan,
    ms: performance.now() - t0,
    scanned,
  };
}

function scan(t: Table, q: Query): { ids: number[]; plan: Plan[]; scanned: number } {
  const plan: Plan[] = [];
  const eq = equality(q.where);
  if (eq && t.indexes.has(eq.column)) {
    const ids = t.indexes.get(eq.column)?.get(eq.value) ?? [];
    plan.push({ op: "IndexScan", table: t.name, column: eq.column, rows: ids.length });
    const rest = strip(q.where, eq.column);
    if (rest) plan.push({ op: "Filter", pred: show(rest) });
    return { ids: ids.filter((i) => !rest || match(t, i, rest)), plan, scanned: ids.length };
  }
  plan.push({ op: "SeqScan", table: t.name, rows: t.rowCount });
  if (q.where) plan.push({ op: "Filter", pred: show(q.where) });
  const ids: number[] = [];
  for (let i = 0; i < t.rowCount; i++) if (!q.where || match(t, i, q.where)) ids.push(i);
  return { ids, plan, scanned: t.rowCount };
}

function equality(e?: Expr): { column: string; value: string | number } | null {
  if (!e) return null;
  if (e.kind === "eq") return e;
  if (e.kind === "and") return equality(e.left) ?? equality(e.right);
  return null;
}

function strip(e: Expr | undefined, column: string): Expr | undefined {
  if (!e) return undefined;
  if (e.kind === "eq" && e.column === column) return undefined;
  if (e.kind === "and") {
    const l = strip(e.left, column);
    const r = strip(e.right, column);
    if (l && r) return { kind: "and", left: l, right: r };
    return l ?? r;
  }
  return e;
}

function match(t: Table, i: number, e: Expr): boolean {
  if (e.kind === "and") return match(t, i, e.left) && match(t, i, e.right);
  const v = col(t, e.column).values[i];
  if (e.kind === "eq") return v === e.value;
  return Number(v) > e.value;
}

function show(e: Expr): string {
  if (e.kind === "and") return `${show(e.left)} AND ${show(e.right)}`;
  return `${e.column} ${e.kind === "eq" ? "=" : ">"} ${typeof e.value === "string" ? `'${e.value}'` : e.value}`;
}

function aggregate(rows: Record<string, Value>[], q: Query): Record<string, Value>[] {
  const key = q.groupBy as string;
  const groups = new Map<Value, Record<string, Value>[]>();
  for (const r of rows) {
    const k = r[key] as Value;
    const list = groups.get(k) ?? [];
    list.push(r);
    groups.set(k, list);
  }
  return [...groups.entries()].map(([k, list]) => {
    const out: Record<string, Value> = { [key]: k };
    for (const c of q.columns) {
      if (c === key) continue;
      if (c.toLowerCase().startsWith("sum_")) {
        const field = c.slice(4);
        out[c] = list.reduce((s, r) => s + Number(r[field] ?? 0), 0);
      } else if (c.toLowerCase() === "n") {
        out[c] = list.length;
      }
    }
    return out;
  });
}
