import { CookieStore } from "@mptool/net";
import type { RichTextNode } from "@mptool/parser";
import { getRichTextNodes } from "@mptool/parser";
import type { RequestHandler } from "express";

import { authEncrypt } from "./auth-encrypt.js";
import {
  ActionFailType,
  RestrictedResponse,
  UnknownResponse,
} from "../config/index.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";
import { generateRandomString } from "../utils/generateRandomString.js";

const ACTIVATE_SERVER = "https://activate.nenu.edu.cn";
// const ACTIVE_URL = `${ACTIVATE_SERVER}/retrieve-password/accountActivation/index.html`;
const CAPTCHA_URL = `${ACTIVATE_SERVER}/retrieve-password/generateCaptcha`;

const LICENSE_TEXT = `
<ol><li>在使用统一身份认证系统登录前，请确保完成账号激活流程。</li><li>2、在激活过程中，您需设置符合强密码要求的密码。</li><li>3、为完成激活，系统将采集您的手机号、邮箱等个人信息，以用于信息通知、密码找回及安全验证等场景。</li><li>4、激活成功后，您可使用 "学工号" 和所设置的密码，登录统一身份认证系统。</li><li>5、如在激活过程中遇到问题，请及时联系管理员</li></ol>`;

const LICENSE_NODES = await getRichTextNodes(LICENSE_TEXT);
const INFO_SALT = "rjBFAaHsNkKAhpoi";

export interface ActivateSuccessResponse {
  success: true;
}

export interface ActivateInfoSuccessResponse {
  success: true;
  license: RichTextNode[];
  image: string;
}

export type ActivateInfoResponse =
  | ActivateInfoSuccessResponse
  | CommonFailedResponse<ActionFailType.Restricted | ActionFailType.Unknown>;

const getInfo = async (
  cookieStore: CookieStore,
): Promise<ActivateInfoResponse> => {
  const imageResponse = await fetch(
    `${CAPTCHA_URL}?ltId=${generateRandomString(16)}&codeType=2`,
  );

  if (imageResponse.headers.get("Content-Type") === "text/html")
    return RestrictedResponse;

  if (!imageResponse.headers.get("Content-Type")?.startsWith("image/jpeg")) {
    return UnknownResponse("获取验证码失败");
  }

  cookieStore.applyResponse(imageResponse, CAPTCHA_URL);

  const base64Image = `data:image/jpeg;base64,${Buffer.from(
    await imageResponse.arrayBuffer(),
  ).toString("base64")}`;

  return {
    success: true,
    license: LICENSE_NODES,
    image: base64Image,
  };
};

export interface ActivateValidOptions {
  type: "valid";
  name: string;
  schoolId: string;
  idType: number;
  id: string;
  captcha: string;
  captchaId: string;
}

interface ActivateRawSuccessResponse {
  code: 0;
  msg: "成功";
  data: {
    activationId: string;
  };
}

interface RawErrorResponse {
  code: 20002;
  msg: string;
  data: Record<never, never>;
}

export interface ActivateValidSuccessResponse {
  success: true;
  activationId: string;
}

export type ActivateValidResponse =
  | ActivateValidSuccessResponse
  | CommonFailedResponse;

const validAccount = async (
  { schoolId, name, id, idType, captcha, captchaId }: ActivateValidOptions,
  cookieHeader: string,
): Promise<ActivateValidResponse> => {
  const response = await fetch(
    `${ACTIVATE_SERVER}/accountActivation/queryAccountByLoginNoAndId`,
    {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({
        loginNo: schoolId,
        loginName: name,
        captcha,
        captchaId,
        idType,
        idNo: authEncrypt(id, INFO_SALT),
      }),
    },
  );

  const activateResult = (await response.json()) as
    | ActivateRawSuccessResponse
    | RawErrorResponse;

  if (activateResult.code !== 0) return UnknownResponse(activateResult.msg);

  const { activationId } = activateResult.data;

  return {
    success: true,
    activationId,
  };
};

interface CodeRawSuccessResponse {
  code: 0;
  msg: "成功";
  data: Record<never, never>;
}

// TODO: Check this

interface CodeRawFailedResponse {
  code: number;
  msg: string;
  data: Record<never, never>;
}

export interface ActivatePhoneSmsOptions {
  type: "sms";
  activationId: string;
  mobile: string;
}

export type ActivatePhoneSmsResponse =
  | ActivateSuccessResponse
  | CommonFailedResponse;

const sendSms = async (
  { activationId, mobile }: ActivatePhoneSmsOptions,
  cookieHeader: string,
): Promise<ActivatePhoneSmsResponse> => {
  const sendCodeResponse = await fetch(
    `${ACTIVATE_SERVER}/api/staff/activate/checkCode`,
    {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({ activationId, mobile }),
    },
  );

  const sendCodeResult = (await sendCodeResponse.json()) as
    | CodeRawSuccessResponse
    | CodeRawFailedResponse;

  if (sendCodeResult.code !== 0) return UnknownResponse(sendCodeResult.msg);

  return { success: true };
};

