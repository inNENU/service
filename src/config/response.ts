import type { CommonFailedResponse } from "../typings.js";
import { ActionFailType } from "./actionFailType.js";

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

export const RestrictedResponse: CommonFailedResponse<ActionFailType.Restricted> =
  {
    success: false,
    type: ActionFailType.Restricted,
    msg: "当前时段系统已关闭，请稍后重试",
  };

export const WrongPasswordResponse: CommonFailedResponse<ActionFailType.WrongPassword> =
  {
    success: false,
    type: ActionFailType.WrongPassword,
    msg: "用户名或密码错误",
  };

export const DatabaseErrorResponse = (
  msg: string,
): CommonFailedResponse<ActionFailType.DatabaseError> => ({
  success: false,
  type: ActionFailType.DatabaseError,
  msg,
});

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

export const UnknownResponse = (msg: string): CommonFailedResponse => ({
  success: false,
  type: ActionFailType.Unknown,
  msg,
});
