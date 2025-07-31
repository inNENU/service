import type { PoolConnection } from "mysql2/promise";
import { createPool } from "mysql2/promise";
import "../config/loadEnv.js";

// 创建 MySQL 连接池
const pool = createPool({
  host: process.env.MYSQL_HOST ?? "localhost",
  port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
  database: process.env.MYSQL_DATABASE ?? "innenu-service",
  user: process.env.MYSQL_USER ?? "innenu",
  password: process.env.MYSQL_PASSWORD,
  connectTimeout: 5000,
  connectionLimit: 50,
});

export const getConnection = (): Promise<PoolConnection> =>
  pool.getConnection().catch((error: unknown) => {
    console.error("Error connecting to MySQL:", error);

    throw error;
  });

export const releaseConnection = (connection?: PoolConnection | null): void => {
  if (connection) {
    pool.releaseConnection(connection);
  }
};
