# Scan engine

A small columnar SQL engine over factory and sales tables. SQL in, a plan, an index, a time.

**Author:** Tanmay Vaswani

## What it does

Two tables, stored by column: `logs` (80,000 stage rows) and `orders` (20,000). Hash indexes on `stage`, `sku`, `city` and `customer_id`.

- Equality on an indexed column is an index scan.
- A range, or a column with no index, is a sequential scan and a filter.
- `GROUP BY` with `sum_<col>` and `n`.
- `ORDER BY`, `LIMIT`.
- The plan and the row count actually read are shown next to the result.

## Run

```bash
npm install
npm test
npm run dev
npm run build
```

## Stack

TypeScript, Vite, React. The engine is in `src/lib` and has no runtime dependencies.

## License

MIT
