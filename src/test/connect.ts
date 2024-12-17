import type { PoolConnection } from "mysql2/promise";

import { getConnection, request } from "../utils/index.js";

export const testConnectHandler = request(async (_req, res) => {
  let connection: PoolConnection | null = null;

  try {
    connection = await getConnection();

    connection?.release();

    res.send("Connected to MySQL");
  } catch (error) {
    console.error("Error connecting to MySQL:", error);

    return res.status(500).send("Error connecting to MySQL");
  }
});
