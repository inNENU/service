import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

import type { ActionFailType } from "../config/index.js";
import {
  DatabaseErrorResponse,
  MissingArgResponse,
  MissingCredentialResponse,
  WrongPasswordResponse,
} from "../config/index.js";
import type { CommonFailedResponse } from "../typings.js";
import { getConnection, releaseConnection, request } from "../utils/index.js";

export interface MpRemoveOptions {
  appId: string;
  /** @deprecated */
  appID: string;
  id: string;
  authToken: string;
}

export type MpRemoveResponse =
  | { success: true }
  | CommonFailedResponse<
      | ActionFailType.DatabaseError
      | ActionFailType.MissingArg
      | ActionFailType.MissingCredential
      | ActionFailType.WrongPassword
      | ActionFailType.Unknown
    >;

export const mpRemoveHandler = request<MpRemoveResponse, MpRemoveOptions>(
  async (req, res) => {
    let connection: PoolConnection | null = null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const { appID, appId = appID, id, authToken } = req.body;

      if (!authToken || !id) return res.json(MissingCredentialResponse);
      if (!appId) return res.json(MissingArgResponse("appId"));

      connection = await getConnection();

      const [tokenResults] = await connection.execute<RowDataPacket[]>(
        "SELECT * FROM `token` WHERE `appId` = ? AND `id` = ? AND `authToken` = ?",
        [appId, id, authToken],
      );

      if (!tokenResults.length) return res.json(WrongPasswordResponse);

      // remove info from database
      try {
        await connection.execute<ResultSetHeader>(
          "DELETE FROM `student_info` WHERE `id` = ?",
          [id],
        );
        await connection.execute<ResultSetHeader>(
          "DELETE FROM `student_avatar` WHERE `id` = ?",
          [id],
        );
      } catch (err) {
        console.error(err);

        return res.json(DatabaseErrorResponse((err as Error).message));
      }

      return res.json({ success: true });
    } finally {
      releaseConnection(connection);
    }
  },
);
