import type { RequestHandler } from "express";
import type { SelectBaseOptions } from "./typings.js";
import { COURSE_TYPE } from "./utils.js";

export const selectInfoHandler: RequestHandler = async (req, res) => {
  const { cookies, server } = <SelectBaseOptions>req.body;

  const response = await fetch(
    `${server}qzxk/xk/getXkInfo?jx0502zbid=148&jx0502id=59&sfktx=1&sfkxk=1`,
    {
      headers: new Headers({
        Cookie: cookies.join(", "),
      }),
    }
  );

  const document = new DOMParser().parseFromString(
    await response.text(),
    "text/html"
  );

  const major = document.querySelector("#id")!.textContent!;
  const grade = document.querySelector("#id")!.textContent!;
  const courseOffices = Array.from(
    document.querySelectorAll("#xkxx > div > table > tbody > tr")
  ).map((item) => /value=".*?"/.exec(item.textContent!));

  res.json({
    status: "success",
    courseType: COURSE_TYPE,
    courseOffices,
    major,
    grade,
  });
};
