import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import { getConnection, releaseConnection, request } from "@/utils/index.js";

import type { ActionFailType } from "../config/index.js";
import {
  DatabaseErrorResponse,
  MissingArgResponse,
  UnknownResponse,
  appIdInfo,
  donutAppIdInfo,
} from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";

export type AppID =
  | "wx33acb831ee1831a5"
  | "wx2550e3fd373b79a8"
  | "wx0009f7cdfeefa3da";

export type Env = "wx" | "donut";

export interface MPLoginCodeOptions {
  appId: AppID;
  env: Env;
  code: string;
}

export interface MPLoginOpenidOptions {
  openid: string;
}

export type MPLoginSuccessResponse = CommonSuccessResponse<{
  openid: string;
  inBlacklist: boolean;
  isAdmin: boolean;
}>;

export type MPloginFailResponse = CommonFailedResponse<
  | ActionFailType.MissingArg
  | ActionFailType.DatabaseError
  | ActionFailType.Unknown
>;

export type MPLoginOptions = MPLoginCodeOptions | MPLoginOpenidOptions;
export type MPLoginResponse = MPLoginSuccessResponse | MPloginFailResponse;

interface WechatErrorResponse {
  errcode: number;
  errmsg: string;
}

type MiniProgramLoginResponse =
  | { openid: string; session_key: string }
  | WechatErrorResponse;

type WechatOAuthLoginResponse =
  | {
      scope: "snsapi_userinfo";
      access_token: string;
      expires_in: 7200;
      refresh_token: string;
      openid: string;
      unionid?: string;
    }
  | WechatErrorResponse;

export const mpLoginHandler = request<MPLoginResponse, MPLoginOptions>(
  async (req, res) => {
    let connection: PoolConnection | null = null;

    try {
      let openid = "";

      if ("openid" in req.body) {
        if (!req.body.openid) return res.json(MissingArgResponse("openid"));

        ({ openid } = req.body);
      } else {
        const { env, appId, code } = req.body;

        if (!env) return res.json(MissingArgResponse("env"));
        if (!appId) return res.json(MissingArgResponse("appId"));
        if (!code) return res.json(MissingArgResponse("code"));

        if (env === "wx") {
          const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${
            appIdInfo[appId]
          }&js_code=${code}&grant_type=authorization_code`;

          const response = await fetch(url, {
            signal: AbortSignal.timeout(1500),
          });

          const result = (await response.json()) as MiniProgramLoginResponse;

          if ("errcode" in result) {
            console.error("小程序登录失败", result);

            return res.json(UnknownResponse(result.errmsg));
          }

          ({ openid } = result);
        }

        if (env === "donut") {
          const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${donutAppIdInfo[appId as keyof typeof donutAppIdInfo]}&secret=${
            appIdInfo[appId]
          }&code=${code}&grant_type=authorization_code`;

          const response = await fetch(url, {
            signal: AbortSignal.timeout(1500),
          });

          const result = (await response.json()) as WechatOAuthLoginResponse;

          if ("errcode" in result) {
            console.error("App 登录失败", result);

            return res.json(UnknownResponse(result.errmsg));
          }

          ({ openid } = result);
        }
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
        console.error("数据库查询失败，openid: %s", openid, err);

        return res.json(DatabaseErrorResponse((err as Error).message));
      }

      return res.json({
        success: true,
        data: {
          openid,
          inBlacklist,
          isAdmin,
        },
      });
    } catch (err) {
      console.error("小程序登陆失败", err);

      if (
        (err as Error).name === "AbortError" ||
        (err as Error).name === "TimeoutError"
      ) {
        return res.json(UnknownResponse("登录失败: 微信服务器响应超时"));
      }

      return res.json(UnknownResponse(`登录失败: ${(err as Error).message}`));
    } finally {
      releaseConnection(connection);
    }
  },
);
