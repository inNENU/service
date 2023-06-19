import type { RequestHandler } from "express";
import type { SelectBaseOptions } from "./typings";

export interface StudentAmountOptions extends SelectBaseOptions {
  /** 课程号 */
  id: string;
}

export interface StudentAmountRaw {
  jx0404id: string;
  rs: number;
}

export interface StudentAmountData {
  /** 课程号 */
  id: string;
  /** 选课人数 */
  amount: number;
}

export interface StudentAmountSuccessResponse {
  status: "success";
  data: StudentAmountData[];
}

export const studentAmountHandler: RequestHandler = async (req, res) => {
  try {
    const { cookies, server, id } = <StudentAmountOptions>req.body;
    const url = `${server}xk/GetXkRs`;
    const body = `jx0502id=59&kch=${id}`;

    console.log(`Getting ${url} with ${body}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies.join("; "),
      },
      body,
    });

    console.log("Response ends with", response.status);

    const rawData = await response.text();

    console.log("Raw data:", rawData);

    if (rawData.match(/\s+<!DOCTYPE html/))
      return res.json({ status: "failed", err: "请重新登录" });

    try {
      const rawData = await response.json();

      const data = (<StudentAmountRaw[]>JSON.parse(rawData)).map(
        ({ jx0404id, rs }) => ({
          id: jx0404id,
          amount: rs,
        })
      );

      res.json({ status: "success", data });
    } catch (err) {
      console.error(err);
      res.json({ status: "failed", err: (<Error>err).message });
    }
  } catch (err) {
    console.error(err);
    res.json({ status: "failed", err: (<Error>err).message });
  }
};
