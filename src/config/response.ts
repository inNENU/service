import { ActionFailType } from "./actionFailType.js";
import type { CommonFailedResponse } from "../typings.js";

export const ExpiredResponse: CommonFailedResponse<ActionFailType.Expired> = {
  success: false,
  type: ActionFailType.Expired,
  msg: "登录信息已过期，请重新登录",
};
