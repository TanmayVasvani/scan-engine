export type Value = string | number;

export type Column = { name: string; values: Value[] };

export type Table = {
  name: string;
  columns: Column[];
  rowCount: number;
  indexes: Map<string, Map<Value, number[]>>;
};

export function table(name: string, columns: Column[]): Table {
  const n = columns[0]?.values.length ?? 0;
  if (columns.some((c) => c.values.length !== n)) throw new Error("column length mismatch");
  return { name, columns, rowCount: n, indexes: new Map() };
}

export function col(t: Table, name: string): Column {
  const c = t.columns.find((x) => x.name === name);
  if (!c) throw new Error(`no column ${name} on ${t.name}`);
  return c;
}

export function indexOn(t: Table, name: string): void {
  const c = col(t, name);
  const idx = new Map<Value, number[]>();
  c.values.forEach((v, i) => {
    const list = idx.get(v) ?? [];
    list.push(i);
    idx.set(v, list);
  });
  t.indexes.set(name, idx);
}

export function row(t: Table, i: number): Record<string, Value> {
  const out: Record<string, Value> = {};
  for (const c of t.columns) out[c.name] = c.values[i] as Value;
  return out;
}