export interface ActivateBindPhoneOptions {
  type: "bind-phone";
  activationId: string;
  mobile: string;
  code: string;
}

interface RawPhoneSuccessResponse {
  code: 0;
  msg: "成功";
  data: { boundStaffNo: string } | Record<string, string>;
}

export interface ActivateBindPhoneConflictResponse {
  success: false;
  type: ActionFailType.Conflict | ActionFailType.WrongCaptcha;
  msg: string;
}
export type ActivateBindPhoneResponse =
  | ActivateSuccessResponse
  | ActivateBindPhoneConflictResponse;

const bindPhone = async (
  { activationId, code, mobile }: ActivateBindPhoneOptions,
  cookieHeader: string,
): Promise<ActivateBindPhoneResponse> => {
  const response = await fetch(`${ACTIVATE_SERVER}/api/staff/activate/mobile`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify({ activationId, mobile, checkCode: code }),
  });

  const content = (await response.json()) as
    | RawPhoneSuccessResponse
    | RawErrorResponse;

  if (content.code !== 0)
    return {
      success: false,
      type: ActionFailType.WrongCaptcha,
      msg: content.msg,
    };

  if (content.data.boundStaffNo)
    return {
      success: false,
      type: ActionFailType.Conflict,
      msg: `该手机号已绑定 ${content.data.boundStaffNo} 学号。`,
    };

  return {
    success: true,
  };
};

export interface ActivateReplacePhoneOptions {
  type: "replace-phone";
  activationId: string;
  mobile: string;
  code: string;
}

export type ActivateReplacePhoneResponse =
  | ActivateSuccessResponse
  | CommonFailedResponse;

const replacePhone = async (
  { activationId, code, mobile }: ActivateReplacePhoneOptions,
  cookieHeader: string,
): Promise<ActivateReplacePhoneResponse> => {
  const response = await fetch(
    `${ACTIVATE_SERVER}/api/staff/activate/mobile/unbind`,
    {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({ activationId, mobile, checkCode: code }),
    },
  );

  const content = (await response.json()) as
    | RawPhoneSuccessResponse
    | RawErrorResponse;

  if (content.code !== 0) return UnknownResponse(content.msg);

  return {
    success: true,
  };
};

export interface ActivatePasswordOptions {
  type: "password";
  activationId: string;
  password: string;
}

export type ActivatePasswordResponse =
  | ActivateSuccessResponse
  | CommonFailedResponse;

const setPassword = async (
  { activationId, password }: ActivatePasswordOptions,
  cookieHeader: string,
): Promise<ActivatePasswordResponse> => {
  const response = await fetch(
    `${ACTIVATE_SERVER}/api/staff/activate/password`,
    {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({ activationId, password }),
    },
  );

  const content = (await response.json()) as
    | ActivateRawSuccessResponse
    | RawErrorResponse;

  if (content.code !== 0) return UnknownResponse(content.msg);

  return {
    success: true,
  };
};

export type ActivateOptions =
  | ActivateValidOptions
  | ActivatePhoneSmsOptions
  | ActivateBindPhoneOptions
  | ActivateReplacePhoneOptions
  | ActivatePasswordOptions;

export const activateHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  | ActivateValidOptions
  | ActivatePhoneSmsOptions
  | ActivateBindPhoneOptions
  | ActivateReplacePhoneOptions
  | ActivatePasswordOptions
> = async (req, res) => {
  if (req.method === "GET") {
    const cookieStore = new CookieStore();

    const response = await getInfo(cookieStore);
    const cookies = cookieStore.getAllCookies().map((item) => item.toJSON());

    cookies.forEach(({ name, value, ...rest }) => {
      res.cookie(name, value, rest);
    });

    return res.json(response);
  } else {
    try {
      const options = req.body;

      if (!req.headers.cookie) throw new Error(`Cookie is missing!`);

      const cookieHeader = req.headers.cookie;

      if (
        options.type === "valid" ||
        // FIXME: Remove this when new version lands
        // @ts-expect-error: Deprecated type
        options.type === "info"
      )
        return res.json(validAccount(options, cookieHeader));

      if (options.type === "sms")
        return res.json(sendSms(options, cookieHeader));

      if (options.type === "bind-phone")
        return res.json(bindPhone(options, cookieHeader));

      if (options.type === "replace-phone")
        return res.json(replacePhone(options, cookieHeader));

      if (options.type === "password")
        return res.json(setPassword(options, cookieHeader));

      // @ts-expect-error: Type is not expected
      throw new Error(`Unknown type: ${options.type}`);
    } catch (err) {
      const { message } = err as Error;

      console.error(err);

      return res.json({
        success: false,
        msg: message,
      } as CommonFailedResponse);
    }
  }
};

// checkValidateCode
// e.getMobileCode({
