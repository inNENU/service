import { ACTION_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import type { ActionFailType } from "../config/index.js";
import { ExpiredResponse, UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";
import { request } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/login.js";

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

export type CardBalanceSuccessResponse = CommonSuccessResponse<number>;

export type CardBalanceResponse =
  | CardBalanceSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Expired | ActionFailType.Unknown>;

const TEST_CARD_BALANCE_RESPONSE: CardBalanceSuccessResponse = {
  success: true,
  data: 10,
};

export const getCardBalance = async (
  cookieHeader: string,
): Promise<CardBalanceResponse> => {
  const response = await fetch(CARD_BALANCE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
      Referer: `${ACTION_SERVER}/basicInfo/studentPageTurn?type=lifeschool`,
    },
    body: CARD_BALANCE_PARAMS,
    redirect: "manual",
  });

  if (response.status === 302) return ExpiredResponse;

  const data = (await response.json()) as RawCardBalanceData;

  if (!data.success) return UnknownResponse(JSON.stringify(data));

  const balanceList = data.demo.items.item;

  return {
    success: true,
    data: /\d+/.exec(balanceList[0].kye) ? Number(balanceList[0].kye) / 100 : 0,
  };
};

export const cardBalanceHandler = request<CardBalanceResponse>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST"))
      return res.json(TEST_CARD_BALANCE_RESPONSE);

    return res.json(await getCardBalance(cookieHeader));
  },
);
