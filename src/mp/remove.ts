import type { RequestHandler } from "express";
import type { PoolConnection, ResultSetHeader } from "mysql2/promise";

import { MissingCredentialResponse, UnknownResponse } from "../config/index.js";
import type { EmptyObject } from "../typings.js";
import { getConnection, releaseConnection } from "../utils/index.js";

export const mpRemoveHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  { id: string; mpToken: string }
> = async (req, res) => {
  let connection: PoolConnection | null = null;

  try {
    const { id, mpToken } = req.body;

    if (!mpToken || !id) return MissingCredentialResponse;

    connection = await getConnection();

    // remove record
    const [results] = await connection.execute<ResultSetHeader>(
      `DELETE * FROM student_info WHERE id = ? AND uuid = ?`,
      [id, mpToken],
    );

    return res.json({
      success: results.affectedRows > 0,
    });
  } catch (err) {
    console.error(err);

    return res.json(UnknownResponse((err as Error).message));
  } finally {
    releaseConnection(connection);
  }
};
