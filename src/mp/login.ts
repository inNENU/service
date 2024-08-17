import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import type { ActionFailType } from "../config/index.js";
import {
  DatabaseErrorResponse,
  MissingArgResponse,
  appIDInfo,
} from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";
import {
  getConnection,
  middleware,
  releaseConnection,
} from "../utils/index.js";

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

// FIXME: Use StandardResponse
export interface MPLoginSuccessResponse
  extends CommonSuccessResponse<{
    openid: string;
    inBlacklist: boolean;
    isAdmin: boolean;
  }> {
  openid: string;
  inBlacklist: boolean;
  isAdmin: boolean;
}

export type MPloginFailResponse = CommonFailedResponse<
  | ActionFailType.MissingArg
  | ActionFailType.DatabaseError
  | ActionFailType.Unknown
>;

export type MPLoginOptions = MPLoginCodeOptions | MPLoginOpenidOptions;
export type MPLoginResponse = MPLoginSuccessResponse | MPloginFailResponse;

export const mpLoginHandler = middleware<MPLoginResponse, MPLoginOptions>(
  async (req, res) => {
    let connection: PoolConnection | null = null;

    try {
      let openid = "";

      if ("openid" in req.body) {
        if (!req.body.openid) return res.json(MissingArgResponse("openid"));

        ({ openid } = req.body);
      } else {
        const { env, appID, code } = req.body;

        if (!env) return res.json(MissingArgResponse("env"));
        if (!appID) return res.json(MissingArgResponse("appID"));
        if (!code) return res.json(MissingArgResponse("code"));

        const url = `https://api.${
          env === "qq" ? "q" : "weixin"
        }.qq.com/sns/jscode2session?appid=${appID}&secret=${
          appIDInfo[appID]
        }&js_code=${code}&grant_type=authorization_code`;
        const response = await fetch(url);

        ({ openid } = (await response.json()) as { openid: string });
      }

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

        if (inBlacklist) console.info(`Blocking user ${openid}`);
      } catch (err) {
        console.error(`Querying with openid ${openid}`, err);

        return res.json(DatabaseErrorResponse((err as Error).message));
      }

      return res.json({
        success: true,
        data: {
          openid,
          inBlacklist,
          isAdmin,
        },
        openid,
        inBlacklist,
        isAdmin,
      });
    } finally {
      releaseConnection(connection);
    }
  },
);
