import type { RequestHandler } from "express";
import type { PoolConnection } from "mysql2/promise";
import { v7 } from "uuid";

import { DatabaseErrorResponse } from "../config/index.js";
import type { EmptyObject } from "../typings.js";
import { getConnection, releaseConnection } from "../utils/index.js";

export const mpReportHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  Record<string, unknown>
> = async (req, res) => {
  let connection: PoolConnection | null = null;

  try {
    connection = await getConnection();

    await connection.execute(
      "INSERT INTO `log` (`uuid`, `type`, `content`) VALUES (?, ?, ?)",
      [v7(), req.body.type ?? null, JSON.stringify(req.body)],
    );

    return res.send({ success: true });
  } catch (err) {
    console.error(err);

    return DatabaseErrorResponse((err as Error).message);
  } finally {
    releaseConnection(connection);
  }
};
