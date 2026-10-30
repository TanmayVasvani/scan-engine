export type Expr =
  | { kind: "eq"; column: string; value: string | number }
  | { kind: "gt"; column: string; value: number }
  | { kind: "and"; left: Expr; right: Expr };

export type Query = {
  explain: boolean;
  columns: string[];
  from: string;
  where?: Expr;
  groupBy?: string;
  orderBy?: string;
  limit?: number;
};

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*/;

export function parse(sql: string): Query {
  const s = sql.trim().replace(/\s+/g, " ");
  let i = 0;
  const explain = consumeWord("explain");
  expectWord("select");
  const columns = readList();
  expectWord("from");
  const from = readIdent();
  let where: Expr | undefined;
  let groupBy: string | undefined;
  let orderBy: string | undefined;
  let limit: number | undefined;
  if (consumeWord("where")) where = readExpr();
  if (consumeWord("group")) {
    expectWord("by");
    groupBy = readIdent();
  }
  if (consumeWord("order")) {
    expectWord("by");
    orderBy = readIdent();
  }
  if (consumeWord("limit")) limit = readNumber();
  if (i < s.length) throw new Error(`unexpected '${s.slice(i)}'`);
  return { explain, columns, from, where, groupBy, orderBy, limit };

  function readList(): string[] {
    if (s[i] === "*") {
      i += 1;
      skip();
      return ["*"];
    }
    const out = [readIdent()];
    while (s[i] === ",") {
      i += 1;
      skip();
      out.push(readIdent());
    }
    return out;
  }

  function readExpr(): Expr {
    let left = readCmp();
    while (consumeWord("and")) left = { kind: "and", left, right: readCmp() };
    return left;
  }

  function readCmp(): Expr {
    const column = readIdent();
    if (s.startsWith("=", i)) {
      i += 1;
      skip();
      return { kind: "eq", column, value: readLiteral() };
    }
    if (s.startsWith(">", i)) {
      i += 1;
      skip();
      return { kind: "gt", column, value: readNumber() };
    }
    throw new Error("expected = or >");
  }

  function readLiteral(): string | number {
    if (s[i] === "'") {
      const end = s.indexOf("'", i + 1);
      if (end < 0) throw new Error("unterminated string");
      const v = s.slice(i + 1, end);
      i = end + 1;
      skip();
      return v;
    }
    return readNumber();
  }

  function readIdent(): string {
    const m = IDENT.exec(s.slice(i));
    if (!m) throw new Error("expected identifier");
    i += m[0].length;
    skip();
    return m[0];
  }

  function readNumber(): number {
    const m = /^-?\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new Error("expected number");
    i += m[0].length;
    skip();
    return Number(m[0]);
  }

  function expectWord(w: string) {
    if (!consumeWord(w)) throw new Error(`expected ${w}`);
  }

  function consumeWord(w: string): boolean {
    if (s.slice(i, i + w.length).toLowerCase() !== w) return false;
    const next = s[i + w.length];
    if (next && /[A-Za-z0-9_]/.test(next)) return false;
    i += w.length;
    skip();
    return true;
  }

  function skip() {
    while (s[i] === " ") i += 1;
  }
}
