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

export const MissingArgResponse = (
  name = "必要",
): CommonFailedResponse<ActionFailType.MissingArg> => ({
  success: false,
  type: ActionFailType.MissingArg,
  msg: `缺少${name}参数`,
});

export const InvalidArgResponse = (
  name = "",
): CommonFailedResponse<ActionFailType.InvalidArg> => ({
  success: false,
  type: ActionFailType.InvalidArg,
  msg: `${name}参数非法`,
});

export const UnknownResponse = (
  msg: string,
): CommonFailedResponse<ActionFailType.Unknown> => ({
  success: false,
  type: ActionFailType.Unknown,
  msg,
});
