import type { PoolConnection } from "mysql2/promise";
import mysql from "mysql2/promise";
import "../config/loadEnv.js";

// 创建 MySQL 连接池
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "localhost",
  port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
  database: "innenu-service",
  user: process.env.MYSQL_USER ?? "innenu",
  password: process.env.MYSQL_PASSWORD,
  connectTimeout: 5000,
  connectionLimit: 20,
});

export const connect = (): Promise<{
  connection: PoolConnection;
  release: () => void;
}> =>
  pool
    .getConnection()
    .then((connection) => ({
      connection,
      release: (): void => pool.releaseConnection(connection),
    }))
    .catch((error) => {
      console.error("Error connecting to MySQL:", error);

      throw error;
    });
