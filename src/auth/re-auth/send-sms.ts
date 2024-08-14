import {
  ActionFailType,
  MissingArgResponse,
  MissingCredentialResponse,
  UnknownResponse,
} from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
} from "../../typings.js";
import { middleware } from "../../utils/index.js";
import { AUTH_SERVER, RE_AUTH_URL } from "../utils.js";

const RE_AUTH_SMS_URL = `${AUTH_SERVER}/authserver/dynamicCode/getDynamicCodeByReauth.do`;

interface RawReAuthSMSSuccessResponse {
  res: "success";
  mobile: string;
  returnMessage: string;
  codeTime: number;
}

interface RawReAuthSMSFrequentResponse {
  res: "code_time_fail";
  codeTime: number;
  returnMessage: string;
}

interface RawReAuthSMSFailResponse {
  res: `${string}_fail`;
  codeTime: number;
  returnMessage: string;
}

type RawReAuthSMSResponse =
  | RawReAuthSMSSuccessResponse
  | RawReAuthSMSFrequentResponse
  | RawReAuthSMSFailResponse;

type ReAuthSMSSuccessResponse = CommonSuccessResponse<{
  /** 下一个验证码的间隔秒数 */
  codeTime: number;
  /** 手机号 */
  hiddenCellphone: string;
}>;

export type ReAuthSMSResponse =
  | ReAuthSMSSuccessResponse
  | (CommonFailedResponse<ActionFailType.TooFrequent> & { codeTime: number })
  | CommonFailedResponse<ActionFailType.Unknown>;

export const sendReAuthSMS = async (
  cookieHeader: string,
  id: string,
): Promise<ReAuthSMSResponse> => {
  await fetch(RE_AUTH_URL, {
    headers: {
      Cookie: cookieHeader,
      "User-Agent": "inNENU",
    },
    redirect: "manual",
  });

  const response = await fetch(RE_AUTH_SMS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
      Referer: RE_AUTH_URL,
      "User-Agent": "inNENU",
    },
    body: `userName=${id}&authCodeTypeName=reAuthDynamicCodeType`,
  });

  const result = (await response.json()) as RawReAuthSMSResponse;

  if (result.res === "code_time_fail")
    return {
      success: false,
      type: ActionFailType.TooFrequent,
      msg: result.returnMessage,
      codeTime: result.codeTime,
    };

  if (result.res !== "success") return UnknownResponse(result.returnMessage);

  return {
    success: true,
    data: {
      codeTime: result.codeTime,
      hiddenCellphone: result.mobile,
    },
  };
};

export const startReAuthHandler = middleware<
  ReAuthSMSResponse,
  EmptyObject,
  { id: string }
>(async (req, res) => {
  const cookieHeader = req.headers.cookie;
  const { id } = req.query;

  if (!cookieHeader) return MissingCredentialResponse;
  if (!id) return MissingArgResponse("id");

  return res.json(await sendReAuthSMS(cookieHeader, id));
});
