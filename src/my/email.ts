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
import { CookieStore } from "../utils/index.js";

// TODO: This can be inferred from app list
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
        cookieHeader: string;
      }
  );

interface RawAccountList {
  success: boolean;
  data: { text: string; value: string }[];
}

export interface InitEmailSuccessResponse {
  success: true;
  data: string[];
  cookieHeader: string;
  taskId: string;
  instanceId: string;
}

export interface ActivateEmailSuccessResponse {
  success: true;
  password: string;
}

export type ActivateEmailResponse =
  | ActivateEmailSuccessResponse
  | InitEmailSuccessResponse
  | CommonFailedResponse;

export const emailHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  ActivateEmailOptions
> = async (req, res) => {
  try {
    const { id, type } = req.body;

    const cookieStore = new CookieStore();

    if (!req.headers.cookie) {
      const result = await myLogin(req.body, cookieStore);

      if (!result.success) return res.json(result);
    }

    if (type === "set") {
      const { name, password, phone, suffix, taskId, instanceId } = req.body;

      let { cookieHeader } = req.body;

      if (!cookieHeader) {
        const result = await myLogin(req.body);

        if (!result.success) return res.json(result);
        cookieHeader = result.cookieStore.getHeader(SERVER);
      }

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
        }
      );

      const checkResult = <{ suc: boolean }>(
        await checkMailAccountResponse.json()
      );

      if (checkResult.suc)
        return res.json({
          success: false,
          msg: "邮箱账户已存在",
        });

      const info = await getInfo(cookieHeader);

      if (!info.success) return res.json(info);

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
        }
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

    let orgCode = 0;
    let identify = "";

    const checkMailResponse = await fetch(
      "https://my.webvpn.nenu.edu.cn/Gryxsq/checkMailBox",
      {
        method: "POST",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: cookieStore.getHeader(SERVER),
        },
        body: `userId=${id}`,
      }
    );

    const checkResult = <{ flag: boolean }>await checkMailResponse.json();

    if (!checkResult.flag)
      // TODO: Add email name return

      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "用户已有邮箱",
      });

    const processResult = await getProcess({
      id,
      processId: APPLY_MAIL_APP_ID,
      processKey: APPLY_MAIL_APP_KEY,
      orgCode,
      identify,
      cookieHeader: cookieStore.getHeader(SERVER),
    });

    if (processResult.success === false) return res.json(processResult);

    const { taskId, instanceId } = processResult;
    // const { taskId, instanceId, realFormPath } = processResult;

    // const url = new URL(`${SERVER}${realFormPath}`);

    // const params = {
    //   f: url.searchParams.get("f")!,
    //   TASK_ID_: taskId,
    //   PROC_INST_ID_: instanceId,
    //   b: "null",
    // };

    // const formResponse = await fetch(`${url.origin}${url.pathname}`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/x-www-form-urlencoded",
    //     Cookie: cookieStore.getHeader(SERVER),
    //   },
    //   body: new URLSearchParams(params),
    // });

    // const formContent = await formResponse.text();

    const accountListUrl = `${SERVER}/sysform/getSelectOption?random=${Math.random()}`;

    const accountListResponse = await fetch(accountListUrl, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieStore.getHeader(SERVER),
      },
      body: new URLSearchParams({
        beanId: "GryxsqService",
        method: "getAccountList",
        paramStr: "{}",
      }).toString(),
    });

    const accountListResult = <RawAccountList>await accountListResponse.json();

    if (accountListResult.success)
      return res.json(<InitEmailSuccessResponse>{
        success: true,
        data: accountListResult.data
          .map(({ value }) => value)
          .filter((item) => Boolean(item)),
        cookieHeader: cookieStore.getHeader(SERVER),
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
