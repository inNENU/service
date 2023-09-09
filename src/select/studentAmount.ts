import type { RequestHandler } from "express";

import { selectLogin } from "./login.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";

export interface StudentAmountOptions extends Partial<LoginOptions> {
  server: string;
  /** 课程号 */
  courseId: string;
  jx0502id: string;
}

export interface StudentAmountRaw {
  jx0404id: string;
  rs: number;
}

export interface StudentAmountData {
  /** 课程号 */
  cid: string;
  /** 选课人数 */
  amount: number;
}

export interface StudentAmountSuccessResponse {
  success: true;
  data: StudentAmountData[];
}

export interface StudentAmountFailedResponse extends CommonFailedResponse {
  type?: LoginFailType.Expired;
}

export type StudentAmountResponse =
  | StudentAmountSuccessResponse
  | StudentAmountFailedResponse;

export const studentAmountHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  StudentAmountOptions
> = async (req, res) => {
  try {
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

    const { server, courseId, jx0502id } = req.body;
    const url = `${server}xk/GetXkRs`;
    const params = new URLSearchParams({
      jx0502id,
      kch: courseId,
    }).toString();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: req.headers.cookie,
      },
      body: params,
    });

    const rawData = await response.text();

    if (rawData.match(/\s+<!DOCTYPE html/))
      return res.json(<StudentAmountFailedResponse>{
        success: false,
        msg: "请重新登录",
        type: LoginFailType.Expired,
      });

    const data: StudentAmountData[] = (<StudentAmountRaw[]>(
      JSON.parse(rawData)
    )).map(({ jx0404id, rs }) => ({
      cid: jx0404id,
      amount: rs,
    }));

    res.json(<StudentAmountSuccessResponse>{
      success: true,

      data,
    });
  } catch (err) {
    console.error(err);
    res.json(<StudentAmountFailedResponse>{
      success: false,
      msg: (<Error>err).message,
    });
  }
};
