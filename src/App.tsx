import { useMemo, useState } from "react";
import { Shell } from "./components/shell";
import { buildCatalog } from "./lib/data";
import { run, type Result } from "./lib/exec";

const db = buildCatalog();
const SAMPLES = [
  "SELECT sku, sum_qty, n FROM logs WHERE stage = 'packing' GROUP BY sku",
  "SELECT id, sku, amount FROM orders WHERE city = 'Vadodara' LIMIT 8",
  "SELECT id, sku, qty FROM logs WHERE qty > 380 LIMIT 8",
  "SELECT id, city, amount FROM orders WHERE customer_id = 42",
];

export function App() {
  const [sql, setSql] = useState(SAMPLES[0] as string);
  const [out, setOut] = useState<Result | { error: string } | null>(null);
  const sizes = useMemo(
    () => [...db.values()].map((t) => `${t.name}: ${t.rowCount.toLocaleString("en-IN")} rows`),
    [],
  );

  function go(text = sql) {
    try {
      setOut(run(text, db));
    } catch (e) {
      setOut({ error: e instanceof Error ? e.message : "error" });
    }
  }

  return (
    <Shell project="Scan engine">
      <header className="max-w-3xl">
        <p className="text-xs tracking-widest text-teal uppercase">Columnar SQL · factory tables</p>
        <h1 className="mt-2 text-4xl md:text-5xl">SQL in, a plan, an index, a time</h1>
        <p className="mt-4 text-muted md:text-lg">
          {sizes.join(" · ")}. Equality on an indexed column is an index scan. Anything else is a scan.
        </p>
      </header>
      <div className="mt-6 flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button key={s} className="border border-line px-3 py-2 text-left text-sm" onClick={() => { setSql(s); go(s); }}>
            {s}
          </button>
        ))}
      </div>
      <textarea
        className="mt-4 w-full border border-line bg-paper p-3 font-mono text-sm"
        rows={3}
        value={sql}
        onChange={(e) => setSql(e.target.value)}
      />
      <button className="mt-3 border border-ink bg-ink px-4 py-2 text-paper" onClick={() => go()}>
        Run
      </button>
      {out && "error" in out ? <p className="mt-4 text-rust">{out.error}</p> : null}
      {out && "plan" in out ? <Output result={out} /> : null}
    </Shell>
  );
}

function Output({ result }: { result: Result }) {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <section>
        <h2 className="text-2xl">
          Plan · {result.ms.toFixed(2)} ms · {result.scanned.toLocaleString("en-IN")} read
        </h2>
        <ol className="mt-3 text-sm">
          {result.plan.map((p, i) => (
            <li key={i} className="border-t border-line py-2 font-mono">
              {JSON.stringify(p)}
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="text-2xl">{result.rows.length} rows</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {result.columns.map((c) => (
                  <th key={c} className="py-1 text-left">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.slice(0, 12).map((r, i) => (
                <tr key={i} className="border-t border-line">
                  {result.columns.map((c) => (
                    <td key={c} className="py-1 tabular-nums">
                      {String(r[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
