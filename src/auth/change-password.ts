import type { RequestHandler } from "express";

import { authEncrypt } from "./auth-encrypt.js";
import { authLogin } from "./login.js";
import { AUTH_SERVER, SALT_REGEXP } from "./utils.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  EmptyObject,
} from "../typings.js";

export interface ChangePasswordOptions {
  /** 认证 Cookie */
  authCookie: string;
  /** 图片验证码 */
  captcha: string;
  /** 旧密码 */
  oldPassword: string;
  /** 新密码 */
  newPassword: string;
  /** 随机盐值 */
  salt: string;
}

export interface ChangePasswordSuccessResponse {
  success: true;
}

export type ChangePasswordResponse =
  | ChangePasswordSuccessResponse
  | CommonFailedResponse;

export const changePasswordHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  AccountInfo | ChangePasswordOptions
> = async (req, res) => {
  try {
    if (req.method === "PATCH") {
      const { authCookie, captcha, oldPassword, newPassword, salt } =
        req.body as ChangePasswordOptions;

      console.log("Getting params", req.body);

      const changePasswordResponse = await fetch(
        `${AUTH_SERVER}/authserver/passwordChange.do`,
        {
          method: "POST",
          headers: {
            Cookie: authCookie,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            "map['password']": authEncrypt(oldPassword, salt),
            "map['newPassword']": authEncrypt(newPassword, salt),
            "map['passwordAgain']": authEncrypt(newPassword, salt),
            "map['captchaResponse']": captcha,
          }),
        },
      );

      const changePasswordResponseText = await changePasswordResponse.text();

      console.log(`Getting:`, changePasswordResponseText);

      if (changePasswordResponseText.includes("个人密码修改成功"))
        return res.json({
          success: true,
        } as ChangePasswordSuccessResponse);

      return res.json({
        success: false,
        msg: "修改失败",
      } as CommonFailedResponse);
    }

    const { id, password } = req.body as AccountInfo;

    console.log("Getting params", req.body);

    const result = await authLogin({ id, password });

    if (result.success) {
      const changePassWordUrl = `${AUTH_SERVER}/authserver/passwordChange.do`;

      const passwordChangePageResponse = await fetch(
        `${AUTH_SERVER}/authserver/passwordChange.do`,
        {
          method: "GET",
          headers: {
            Cookie: result.cookieStore.getHeader(changePassWordUrl),
          },
        },
      );

      const passwordPageContent = await passwordChangePageResponse.text();
      const salt = SALT_REGEXP.exec(passwordPageContent)![1];

      const recaptchaResponse = await fetch(
        `${AUTH_SERVER}/authserver/captcha.html?ts=${new Date().getMilliseconds()}`,
        {
          method: "GET",
          headers: {
            Cookie: result.cookieStore.getHeader(changePassWordUrl),
            Referer: `${AUTH_SERVER}/authserver/userAttributesEdit.do`,
          },
        },
      );

      const recaptchaImage = await recaptchaResponse.arrayBuffer();

      res.set("auth-cookies", result.cookieStore.getHeader(changePassWordUrl));
      res.set("salt", salt);

      recaptchaResponse.headers.forEach((value, key) => {
        res.set(key, value);
      });

      return res.end(Buffer.from(recaptchaImage));
    }

    return res.json({
      success: false,
      msg: "登录失败",
    } as CommonFailedResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
