import { MY_MAIN_PAGE, MY_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import type { ActionFailType } from "../config/index.js";
import { ExpiredResponse, UnknownResponse } from "../config/index.js";
import type { CommonFailedResponse } from "../typings.js";

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

export interface MyProcessSuccessResult {
  success: true;
  taskId: string;
  processId: string;
  processKey: string;
  instanceId: string;
  formPath: string;
  realFormPath: string;
}

export type MyProcessResult =
  | MyProcessSuccessResult
  | AuthLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Expired>;

export const getProcess = async (
  processId: string,
  cookieHeader: string,
): Promise<MyProcessResult> => {
  const processURL = `${MY_SERVER}/wf/process/startProcessByKey/${processId}?random=${Math.random()}`;

  const response = await fetch(processURL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
      Referer: MY_MAIN_PAGE,
    },
    body: "isFormPathDetail=false",
  });

  if (response.status === 302) return ExpiredResponse;

  if (response.status === 200) {
    const content = (await response.json()) as RawProcessResult;

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

  return UnknownResponse("获取流程信息失败");
};
