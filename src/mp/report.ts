import type { PoolConnection } from "mysql2/promise";
import { v7 } from "uuid";

import { getConnection, releaseConnection, request } from "@/utils/index.js";

import type { ActionFailType } from "../config/index.js";
import { DatabaseErrorResponse } from "../config/index.js";
import type { CommonFailedResponse } from "../typings.js";

export interface MpReportOptions extends Record<string, unknown> {
  type?: string;
}

export type MpReportResponse =
  | { success: true }
  | CommonFailedResponse<ActionFailType.DatabaseError | ActionFailType.Unknown>;

export const mpReportHandler = request<MpReportResponse, MpReportOptions>(
  async (req, res) => {
    let connection: PoolConnection | null = null;

    try {
      connection = await getConnection();

      await connection.execute(
        "INSERT INTO `log` (`uuid`, `type`, `content`, `createTime`) VALUES (?, ?, ?, NOW())",
        [v7(), req.body.type ?? null, JSON.stringify(req.body)],
      );

      return res.send({ success: true });
    } catch (err) {
      console.error(err);

      return DatabaseErrorResponse((err as Error).message);
    } finally {
      releaseConnection(connection);
    }
  },
);
