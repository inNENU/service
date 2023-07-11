import type { RequestHandler } from "express";

import type {
  SelectBaseFailedResponse,
  SelectBaseOptions,
  SelectBaseSuccessResponse,
} from "./typings";
import type { EmptyObject } from "../typings";

export interface StudentAmountOptions extends SelectBaseOptions {
  /** 课程号 */
  id: string;
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

export interface StudentAmountSuccessResponse
  extends SelectBaseSuccessResponse {
  data: StudentAmountData[];
}

export interface StudentAmountFailedResponse extends SelectBaseFailedResponse {
  type?: "relogin";
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
    const { cookies, server, id, jx0502id } = req.body;
    const url = `${server}xk/GetXkRs`;
    const params = new URLSearchParams({
      jx0502id,
      kch: id,
    }).toString();

    console.log(`Getting ${url} with ${params}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies.join(", "),
      },
      body: params,
    });

    console.log("Response ends with", response.status);

    const rawData = await response.text();

    console.log("Raw data:", rawData);

    if (rawData.match(/\s+<!DOCTYPE html/))
      return res.json(<StudentAmountFailedResponse>{
        success: false,
        status: "failed",
        msg: "请重新登录",
        type: "relogin",
      });

    try {
      const data: StudentAmountData[] = (<StudentAmountRaw[]>(
        JSON.parse(rawData)
      )).map(({ jx0404id, rs }) => ({
        cid: jx0404id,
        amount: rs,
      }));

      res.json(<StudentAmountSuccessResponse>{
        success: true,
        status: "success",
        data,
      });
    } catch (err) {
      console.error(err);
      res.json(<StudentAmountFailedResponse>{
        success: false,
        status: "failed",
        msg: (<Error>err).message,
      });
    }
  } catch (err) {
    console.error(err);
    res.json(<StudentAmountFailedResponse>{
      success: false,
      status: "failed",
      msg: (<Error>err).message,
    });
  }
};
