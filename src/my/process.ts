import { MAIN_PAGE, SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type { CommonFailedResponse } from "../typings.js";

export interface ProcessOptions {
  id: number;
  identify: string;
  processId: string;
  processKey: string;
  cookieHeader: string;
}

interface RawProcessResult {
  success: boolean;
  needShow: boolean;
  TASK_ID_: string;
  processDefinitionId: string;
  processDefinitionKey: string;
  PROC_INST_ID_: string;
  realFormPath: string;
  formPath: string;
}

export interface ProcessSuccessResult {
  success: boolean;
  taskId: string;
  processId: string;
  processKey: string;
  instanceId: string;
  formPath: string;
  realFormPath: string;
}

export type ProcessResult =
  | ProcessSuccessResult
  | AuthLoginFailedResponse
  | CommonFailedResponse;

export const getProcess = async ({
  processId,
  cookieHeader,
}: ProcessOptions): Promise<ProcessResult> => {
  // const queryURL = `${SERVER}/taskCenter/queryMyAffairesFlowCount?appid=${processKey}`;

  // const queryResponse = await fetch(queryURL, {
  //   headers: {
  //     Accept: "application/json, text/javascript, */*; q=0.01",
  //     Cookie: cookieHeader,
  //     Referer: MAIN_PAGE,
  //     "X-Requested-With": "XMLHttpRequest",
  //   },
  // });

  // const queryResult = <{ msg: string; flag: boolean }>(
  //   await queryResponse.json()
  // );

  // if (queryResult.flag) {
  //   const queryAppURL = `${SERVER}/appcenter/queryAppByAuthority`;

  //   const queryAppResponse = await fetch(queryAppURL, {
  //     method: "POST",
  //     headers: {
  //       Accept: "application/json, text/javascript, */*; q=0.01",
  //       "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  //       Cookie: cookieHeader,
  //       Referer: MAIN_PAGE,
  //     },
  //     body: new URLSearchParams({
  //       USERID: id.toString(),
  //       USERGROUP: identify,
  //       USERORG: orgCode.toString(),
  //       APPID: processKey,
  //     }),
  //   });

  //   const queryAppResult = <unknown>await queryAppResponse.json();

  //   console.log(queryAppResult);

  const processURL = `${SERVER}/wf/process/startProcessByKey/${processId}?random=${Math.random()}`;

  const response = await fetch(processURL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
      Referer: MAIN_PAGE,
      // "X-Requested-With": "XMLHttpRequest",
    },
    body: "isFormPathDetail=false",
  });

  if (response.status === 302)
    return <AuthLoginFailedResponse>{
      success: false,
      type: LoginFailType.Expired,
      msg: "登录信息已过期，请重新登录",
    };

  if (response.status === 200) {
    const content = <RawProcessResult>await response.json();

    return {
      success: true,
      taskId: content.TASK_ID_,
      instanceId: content.PROC_INST_ID_,
      formPath: content.formPath,
      realFormPath: content.realFormPath,
      processId: content.processDefinitionId,
      processKey: content.processDefinitionKey,
    };
  }
  // }

  return {
    success: false,
    msg: "获取流程信息失败",
  };
};
