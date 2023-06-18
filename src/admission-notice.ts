import type { RequestHandler } from "express";

interface AdmissionRequestOptions {
  type: "fetch";
  level: "本科生" | "研究生";
}

const getAdmission = async ({ level }: AdmissionRequestOptions) => {
  if (level === "本科生") {
    const imageResponse = await fetch(
      "http://bkzsw.nenu.edu.cn/include/webgetcode.php?width=85&height=28&sitex=15&sitey=6"
    );

    const cookies = imageResponse.headers.get("Set-Cookie")!;

    const base64Image = `data:image/png;base64,${Buffer.from(
      await imageResponse.arrayBuffer()
    ).toString("base64")}`;

    const headers = new Headers();

    headers.append("Cookie", cookies);

    const infoResponse = await fetch(
      "http://bkzsw.nenu.edu.cn/col_000018_000169.html",
      { headers }
    );

    const infoBody = await infoResponse.text();

    const [, notice] = /<td colspan="2" align="left">截止 (.*?)<\/td>/.exec(
      infoBody
    )!;

    return {
      cookies: cookies,
      info: ["name", "id", "testId"],
      verifyCode: base64Image,
      notice: "部分省份信息正在录入中，点击查看详情",
      detail: {
        title: "录取信息",
        content: notice.replace(/<br>/g, "\n"),
      },
    };
  }
};

export const admissionNoticeHandler: RequestHandler = (req, res) => {
  const { body } = req;

  console.log(body);

  if (body.type === "fetch") {
    getAdmission(body).then((data) => res.send(data));
  }
};
