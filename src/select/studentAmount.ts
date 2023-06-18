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
  const { cookies, server, id } = <StudentAmountOptions>req.body;

  const response = await fetch(`${server}xk/GetXkRs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.join("; "),
    },
    body: `jx0502id=49&kch=${id}`,
  });

  const data = (<StudentAmountRaw[]>await response.json()).map(
    ({ jx0404id, rs }) => ({
      id: jx0404id,
      amount: rs,
    })
  );

  res.json({ status: "success", data });
};
