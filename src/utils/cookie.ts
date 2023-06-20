export const parseCookieValues = (cookieHeader: string): string[] =>
  cookieHeader.split(",").map((item) => item.split(";")[0].trim());

export const getCookie = (res: Response): string[] => {
  const cookieHeader = res.headers.get("Set-Cookie") || "";

  return parseCookieValues(cookieHeader);
};
