export const isValidPathname = (pathname: string): boolean => {
  if (
    !pathname ||
    pathname.startsWith("/") ||
    pathname.startsWith("http:") ||
    pathname.startsWith("https:") ||
    pathname.includes("..") ||
    !/^[a-zA-Z0-9\-_./]+$/.test(pathname)
  ) {
    return false;
  }

  return true;
};
