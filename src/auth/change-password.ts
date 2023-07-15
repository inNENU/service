import type { RequestHandler } from "express";

import { authLogin, customEncryptAES, saltRegExp } from "./login.js";
import { AUTH_SERVER } from "./utils.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { getCookieHeader } from "../utils/cookie.js";

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
  LoginOptions | ChangePasswordOptions
> = async (req, res) => {
  try {
    if (req.method === "PATCH") {
      const { authCookie, captcha, oldPassword, newPassword, salt } = <
        ChangePasswordOptions
      >req.body;

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
            "map['password']": customEncryptAES(oldPassword, salt),
            "map['newPassword']": customEncryptAES(newPassword, salt),
            "map['passwordAgain']": customEncryptAES(newPassword, salt),
            "map['captchaResponse']": captcha,
          }),
        },
      );

      const changePasswordResponseText = await changePasswordResponse.text();

      console.log(`Getting:`, changePasswordResponseText);

      if (changePasswordResponseText.includes("个人密码修改成功"))
        return res.json(<ChangePasswordSuccessResponse>{
          success: true,
        });

      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "修改失败",
      });
    }

    const { id, password } = <LoginOptions>req.body;

    console.log("Getting params", req.body);

    const result = await authLogin({ id, password });

    if (result.success) {
      const authCookieHeader = getCookieHeader(result.cookies);

      const passwordChangePageResponse = await fetch(
        `${AUTH_SERVER}/authserver/passwordChange.do`,
        {
          method: "GET",
          headers: {
            Cookie: authCookieHeader,
          },
        },
      );

      const passwordPageContent = await passwordChangePageResponse.text();
      const salt = saltRegExp.exec(passwordPageContent)![1];

      const recaptchaResponse = await fetch(
        `${AUTH_SERVER}/authserver/captcha.html?ts=${new Date().getMilliseconds()}`,
        {
          method: "GET",
          headers: {
            Cookie: authCookieHeader,
            Referer: `${AUTH_SERVER}/authserver/userAttributesEdit.do`,
          },
        },
      );

      const recaptchaImage = await recaptchaResponse.arrayBuffer();

      res.set("auth-cookies", authCookieHeader);
      res.set("salt", salt);

      recaptchaResponse.headers.forEach((value, key) => {
        res.set(key, value);
      });

      return res.end(Buffer.from(recaptchaImage));
    }

    return res.json(<CommonFailedResponse>{
      success: false,
      msg: "登录失败",
    });
  } catch (err) {
    return res.json(<CommonFailedResponse>{
      success: false,
      msg: "参数错误",
    });
  }
};
