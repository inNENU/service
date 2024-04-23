import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { ACTION_SERVER } from "./utils.js";
import type {
  AuthLoginFailedResponse,
  AuthLoginFailedResult,
} from "../auth/index.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import type { VPNLoginFailedResult } from "../vpn/login.js";

const CARD_BALANCE_URL = `${ACTION_SERVER}/soapBasic/postSoap`;
const CARD_BALANCE_PARAMS =
  "serviceAddress=wis-apis%2Fsoap%2F00001_00083_01_02_20181210185800&serviceSource=ds2&params=%7B%22xgh%22%3Anull%7D";

type RawCardBalanceData =
  | {
      success: true;
      demo: {
        items: {
          item: [{ kye: string }];
        };
      };
    }
  | { success: false };

export interface CardBalanceSuccessResponse {
  success: true;
  data: number;
}

export type CardBalanceResponse =
  | CardBalanceSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResult
  | CommonFailedResponse;

export const cardBalanceHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  Partial<LoginOptions>
> = async (req, res) => {
  try {
    if (!req.headers.cookie) {
      if (!req.body.id || !req.body.password)
        return res.json({
          success: false,
          msg: "请提供账号密码",
        } as CommonFailedResponse);

      const result = await actionLogin(req.body as LoginOptions);

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(CARD_BALANCE_URL);
    }

    const response = await fetch(CARD_BALANCE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: req.headers.cookie,
        Referer: `${ACTION_SERVER}/basicInfo/studentPageTurn?type=lifeschool`,
      },
      body: CARD_BALANCE_PARAMS,
      redirect: "manual",
    });

    if (response.status === 302)
      return res.json({
        success: false,
        type: LoginFailType.Expired,
        msg: "登录信息已过期，请重新登录",
      } as AuthLoginFailedResponse);

    const data = (await response.json()) as RawCardBalanceData;

    if (data.success) {
      const balanceList = data.demo.items.item;

      console.log(balanceList);

      return res.json({
        success: true,
        data: balanceList[0]?.kye.match(/\d+/)
          ? Number(balanceList[0].kye) / 100
          : 0,
      } as CardBalanceSuccessResponse);
    }

    return res.json({
      success: false,
      msg: JSON.stringify(data),
    } as AuthLoginFailedResult);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResult);
  }
};
