import type { RequestHandler } from "express";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

import {
  MissingArgResponse,
  MissingCredentialResponse,
  UnknownResponse,
  WrongPasswordResponse,
} from "../config/index.js";
import type { EmptyObject } from "../typings.js";
import { getConnection, releaseConnection } from "../utils/index.js";

export const mpRemoveHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  { id: string; authToken: string; appID: string }
> = async (req, res) => {
  let connection: PoolConnection | null = null;

  try {
    const { appID, id, authToken } = req.body;

    if (!authToken || !id) return res.json(MissingCredentialResponse);
    if (!appID) return res.json(MissingArgResponse("appID"));

    connection = await getConnection();

    const [tokenResults] = await connection.execute<RowDataPacket[]>(
      "SELECT * FROM `token` WHERE `appId` = ? AND `id` = ? AND `token` = ?",
      [appID, id, authToken],
    );

    if (!tokenResults.length) return res.json(WrongPasswordResponse);

    // remove info from database
    await connection.execute<ResultSetHeader>(
      "DELETE * FROM `student_info` WHERE `id` = ?",
      [id],
    );
    await connection.execute<ResultSetHeader>(
      "DELETE * FROM `student_avatar` WHERE `id` = ?",
      [id],
    );

    return res.json({ success: true });
  } catch (err) {
    console.error(err);

    return res.json(UnknownResponse((err as Error).message));
  } finally {
    releaseConnection(connection);
  }
};
