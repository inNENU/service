import type { RequestHandler } from "express";

import { queryMyActions } from "./actions.js";
import type { MyInfo } from "./info.js";
import { getMyInfo } from "./info.js";
import type { MyLoginFailedResponse } from "./login.js";
import { myLogin } from "./login.js";
import { getProcess } from "./process.js";
import { MY_SERVER } from "./utils.js";
import { ActionFailType, UnknownResponse } from "../config/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";

// Note: This can be inferred from app list
const APPLY_MAIL_APP_ID = "GRYXSQ";

interface MailInitSuccessInfo {
  success: true;
  email: string;
  password: string;
}

type MailInitInfo = MailInitSuccessInfo | CommonFailedResponse;

const getMailInitInfo = async (
  cookieHeader: string,
  instanceId: string,
): Promise<MailInitInfo> => {
  const mailInfoResponse = await fetch(`${MY_SERVER}/Gryxsq/getResult`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
    },
    body: new URLSearchParams({
      PROC: instanceId,
    }),
  });

  const { MESSAGE, MAILNAME, PASSWORD } = (await mailInfoResponse.json()) as {
    result: "0";
    MESSAGE: string;
    MAILNAME: string;
    PASSWORD: string;
  };

  if (MESSAGE === "邮箱创建成功")
    return {
      success: true,
      email: `${MAILNAME}@nenu.edu.cn`,
      password: PASSWORD,
    };

  return UnknownResponse("邮箱创建失败，请联系信息化办");
};

export interface GetEmailInfoOptions extends LoginOptions {
  type: "get";
}

type RawCheckMailData = { flag: false; yxmc: string } | { flag: true };

interface RawAccountList {
  success: boolean;
  data: { text: string; value: string }[];
}

export interface GetEmailNameResponse {
  success: true;
  hasEmail: true;
  email: string;
}

export interface GetEmailInfoResponse {
  success: true;
  hasEmail: false;
  accounts: string[];
  taskId: string;
  instanceId: string;
}

export type GetEmailSuccessResponse =
  | GetEmailNameResponse
  | GetEmailInfoResponse;

export type GetEmailFailedResponse =
  | MyLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Expired>;

export type GetEmailResponse = GetEmailSuccessResponse | GetEmailFailedResponse;

export const getEmailInfo = async (
  cookieHeader: string,
  info: MyInfo,
): Promise<GetEmailResponse> => {
  const checkMailResponse = await fetch(`${MY_SERVER}/Gryxsq/checkMailBox`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
    },
    body: `userId=${info.id}`,
  });

  const checkResult = (await checkMailResponse.json()) as RawCheckMailData;

  if (!checkResult.flag) {
    const results = await queryMyActions(cookieHeader, APPLY_MAIL_APP_ID);

    if (!results[0]?.PROC_INST_ID_)
      return {
        success: false,
        type: ActionFailType.Unknown,
        msg: "邮箱已创建，但未找到到申请记录",
      };

    const mailInitInfo = await getMailInitInfo(
      cookieHeader,
      results[0].PROC_INST_ID_,
    );

    if (mailInitInfo.success === false) return mailInitInfo;

    return {
      ...mailInitInfo,
      hasEmail: true,
    };
  }

  const processResult = await getProcess(APPLY_MAIL_APP_ID, cookieHeader);

  if (processResult.success === false) return processResult;

  const { taskId, instanceId } = processResult;

  const accountListResponse = await fetch(
    `${MY_SERVER}/sysform/getSelectOption?random=${Math.random()}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
      },
      body: new URLSearchParams({
        beanId: "GryxsqService",
        method: "getAccountList",
        paramStr: "{}",
      }),
    },
  );

  const accountListResult =
    (await accountListResponse.json()) as RawAccountList;

  if (accountListResult.success)
    return {
      success: true,
      hasEmail: false,
      accounts: accountListResult.data
        .map(({ value }) => value)
        .filter((item) => Boolean(item)),
      taskId,
      instanceId,
    };

  return {
    success: false,
    type: ActionFailType.Unknown,
    msg: "获取可用邮箱失败",
  };
};

export interface ActivateEmailOptions extends LoginOptions {
  type: "set";
  name: string;
  phone: number | string;
  suffix?: number | string;
  taskId: string;
  instanceId: string;
}

export type ActivateMailSuccessResponse = MailInitSuccessInfo;

export type ActivateMailFailedResponse =
  | MyLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Existed | ActionFailType.Unknown>;

export type ActivateEmailResponse =
  | ActivateMailSuccessResponse
  | ActivateMailFailedResponse;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const activateEmail = async (
  cookieHeader: string,
  { name, phone, suffix, taskId, instanceId }: ActivateEmailOptions,
  info: MyInfo,
): Promise<ActivateEmailResponse> => {
  const checkMailAccountResponse = await fetch(
    `${MY_SERVER}/Gryxsq/checkMailBoxAccount`,
    {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
      },
      body: `mailBoxName=${name}`,
    },
  );

  const checkResult = (await checkMailAccountResponse.json()) as {
    suc: boolean;
    error_code: string;
  };

  if (checkResult.suc || !checkResult.error_code.startsWith("ACCOUNT.NOTEXIST"))
    return {
      success: false,
      type: ActionFailType.Existed,
      msg: "邮箱账户已存在",
    };

  const setMailResponse = await fetch(
    `${MY_SERVER}/dynamicDrawForm/submitAndSend`,
    {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
      },
      body: new URLSearchParams({
        // can be get through the process
        f: "72f6e76cde1b4af890adf5f417ee153f",
        b: "null",
        TASK_ID_: taskId,
        PROC_INST_ID_: instanceId,
        id__: "",
        creator__: "",
        pid__: "",
        RYLB: info.code,
        SFSYZDYMC: "1",
        YXZDYMC: "",
        KEYWORDS_: "邮箱",
        SQRXM: info.name,
        SQRXH: info.id.toString(),
        SQRDW: info.org,
        SFZH: info.idCard,
        DHHM: phone.toString(),
        YXMC: name ?? "",
        SFSYSZ: suffix ? "2" : "1",
        YXHZ: suffix?.toString() ?? "",
      }),
    },
  );

  const setMailResult = (await setMailResponse.json()) as { success: boolean };

  if (setMailResult.success === false) return UnknownResponse("申请失败");

  const initInfo = await getMailInitInfo(cookieHeader, instanceId);

  return initInfo;
};

export const emailHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  GetEmailInfoOptions | ActivateEmailOptions
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      const result = await myLogin(req.body as AccountInfo);

      if (!result.success) return res.json(result);
      cookieHeader = result.cookieStore.getHeader(MY_SERVER);
    }

    const info = await getMyInfo(cookieHeader);

    if (!info.success) return res.json(info);

    if (req.body.type === "set")
      return res.json({
        success: false,
        msg: "邮箱申请已移动至学校 OA 系统，正在适配中...",
      });
    // return res.json(await activateEmail(cookieHeader, req.body, info.data));

    return res.json(await getEmailInfo(cookieHeader, info.data));
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
