import { RESET_PREFIX } from "../utils.js";

const RESET_PAGE_URL =
  "https://authserver.nenu.edu.cn/retrieve-password/retrievePassword/index.html";

/**
 * 初始化重置密码流程 - 访问页面并执行所有必需的预备API调用
 * 这个函数模拟浏览器访问重置密码页面时的完整API调用序列
 */
export const initializeResetPassword = async (
  cookieHeader: string,
): Promise<void> => {
  // 1. 首先访问重置密码页面以建立会话
  await fetch(RESET_PAGE_URL, {
    method: "GET",
    headers: {
      host: "authserver.nenu.edu.cn",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      "cache-control": "max-age=0",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      cookie: cookieHeader,
    },
  });

  // 2. getLanguageTypes
  await fetch(`${RESET_PREFIX}/language/getLanguageTypes`, {
    method: "POST",
    headers: {
      host: "authserver.nenu.edu.cn",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      accept: "application/json",
      "content-type": "application/json",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      referer: RESET_PAGE_URL,
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      cookie: cookieHeader,
    },
    body: "{}",
  });

  // 3. getStaticLanguageData
  await fetch(`${RESET_PREFIX}/language/getStaticLanguageData`, {
    method: "POST",
    headers: {
      host: "authserver.nenu.edu.cn",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      accept: "application/json",
      "content-type": "application/json",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      referer: RESET_PAGE_URL,
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      cookie: cookieHeader,
    },
    body: JSON.stringify({
      type: "CIAP_RETRIEVE",
      languageKey: "zh_CN",
    }),
  });

  // 4. getConsoleConfig - retrievePasswordPageStyle
  await fetch(`${RESET_PREFIX}/common/getConsoleConfig`, {
    method: "POST",
    headers: {
      host: "authserver.nenu.edu.cn",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      accept: "application/json",
      "content-type": "application/json",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      referer: RESET_PAGE_URL,
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      cookie: cookieHeader,
    },
    body: JSON.stringify({
      type: "retrievePasswordPageStyle",
    }),
  });

  // 5. getConsoleConfig - aliasBlackEnable,accountAppealEnable
  await fetch(`${RESET_PREFIX}/common/getConsoleConfig`, {
    method: "POST",
    headers: {
      host: "authserver.nenu.edu.cn",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      accept: "application/json",
      "content-type": "application/json",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      referer: RESET_PAGE_URL,
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      cookie: cookieHeader,
    },
    body: JSON.stringify({
      type: "aliasBlackEnable,accountAppealEnable",
    }),
  });

  // 6. tenant/info?type=1
  await fetch(`${RESET_PREFIX}/tenant/info?type=1`, {
    method: "GET",
    headers: {
      host: "authserver.nenu.edu.cn",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      accept: "application/json",
      "content-type": "application/json",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      referer: RESET_PAGE_URL,
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      cookie: cookieHeader,
    },
  });

  // 7. getRealPersonEnable?authScenes=1
  await fetch(
    `${RESET_PREFIX}/realPersonAuth/getRealPersonEnable?authScenes=1`,
    {
      method: "GET",
      headers: {
        host: "authserver.nenu.edu.cn",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
        accept: "application/json",
        "content-type": "application/json",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        referer: RESET_PAGE_URL,
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
        cookie: cookieHeader,
      },
    },
  );
};
