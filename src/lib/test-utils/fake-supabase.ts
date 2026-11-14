/**
 * A small in-memory stand-in for the Supabase query builder used by canvas routes. It lets tests run the
 * real authorization and mutation logic against rows rather than asserting on mock call order.
 * It supports only the calls the canvas code makes; unknown calls fail loudly.
 */
export type Row = Record<string, unknown>;
export type FakeTables = Record<string, Row[]>;

export function createFakeSupabase(tables: FakeTables) {
  return {
    from(name: string) {
      const filters: Array<(row: Row) => boolean> = [];
      let operation: { type: "select" | "update" | "insert" | "delete"; payload?: Row } = { type: "select" };
      let descending = false;
      let orderColumn = "";
      let max = Infinity;
      const run = (): { data: Row[]; error: { message: string } | null } => {
        const rows = tables[name] ?? (tables[name] = []);
        const matches = rows.filter((row) => filters.every((filter) => filter(row)));
        if (operation.type === "insert") {
          const row = { id: `${name}-${rows.length + 1}`, ...operation.payload };
          rows.push(row);
          return { data: [row], error: null };
        }
        if (operation.type === "update") matches.forEach((row) => Object.assign(row, operation.payload));
        if (operation.type === "delete") tables[name] = rows.filter((row) => !matches.includes(row));
        const ordered = orderColumn ? [...matches].sort((a, b) => (Number(a[orderColumn]) - Number(b[orderColumn])) * (descending ? -1 : 1)) : matches;
        return { data: ordered.slice(0, max), error: null };
      };
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => (filters.push((row) => row[column] === value), query),
        in: (column: string, values: unknown[]) => (filters.push((row) => values.includes(row[column])), query),
        order: (column: string, options?: { ascending?: boolean }) => ((orderColumn = column), (descending = options?.ascending === false), query),
        limit: (count: number) => ((max = count), query),
        update: (payload: Row) => ((operation = { type: "update", payload }), query),
        insert: (payload: Row) => ((operation = { type: "insert", payload }), query),
        delete: () => ((operation = { type: "delete" }), query),
        maybeSingle: async () => ({ data: run().data[0] ?? null, error: null }),
        single: async () => {
          const { data } = run();
          return data[0] ? { data: data[0], error: null } : { data: null, error: { message: "Row not found" } };
        },
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(run()).then(resolve),
      };
      return query;
    },
  };
}
