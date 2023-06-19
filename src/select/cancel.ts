import type { RequestHandler } from "express";
import type { SelectBaseOptions } from "./typings";

export interface CancelSelectOptions extends SelectBaseOptions {
  /** 课程号 */
  id: string;
}
export const cancelSelectHandler: RequestHandler = async (req, res) => {
  try {
    const { cookies, server, id } = <CancelSelectOptions>req.body;

    const url = `${server}xk/processTx`;
    const body = `jx0502id=59&jx0404id=${id}&jx0502zbid=148`;

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

    res.json({ status: "success" });
  } catch (err) {
    console.error(err);
    res.json({ status: "failed", err: (<Error>err).message });
  }
};
