/// <reference types="vite/client" />

declare module "sql.js" {
  type SqlValue = string | number | Uint8Array | null;

  interface QueryExecResult {
    columns: string[];
    values: SqlValue[][];
  }

  interface Statement {
    step(): boolean;
    getAsObject(): Record<string, SqlValue>;
    bind(values?: SqlValue[]): void;
    run(values?: SqlValue[]): void;
    free(): void;
  }

  interface Database {
    run(sql: string, params?: SqlValue[]): void;
    prepare(sql: string): Statement;
    exec(sql: string): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
  }

  interface DatabaseConstructor {
    new (data?: Uint8Array): Database;
  }

  interface SqlJsStatic {
    Database: DatabaseConstructor;
  }

  const initSqlJs: (config?: Record<string, unknown>) => Promise<SqlJsStatic>;
  export default initSqlJs;
  export type { Database, SqlJsStatic };
}

declare module "sql.js/dist/sql-wasm.wasm?url" {
  const value: string;
  export default value;
}