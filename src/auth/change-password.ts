import type { RequestHandler } from "express";

import type { LoginOptions } from "./login.js";
import { customEncryptAES, login, saltRegExp } from "./login.js";
import type { EmptyObject } from "../typings.js";

export interface ChangePasswordOptions {
  authCookie: string;
  captcha: string;
  oldPassword: string;
  /** 新密码 */
  newPassword: string;
  salt: string;
}

export interface ChangePasswordSuccessResponse {
  status: "success";
}

export interface ChangePasswordFailedResponse {
  status: "failed";
  msg: string;
}

export type ChangePasswordResponse =
  | ChangePasswordSuccessResponse
  | ChangePasswordFailedResponse;

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
        "https://authserver.nenu.edu.cn/authserver/passwordChange.do",
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
        }
      );

      const changePasswordResponseText = await changePasswordResponse.text();

      console.log(
        `Status ${changePasswordResponse.status}, getting:`,
        changePasswordResponseText
      );

      if (changePasswordResponseText.includes("个人密码修改成功"))
        return res.json(<ChangePasswordSuccessResponse>{
          status: "success",
        });

      return res.json(<ChangePasswordFailedResponse>{
        status: "failed",
        msg: "修改失败",
      });
    }

    const { id, password } = <LoginOptions>req.body;

    console.log("Getting params", req.body);

    const result = await login({ id, password });

    if (result.status === "success") {
      const authCookie = result.cookies.join("; ");

      const passwordChangePageResponse = await fetch(
        "https://authserver.nenu.edu.cn/authserver/passwordChange.do",
        {
          method: "GET",
          headers: {
            Cookie: authCookie,
          },
        }
      );

      const passwordPageContent = await passwordChangePageResponse.text();
      const salt = saltRegExp.exec(passwordPageContent)![1];

      console.log("Getting salt", salt);

      const recaptchaResponse = await fetch(
        `https://authserver.nenu.edu.cn/authserver/captcha.html?ts=${new Date().getMilliseconds()}`,
        {
          method: "GET",
          headers: {
            Cookie: authCookie,
            Referer:
              "https://authserver.nenu.edu.cn/authserver/userAttributesEdit.do",
          },
        }
      );

      const recaptchaImage = await recaptchaResponse.arrayBuffer();

      res.set("auth-cookies", authCookie);
      res.set("salt", salt);

      recaptchaResponse.headers.forEach((value, key) => {
        res.set(key, value);
      });

      return res.end(Buffer.from(recaptchaImage));
    }

    return res.json(<ChangePasswordFailedResponse>{
      status: "failed",
      msg: "登录失败",
    });
  } catch (err) {
    return res.json(<ChangePasswordFailedResponse>{
      status: "failed",
      msg: "参数错误",
    });
  }
};
