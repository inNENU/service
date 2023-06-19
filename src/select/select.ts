import type { RequestHandler } from "express";
import type { SelectBaseOptions } from "./typings";

export interface SelectOptions extends SelectBaseOptions {
  /** 课程号 */
  id: string;
}
export const selectHandler: RequestHandler = async (req, res) => {
  try {
    const { cookies, server, id } = <SelectOptions>req.body;

    const url = `${server}xk/processXk`;
    const body = `jx0502id=59&jx0404id=${id}&jx0502zbid=148`;

    console.log(`Getting ${url} with ${body}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies.join("; "),
        DNT: "1",
        "X-Requested-With": "XMLHttpRequest",
        Host: new URL(server).host,
      },
      body,
    });

    console.log("Response ends with", response.status);
    // console.log(await response.text());
    const rawData = Buffer.from(await response.arrayBuffer()).toString();

    console.log("Raw data:", rawData);

    res.json({ status: "success" });
  } catch (err) {
    console.error(err);
    res.json({ status: "failed", err: (<Error>err).message });
  }
};
