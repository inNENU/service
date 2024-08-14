import { CookieStore } from "@mptool/net";
import type { RichTextNode } from "@mptool/parser";
import { getRichTextNodes } from "@mptool/parser";

import type { ActionFailType } from "../../config/index.js";
import type { CommonFailedResponse } from "../../typings.js";
import type { ResetCaptchaInfo } from "../reset-captcha.js";
import { getResetCaptcha } from "../reset-captcha.js";

const LICENSE_TEXT = `
<ol><li>在使用统一身份认证系统登录前，请确保完成账号激活流程。</li><li>在激活过程中，您需设置符合强密码要求的密码。</li><li>为完成激活，系统将采集您的手机号、邮箱等个人信息，以用于信息通知、密码找回及安全验证等场景。</li><li>激活成功后，您可使用 "学工号" 和所设置的密码，登录统一身份认证系统。</li><li>如在激活过程中遇到问题，请及时联系管理员</li></ol>`;

const LICENSE_NODES = await getRichTextNodes(LICENSE_TEXT);

export interface ActivateInfoSuccessResponse {
  success: true;
  data: ResetCaptchaInfo & { license: RichTextNode[] };
  cookieStore: CookieStore;
}

export type ActivateInfoResponse =
  | ActivateInfoSuccessResponse
  | CommonFailedResponse<ActionFailType.Restricted | ActionFailType.Unknown>;

export const getActivateInfo = async (
  cookieStore = new CookieStore(),
): Promise<ActivateInfoResponse> => {
  const captchaResponse = await getResetCaptcha(cookieStore);

  if (!captchaResponse.success) return captchaResponse;

  return {
    success: true,
    data: { ...captchaResponse.data, license: LICENSE_NODES },
    cookieStore: captchaResponse.cookieStore,
  };
};
