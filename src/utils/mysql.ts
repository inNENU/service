import type { PoolConnection } from "mysql2/promise";
import { createPool } from "mysql2/promise";

// oxlint-disable-next-line import/no-unassigned-import
import "@/config/loadEnv.js";

// 创建 MySQL 连接池
export const mysqlPool = createPool({
  host: process.env.MYSQL_HOST ?? "localhost",
  port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
  database: process.env.MYSQL_DATABASE ?? "innenu-service",
  user: process.env.MYSQL_USER ?? "innenu",
  password: process.env.MYSQL_PASSWORD,
  connectTimeout: 3000,
  connectionLimit: 100,
  queueLimit: 300,
});

export const getConnection = (): Promise<PoolConnection> =>
  mysqlPool.getConnection().catch((err: unknown) => {
    console.error("Error connecting to MySQL:", err);

    throw err;
  });

export const releaseConnection = (connection?: PoolConnection | null): void => {
  try {
    if (connection) mysqlPool.releaseConnection(connection);
  } catch (err) {
    console.error("Error releasing MySQL connection:", err);
  }
};
