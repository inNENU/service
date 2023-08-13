import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { SERVER } from "./utils.js";
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

const CARD_BALANCE_URL = `${SERVER}/soapBasic/postSoap`;
const CARD_BALANCE_PARAMS =
  '"serviceAddress=wis-apis%2Fsoap%2F00001_00083_01_02_20181210185800&serviceSource=ds2&params=%7B%22xgh%22%3Anull%7D"';

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
  | CommonFailedResponse;

export const cardBalanceHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  Partial<LoginOptions>
> = async (req, res) => {
  try {
    if (!req.headers.cookie) {
      if (!req.body.id || !req.body.password)
        return res.json(<CommonFailedResponse>{
          success: false,
          msg: "请提供账号密码",
        });

      const result = await actionLogin(<LoginOptions>req.body);

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(CARD_BALANCE_URL);
    }

    const response = await fetch(CARD_BALANCE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: req.headers.cookie,
        Referer: `${SERVER}/basicInfo/studentPageTurn?type=lifeschool`,
      },
      body: CARD_BALANCE_PARAMS,
      redirect: "manual",
    });

    if (response.status === 302)
      return res.json(<AuthLoginFailedResponse>{
        success: false,
        type: LoginFailType.Expired,
        msg: "登录信息已过期，请重新登录",
      });

    const data = <RawCardBalanceData>await response.json();

    if (data.success) {
      const balanceList = data.demo.items.item;

      return res.json(<CardBalanceSuccessResponse>{
        success: true,
        data:
          balanceList[0]?.kye === "number"
            ? Number(balanceList[0].kye) / 100
            : 0,
      });
    }

    return res.json(<AuthLoginFailedResult>{
      success: false,
      msg: JSON.stringify(data),
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
