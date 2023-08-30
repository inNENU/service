import iconv from "iconv-lite";

export const readResponseContent = async (
  response: Response,
  encoding = "gbk",
): Promise<string> =>
  iconv.decode(Buffer.from(await response.arrayBuffer()), encoding);

export const getResponseContent = async (
  response: Response,
): Promise<string> => {
  const contentTypeHeader = response.headers.get("Content-Type");

  if (contentTypeHeader)
    if (/charset=gbk/i.test(contentTypeHeader))
      return iconv.decode(Buffer.from(await response.arrayBuffer()), "gbk");

  return await response.text();
};
