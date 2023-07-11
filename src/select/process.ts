import type { RequestHandler } from "express";

import { coursesStore } from "./store";
import type {
  SelectBaseFailedResponse,
  SelectBaseOptions,
  SelectBaseSuccessResponse,
} from "./typings";
import type { EmptyObject } from "../typings";

export interface ProcessOptions extends SelectBaseOptions {
  /** 课程号 */
  id: string;
  jx0502id: string;
  jx0502zbid: string;
}

export interface ProcessSuccessResponse extends SelectBaseSuccessResponse {
  msg: string;
}

export interface ProcessFailedResponse extends SelectBaseFailedResponse {
  type?: "conflict" | "relogin" | "forbid";
}

export type ProcessResponse = ProcessSuccessResponse | ProcessFailedResponse;

export const processHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  ProcessOptions
> = async (req, res) => {
  const { method } = req;

  try {
    const { cookies, server, id, jx0502id, jx0502zbid } = req.body;

    const url = `${server}xk/process${method === "DELETE" ? "Tx" : "Xk"}`;
    const params = new URLSearchParams({
      jx0502id,
      jx0502zbid,
      jx0404id: id,
    }).toString();

    console.log(`Getting ${url} with ${params}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies.join(", "),
      },
      body: params,
    });

    console.log("Response ends with", response.status);

    const rawData = await response.text();

    console.log("Raw data:", rawData);

    try {
      const { msgContent: msg } = <{ msgContent: string }>JSON.parse(rawData);

      if (msg === "系统更新了选课数据,请重新登录系统") {
        coursesStore.setState([]);

        return res.json(<ProcessFailedResponse>{
          success: false,
          status: "failed",
          msg,
          type: "relogin",
        });
      }

      if (msg === "您的账号在其它地方登录")
        return res.json(<ProcessFailedResponse>{
          success: false,
          status: "failed",
          msg,
          type: "relogin",
        });

      if (method === "DELETE") {
        if (msg.includes("退选成功"))
          return res.json(<ProcessSuccessResponse>{
            success: true,
            status: "success",
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
            status: "failed",
            msg,
            type: "forbid",
          });

        if (msg.endsWith("上课时间冲突"))
          return res.json({
            success: false,
            status: "failed",
            msg,
            type: "conflict",
          });

        if (msg === "选课成功")
          return res.json(<ProcessSuccessResponse>{
            status: "success",
            msg,
          });
      }

      return res.json(<ProcessFailedResponse>{
        success: false,
        status: "failed",
        msg,
      });
    } catch (err) {
      console.error(err);
      res.json(<ProcessFailedResponse>{
        success: false,
        status: "failed",
        msg: "参数有误",
      });
    }
  } catch (err) {
    console.error(err);
    res.json(<ProcessFailedResponse>{
      success: false,
      status: "failed",
      msg: (<Error>err).message,
    });
  }
};
