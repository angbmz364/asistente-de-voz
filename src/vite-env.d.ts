/// <reference types="vite/client" />

declare module "sql.js" {
  const initSqlJs: any;
  export default initSqlJs;
  export type Database = any;
  export type SqlJsStatic = any;
}

declare module "sql.js/dist/sql-wasm.wasm?url" {
  const value: string;
  export default value;
}
