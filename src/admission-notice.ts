import type { RequestHandler } from "express";

interface AdmissionRequestOptions {
  type: "fetch";
  level: "本科生" | "研究生";
}

interface AdmissionResponseOptions {
  cookies: string;
  info: string[];
  verifyCode: string;
  notice: string;
  detail: { title: string; content: string };
}

const getAdmission = async ({
  level,
}: AdmissionRequestOptions): Promise<AdmissionResponseOptions | null> => {
  if (level === "本科生") {
    const imageResponse = await fetch(
      "http://bkzsw.nenu.edu.cn/include/webgetcode.php?width=85&height=28&sitex=15&sitey=6"
    );

    const cookies = imageResponse.headers.get("Set-Cookie")!;

    const base64Image = `data:image/png;base64,${Buffer.from(
      await imageResponse.arrayBuffer()
    ).toString("base64")}`;

    const infoResponse = await fetch(
      "http://bkzsw.nenu.edu.cn/col_000018_000169.html",
      {
        headers: {
          Cookie: cookies,
        },
      }
    );

    const infoBody = await infoResponse.text();

    const [, notice] = /<td colspan="2" align="left">截止 (.*?)<\/td>/.exec(
      infoBody
    )!;

    return {
      cookies,
      info: ["name", "id", "testId"],
      verifyCode: base64Image,
      notice: "部分省份信息正在录入中，点击查看详情",
      detail: {
        title: "录取信息",
        content: notice.replace(/<br>/g, "\n"),
      },
    };
  }

  return null;
};

export const admissionNoticeHandler: RequestHandler = (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  console.log(body);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (body.type === "fetch")
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    void getAdmission(body).then((data) => res.send(data));
};
