import type { RequestHandler } from "express";

import { getInfo } from "./info.js";
import { myLogin } from "./login.js";
import { getProcess } from "./process.js";
import { SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";

// Note: This can be inferred from app list
const APPLY_MAIL_APP_ID = "GRYXSQ";
const APPLY_MAIL_APP_KEY = "b0bd57d10d6540948c7cd6b4441d4ab3";

export type ActivateEmailOptions = LoginOptions &
  (
    | { type: "get" }
    | {
        type: "set";
        name: string;
        password: string;
        phone: number;
        suffix: number;
        taskId: string;
        instanceId: string;
      }
  );

type RawCheckMailData = { flag: false; yxmc: string } | { flag: true };

interface RawAccountList {
  success: boolean;
  data: { text: string; value: string }[];
}

export interface InitEmailSuccessResponse {
  success: true;
  data: string[];
  taskId: string;
  instanceId: string;
}

export interface InitEmailFailedResponse {
  success: false;
  msg: string;
  email: string;
}

export interface ActivateEmailSuccessResponse {
  success: true;
  password: string;
}

export type ActivateEmailResponse =
  | ActivateEmailSuccessResponse
  | InitEmailSuccessResponse
  | InitEmailFailedResponse
  | CommonFailedResponse;

export const emailHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  ActivateEmailOptions
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      const result = await myLogin(req.body);

      if (!result.success) return res.json(result);
      cookieHeader = result.cookieStore.getHeader(SERVER);
    }

    const info = await getInfo(cookieHeader);

    if (!info.success) return res.json(info);

    const { id } = req.body;

    if (req.body.type === "set") {
      const { name, password, phone, suffix, taskId, instanceId } = req.body;

      // TODO: add something
      const checkMailAccountResponse = await fetch(
        "https://my.webvpn.nenu.edu.cn/Gryxsq/checkMailBoxAccount",
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

      const checkResult = <{ suc: boolean }>(
        await checkMailAccountResponse.json()
      );

      if (checkResult.suc)
        return res.json({
          success: false,
          msg: "邮箱账户已存在",
        });

      const setMailResponse = await fetch(
        `${SERVER}/dynamicDrawForm/submitAndSend`,
        {
          method: "POST",
          headers: {
            Accept: "application/json, text/javascript, */*; q=0.01",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Cookie: cookieHeader,
          },
          body: new URLSearchParams({
            f: "72f6e76cde1b4af890adf5f417ee153f",
            b: "null",
            TASK_ID_: taskId,
            PROC_INST_ID_: instanceId,
            id__: "",
            creator__: "",
            pid__: "",
            RYLB: info.data.code,
            SFSYZDYMC: "1",
            YXZDYMC: "",
            KEYWORDS_: "邮箱",
            SQRXM: info.data.name,
            SQRXH: info.data.id.toString(),
            SQRDW: info.data.orgName,
            SFZH: info.data.idCard,
            DHHM: phone.toString(),
            YXMC: name ?? "",
            SFSYSZ: suffix ? "2" : "1",
            YXHZ: suffix?.toString() ?? "",
            MM: password,
          }),
        },
      );

      const setMailResult = <{ success: boolean }>await setMailResponse.json();

      if (setMailResult.success === false)
        return res.json({
          success: false,
          msg: "申请失败",
        });

      return res.json({
        success: true,
        mail: `${name}${suffix ?? ""}@nenu.edu.cn`,
        password,
      });
    }

    const checkMailResponse = await fetch(`${SERVER}/Gryxsq/checkMailBox`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
      },
      body: `userId=${id}`,
    });

    const checkResult = <RawCheckMailData>await checkMailResponse.json();

    if (!checkResult.flag)
      return res.json(<InitEmailFailedResponse>{
        success: false,
        msg: "用户已有邮箱",
        email: checkResult.yxmc,
      });

    const processResult = await getProcess({
      id,
      processId: APPLY_MAIL_APP_ID,
      processKey: APPLY_MAIL_APP_KEY,
      identify: info.data.type,
      cookieHeader,
    });

    if (processResult.success === false) return res.json(processResult);

    const { taskId, instanceId } = processResult;

    const accountListResponse = await fetch(
      `${SERVER}/sysform/getSelectOption?random=${Math.random()}`,
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

    const accountListResult = <RawAccountList>await accountListResponse.json();

    if (accountListResult.success)
      return res.json(<InitEmailSuccessResponse>{
        success: true,
        data: accountListResult.data
          .map(({ value }) => value)
          .filter((item) => Boolean(item)),
        taskId,
        instanceId,
      });

    return res.json(<CommonFailedResponse>{
      success: false,
      msg: "获取可用邮箱失败",
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
