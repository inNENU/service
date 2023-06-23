export const parseCookieValue = (cookieHeader: string): string =>
  cookieHeader.split(";")[0].trim();

export const getCookies = (res: Response): string[] => {
  const cookieHeaders: string[] = [];

  res.headers.forEach((value, key) => {
    if (key === "set-cookie") cookieHeaders.push(value);
  });

  return cookieHeaders.map((item) => parseCookieValue(item));
};
