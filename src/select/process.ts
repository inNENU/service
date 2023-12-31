import type { RequestHandler } from "express";

import { selectLogin } from "./login.js";
import { underCoursesStore } from "./store.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";

export interface ProcessOptions extends Partial<LoginOptions> {
  server: string;
  /** 课程号 */
  courseId: string;
  jx0502id: string;
  jx0502zbid: string;
}

export interface ProcessSuccessResponse {
  success: true;
  msg: string;
}

export interface ProcessFailedResponse extends CommonFailedResponse {
  type?: LoginFailType.Expired | "conflict" | "forbidden";
}

export type ProcessResponse = ProcessSuccessResponse | ProcessFailedResponse;

export const processHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  ProcessOptions
> = async (req, res) => {
  const { method } = req;

  if (!req.headers.cookie) {
    if (!req.body.id || !req.body.password)
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "请提供账号密码",
      });

    const result = await selectLogin(<LoginOptions>req.body);

    if (!result.success) return res.json(result);

    req.body.server = result.server;
    req.headers.cookie = result.cookieStore.getHeader(result.server);
  }

  try {
    const { server, courseId, jx0502id, jx0502zbid } = req.body;

    const url = `${server}xk/process${method === "DELETE" ? "Tx" : "Xk"}`;
    const params = new URLSearchParams({
      jx0502id,
      jx0502zbid,
      jx0404id: courseId,
    }).toString();

    console.log("Requesting with params:", params);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: req.headers.cookie,
      },
      body: params,
    });

    const rawData = await response.text();

    console.log("Raw data:", rawData);

    try {
      const { msgContent: msg } = <{ msgContent: string }>JSON.parse(rawData);

      if (msg === "系统更新了选课数据,请重新登录系统") {
        underCoursesStore.setState([]);

        return res.json(<ProcessFailedResponse>{
          success: false,
          msg,
          type: LoginFailType.Expired,
        });
      }

      if (msg === "您的账号在其它地方登录")
        return res.json(<ProcessFailedResponse>{
          success: false,
          msg,
          type: LoginFailType.Expired,
        });

      if (method === "DELETE") {
        if (msg.includes("退选成功"))
          return res.json(<ProcessSuccessResponse>{
            success: true,

            msg,
          });
      } else {
        if (
          msg === "不在选课时间范围内，无法选课!!" ||
          msg === "不允许跨校区选课！" ||
          msg === "此课程当前年级专业禁止选！" ||
          // TODO: Get exact message
          msg.includes("学分")
        )
          return res.json(<ProcessFailedResponse>{
            success: false,
            msg,
            type: "forbidden",
          });

        if (msg.endsWith("上课时间冲突"))
          return res.json({
            success: false,
            msg,
            type: "conflict",
          });

        if (msg === "选课成功")
          return res.json(<ProcessSuccessResponse>{
            success: true,

            msg,
          });
      }

      return res.json(<ProcessFailedResponse>{
        success: false,
        msg,
      });
    } catch (err) {
      const { message } = <Error>err;

      console.error(err);

      return res.json(<ProcessFailedResponse>{
        success: false,
        msg: message,
      });
    }
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);

    res.json(<ProcessFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
