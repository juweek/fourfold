import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;

function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  pool ??= new Pool({ connectionString: url });
  return pool;
}

type QueryFilter = {
  column: string;
  operator: string;
  value: unknown;
};

type QueryBuilder = {
  table: string;
  selectColumns?: string;
  filters: QueryFilter[];
  orderByClause?: { column: string; ascending: boolean };
  limitValue?: number;
  isSingle?: boolean;
  updateData?: Record<string, unknown>;
  insertData?: unknown;
  isDelete?: boolean;
  isCount?: boolean;
};

class NeonQueryBuilder {
  private query: QueryBuilder;

  constructor(table: string) {
    this.query = { table, filters: [] };
  }

  select(columns = "*") {
    this.query.selectColumns = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.query.filters.push({ column, operator: "=", value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.query.filters.push({ column, operator: "!=", value });
    return this;
  }

  lt(column: string, value: unknown) {
    this.query.filters.push({ column, operator: "<", value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.query.filters.push({ column, operator: "<=", value });
    return this;
  }

  gt(column: string, value: unknown) {
    this.query.filters.push({ column, operator: ">", value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.query.filters.push({ column, operator: ">=", value });
    return this;
  }

  is(column: string, value: unknown) {
    this.query.filters.push({ column, operator: value === null ? "IS NULL" : "IS", value });
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === "is" && value === null) {
      this.query.filters.push({ column, operator: "IS NOT NULL", value: null });
    } else {
      this.query.filters.push({ column, operator: "NOT", value });
    }
    return this;
  }

  in(column: string, values: unknown[]) {
    this.query.filters.push({ column, operator: "IN", value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.query.orderByClause = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(count: number) {
    this.query.limitValue = count;
    return this;
  }

  single() {
    this.query.isSingle = true;
    return this;
  }

  update(data: Record<string, unknown>) {
    this.query.updateData = data;
    return this;
  }

  insert(data: unknown) {
    this.query.insertData = data;
    return this;
  }

  delete() {
    this.query.isDelete = true;
    return this;
  }

  private buildWhereClause(params: unknown[]): string {
    if (this.query.filters.length === 0) return "";

    const conditions = this.query.filters.map((filter) => {
      if (filter.operator === "IS NULL") {
        return `"${filter.column}" IS NULL`;
      }
      if (filter.operator === "IS NOT NULL") {
        return `"${filter.column}" IS NOT NULL`;
      }
      if (filter.operator === "IN") {
        const values = filter.value as unknown[];
        if (values.length === 0) return "FALSE";
        const placeholders = values.map((v) => {
          params.push(v);
          return `$${params.length}`;
        }).join(", ");
        return `"${filter.column}" IN (${placeholders})`;
      }
      params.push(filter.value);
      return `"${filter.column}" ${filter.operator} $${params.length}`;
    });

    return " WHERE " + conditions.join(" AND ");
  }

  private handleJoinedSelect(columns: string): { baseColumns: string; joinInfo: { table: string; column: string } | null } {
    const joinMatch = columns.match(/^([^,]*),(\w+)\(([^)]+)\)$/);
    if (!joinMatch) return { baseColumns: columns, joinInfo: null };
    
    const [, baseColumns, joinTable, joinColumns] = joinMatch;
    return {
      baseColumns: baseColumns.trim() || "*",
      joinInfo: { table: joinTable, column: joinColumns }
    };
  }

  async then(resolve: (value: { data: unknown; error: { message: string } | null }) => void, reject: (reason?: unknown) => void) {
    try {
      const pool = getPool();
      const params: unknown[] = [];

      if (this.query.isDelete) {
        const whereClause = this.buildWhereClause(params);
        const sql = `DELETE FROM "${this.query.table}"${whereClause}`;
        await pool.query(sql, params);
        resolve({ data: null, error: null });
        return;
      }

      if (this.query.insertData) {
        const data = Array.isArray(this.query.insertData) ? this.query.insertData : [this.query.insertData];
        if (data.length === 0) {
          resolve({ data: [], error: null });
          return;
        }

        const keys = Object.keys(data[0] as Record<string, unknown>);
        const columns = keys.map((k) => `"${k}"`).join(", ");
        
        const valueRows = data.map((row) => {
          const values = keys.map((k) => {
            params.push((row as Record<string, unknown>)[k]);
            return `$${params.length}`;
          });
          return `(${values.join(", ")})`;
        });

        let sql = `INSERT INTO "${this.query.table}" (${columns}) VALUES ${valueRows.join(", ")}`;
        
        if (this.query.selectColumns) {
          sql += ` RETURNING ${this.query.selectColumns === "*" ? "*" : this.query.selectColumns}`;
        }

        const result = await pool.query(sql, params);
        const returnData = this.query.isSingle ? result.rows[0] : result.rows;
        resolve({ data: returnData, error: null });
        return;
      }

      if (this.query.updateData) {
        const keys = Object.keys(this.query.updateData);
        const sets = keys.map((k) => {
          params.push(this.query.updateData![k]);
          return `"${k}" = $${params.length}`;
        }).join(", ");

        const whereClause = this.buildWhereClause(params);
        let sql = `UPDATE "${this.query.table}" SET ${sets}${whereClause}`;

        if (this.query.selectColumns) {
          sql += ` RETURNING ${this.query.selectColumns === "*" ? "*" : this.query.selectColumns}`;
        }

        const result = await pool.query(sql, params);
        const returnData = this.query.isSingle ? result.rows[0] : result.rows;
        resolve({ data: returnData, error: null });
        return;
      }

      const { baseColumns, joinInfo } = this.handleJoinedSelect(this.query.selectColumns || "*");
      let sql: string;
      
      if (joinInfo) {
        sql = `
          SELECT 
            t.*,
            jsonb_build_object('${joinInfo.column}', j."${joinInfo.column}") as ${joinInfo.table}
          FROM "${this.query.table}" t
          LEFT JOIN "${joinInfo.table}" j ON t."${joinInfo.table.slice(0, -1)}_id" = j.id
        `.trim();
      } else {
        sql = `SELECT ${baseColumns === "*" ? "*" : baseColumns} FROM "${this.query.table}"`;
      }

      sql += this.buildWhereClause(params);

      if (this.query.orderByClause) {
        sql += ` ORDER BY "${this.query.orderByClause.column}" ${this.query.orderByClause.ascending ? "ASC" : "DESC"}`;
      }

      if (this.query.limitValue) {
        sql += ` LIMIT ${this.query.limitValue}`;
      }

      const result = await pool.query(sql, params);
      const returnData = this.query.isSingle ? result.rows[0] : result.rows;
      resolve({ data: returnData, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Database error";
      resolve({ data: null, error: { message } });
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(): any {
  return {
    from: (table: string) => new NeonQueryBuilder(table),
  };
}

export function assertNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
