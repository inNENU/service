import { ActionFailType } from "./actionFailType.js";
import type { CommonFailedResponse } from "../typings.js";

export const MissingCredentialResponse: CommonFailedResponse<ActionFailType.MissingCredential> =
  {
    success: false,
    type: ActionFailType.MissingCredential,
    msg: "缺少用户凭据",
  };

export const ExpiredResponse: CommonFailedResponse<ActionFailType.Expired> = {
  success: false,
  type: ActionFailType.Expired,
  msg: "登录信息已过期，请重新登录",
};

export const MissingRequiredResponse = (
  name = "必要",
): CommonFailedResponse<ActionFailType.MissingRequired> => ({
  success: false,
  type: ActionFailType.MissingRequired,
  msg: `缺少${name}参数`,
});

export const UnknownResponse = (
  msg: string,
): CommonFailedResponse<ActionFailType.Unknown> => ({
  success: false,
  type: ActionFailType.Unknown,
  msg,
});
