import type { RequestHandler } from "express";

import { DatabaseError } from "../config/index.js";
import type { EmptyObject } from "../typings.js";
import { connect, getShortUUID } from "../utils/index.js";

export const mpReportHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  Record<string, unknown>
> = async (req, res) => {
  try {
    const { connection, release } = await connect();

    await connection.execute(
      `INSERT INTO log (uuid, type, content) VALUES (?, ?, ?)`,
      [getShortUUID(), req.body.type ?? null, JSON.stringify(req.body)],
    );

    release();

    res.send({ success: true });
  } catch (err) {
    console.error(err);

    return DatabaseError((err as Error).message);
  }
};
