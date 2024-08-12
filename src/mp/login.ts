import type { RequestHandler } from "express";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import {
  DatabaseErrorResponse,
  MissingArgResponse,
  UnknownResponse,
  appIDInfo,
} from "../config/index.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";
import { getConnection, releaseConnection } from "../utils/index.js";

export type AppID = "wx33acb831ee1831a5" | "wx2550e3fd373b79a8" | 1109559721;
export type Env = "qq" | "wx" | "web";

export interface MPLoginCodeOptions {
  appID: AppID;
  env: string;
  code: string;
}

export interface MPLoginOpenidOptions {
  openid: string;
}

export interface MPloginSuccessResponse {
  success: true;
  openid: string;
  inBlacklist: boolean;
  isAdmin: boolean;
}

export type MPloginFailResponse = CommonFailedResponse;

export type MPLoginResponse = MPloginSuccessResponse | MPloginFailResponse;

export const mpLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  MPLoginCodeOptions | MPLoginOpenidOptions
> = async (req, res) => {
  try {
    let openid = "";

    if ("openid" in req.body) {
      if (!req.body.openid) return MissingArgResponse("openid");
      ({ openid } = req.body);
    } else {
      const { env, appID, code } = req.body;

      if (!env) return MissingArgResponse("env");
      if (!appID) return MissingArgResponse("appID");
      if (!code) return MissingArgResponse("code");

      const url = `https://api.${
        env === "qq" ? "q" : "weixin"
      }.qq.com/sns/jscode2session?appid=${appID}&secret=${
        appIDInfo[appID]
      }&js_code=${code}&grant_type=authorization_code`;
      const response = await fetch(url);

      ({ openid } = (await response.json()) as { openid: string });
    }

    let connection: PoolConnection | null = null;
    let inBlacklist = false;
    let isAdmin = false;

    try {
      connection = await getConnection();

      const [openidRows] = await connection.execute<RowDataPacket[]>(
        "SELECT * FROM `openid_blacklist` WHERE `openid` = ?",
        [openid],
      );
      const [adminRows] = await connection.execute<RowDataPacket[]>(
        "SELECT * FROM `admin` WHERE `openid` = ?",
        [openid],
      );

      inBlacklist = openidRows.length > 0;
      isAdmin = adminRows.length > 0;

      console.info(`Blocking user ${openid}`);
    } catch (err) {
      console.error(err);

      return res.json(DatabaseErrorResponse((err as Error).message));
    } finally {
      releaseConnection(connection);
    }

    return res.json({
      openid,
      inBlacklist,
      isAdmin,
    } as MPloginSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
