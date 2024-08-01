import mysql from "mysql2/promise";

// 创建 MySQL 连接池
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "localhost",
  port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
  database: "innenu-service",
  user: process.env.MYSQL_USER ?? "innenu",
  password: process.env.MYSQL_PASSWORD,
  connectionLimit: 20,
});

export const getConnection = (): Promise<mysql.PoolConnection> =>
  pool.getConnection().catch((error) => {
    console.error("Error connecting to MySQL:", error);
    throw error;
  });
