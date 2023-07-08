import iconv from "iconv-lite";

export const readResponseContent = async (
  response: Response,
  encoding = "gbk",
): Promise<string> =>
  iconv.decode(Buffer.from(await response.arrayBuffer()), encoding);
