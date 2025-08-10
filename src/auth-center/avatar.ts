import { request } from "@/utils/index.js";

import { authCenterLogin } from "./login.js";
import { AUTH_INFO_PREFIX } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { ExpiredResponse, MissingCredentialResponse } from "../config/index.js";
import type { AccountInfo, CommonSuccessResponse } from "../typings.js";

const USER_CONF_URL = `${AUTH_INFO_PREFIX}/common/getUserConf`;

interface RawUserConfData {
  code: "0";
  message: "SUCCESS";
  datas: {
    uid: string;
    nickName: string;
    cn: string;
    headImageIcon: string;
    logoutUrl: string;
    theme: string;
    languageEnabled: boolean;
    personalDisplay: boolean;
    schoolLogEnabled: boolean;
  };
}

export type AvatarSuccessResponse = CommonSuccessResponse<{ avatar: string }>;

export type AvatarResponse = AvatarSuccessResponse | AuthLoginFailedResponse;

const TEST_AVATAR_RESPONSE: AvatarSuccessResponse = {
  success: true,
  data: {
    avatar:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1920'%3E%3Cdefs%3E%3CclipPath id='a'%3E%3Ccircle cx='957.5' cy='94.862' r='960' fill='%23d7e3f4' stroke-width='0' color='%23000' style='isolation:auto;mix-blend-mode:normal'/%3E%3C/clipPath%3E%3C/defs%3E%3Cg clip-path='url(%23a)' transform='translate(0 867.64)'%3E%3Ccircle cx='957.5' cy='94.862' r='957.51' fill='%23d7e3f4' color='%23000' style='isolation:auto;mix-blend-mode:normal'/%3E%3Cpath fill='%23fff' d='M349.22 761.608c28.477-83.87 70.48-170.874 127.863-264.852 33.995-55.67 44.615-76.423 54.593-106.686 10.589-32.108 26.443-60.162 38.786-68.633 6.824-4.684 14.83-6.295 38.442-7.74 17.631-1.079 32.831-.68 37.183.973 4.048 1.54 10.77 1.972 14.936.961 17.461-4.233 57.33-22.092 81.445-36.483 14.228-8.49 32.772-18.49 41.208-22.22 14.896-6.588 15.44-7.23 18.794-22.217l3.454-15.434-15.602-15.979c-36.965-37.861-57.751-82.956-65.29-141.642-1.076-8.382-4.648-17.871-8.776-23.32-3.83-5.053-8.88-13.776-11.223-19.386-5.566-13.32-15.138-51.44-15.184-60.462-.021-3.886-2.857-12.392-6.305-18.902-5.054-9.542-5.724-13.376-3.458-19.785 2.33-6.59 4.489-7.98 12.62-8.126 9.446-.17 9.776-.537 8.884-9.893-.51-5.344-1.048-29.432-1.196-53.528-.226-36.825.971-50.29 7.506-84.435 4.277-22.342 6.7-41.7 5.385-43.014-4.315-4.315-134.307-42.143-144.82-42.143-3.904 0-5.86 1.82-5.86 5.451 1.37 7.097 4.196 22.647 8.341 44.013l4.2 40.984c2.31 22.542 7.347 55.119 11.194 72.394 9.784 43.937 18.704 92.07 18.573 100.215-.06 3.78 2.3 18.319 5.248 32.31s8.094 40.702 11.436 59.357c16.629 92.8 16.116 89.035 12.123 89.035-2.507 0-6.485-16.694-11.776-49.414-3.746-23.168-8.96-41.034-11.976-41.034-1.176 0-2.113 2.862-2.081 6.36.113 12.461 11.2 88.62 15.327 105.29 4.444 17.949 5.44 35.407 2.62 45.932-2.337 8.717-4.768 7.983-9.369-2.827l-3.909-9.186-1.657 11.305c-1.37 9.355-2.85 11.44-8.573 12.078-3.803.425-8.991 2.65-11.529 4.947-7.552 6.835-33.456 5.526-41.574-2.1-3.674-3.452-9.48-6.314-12.902-6.36-5.886-.08-6.18-1.151-5.44-19.87.43-10.883 2.006-28.69 3.502-39.572 3.14-22.827 1.556-135.153-2.81-199.269-1.641-24.096-3.76-94.986-4.709-157.527-1.195-78.804-2.698-114.498-4.897-116.253-5.56-4.438-33.57-11.06-55.116-13.028-25.087-2.293-34.266-5.43-34.266-11.71 0-8.861 31.612-40.708 66.316-66.807 19.09-14.357 36.716-29.6 39.168-33.873 2.453-4.273 9.295-9.97 15.204-12.659s28.552-19.693 50.316-37.787 50.382-40.648 63.596-50.121 41.492-29.803 62.84-45.177 49.332-34.59 62.185-42.702 26.834-17.44 31.071-20.729l7.703-5.978 38.935 12.156c167.742 52.371 287.19 91.278 385.182 125.478 102.5 35.766 134.388 47.86 172.233 65.32 21.09 9.73 44.999 19.879 53.13 22.552s17.629 7.164 21.107 9.98c5.554 4.497 5.838 5.705 2.338 9.923-6.775 8.164-43.1 24.979-58.721 27.182-17.043 2.404-50.559 21.93-178.425 103.941l-77.373 49.629 1.762 18.963c.97 10.43 4.398 30.06 7.62 43.625 5.882 24.766 6.36 56.244 1.151 75.87-2.046 7.71-1.765 8.08 4.594 6.066 17.248-5.465 23.6-4.98 30.46 2.323 9.047 9.63 11.694 40.296 4.886 56.59-2.525 6.044-5.345 18.124-6.266 26.843-3.83 36.248-37.551 84.966-61.983 89.55-5.273.99-10.697 3.255-12.054 5.036s-6.552 16.323-11.544 32.317l-9.075 29.08 15.453 31.69c8.5 17.43 17.634 39.645 20.298 49.367 5.355 19.534 4.89 19.04 53.558 56.939 28.438 22.145 36.225 29.965 62.182 62.447 7.773 9.727 22.4 24.398 32.506 32.603 10.105 8.205 29.183 24.653 42.398 36.55 20.274 18.255 25.129 21.351 31.091 19.834 25.989-6.613 27.29-6.218 47.961 14.593 10.598 10.667 26.408 25.563 35.135 33.1 30.824 26.623 52.297 76.118 105.76 243.766 12.437 39.006 24.034 80.344 25.769 91.863 13.211 78.34 13.19 156.42 13.19 236.466l1.796 6.36H305.378c0-123.175 19.654-219.78 43.824-290.755zm261.9-610.191c-1.162-19.77-6.128-27.17-6.072-9.049.042 13.764 2.429 25.296 5.237 25.301.985.002 1.36-7.311.835-16.252m29.453 35.8c-3.988-11.7-9.183-49.871-7.432-54.605 2.815-7.61 4.192-4.098 10.153 25.889 3.944 19.846 4.409 26.959 1.923 29.444-2.486 2.486-3.608 2.31-4.643-.728z'/%3E%3Ccircle cx='957.5' cy='94.862' r='957.51' fill='none' stroke='%23a8c0e6' stroke-width='4.987' color='%23000' style='isolation:auto;mix-blend-mode:normal'/%3E%3C/g%3E%3C/svg%3E",
  },
};

export const getAvatar = async (
  cookieHeader: string,
): Promise<AvatarResponse> => {
  const response = await fetch(USER_CONF_URL, {
    method: "POST",
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
    },
    body: "{}",
    redirect: "manual",
  });

  if (response.status !== 200) return ExpiredResponse;

  const data = (await response.json()) as RawUserConfData;

  return {
    success: true,
    data: {
      avatar: `data:image/png;base64,${data.datas.headImageIcon}`,
    },
  };
};

export const avatarHandler = request<AvatarResponse, AccountInfo>(
  async (req, res) => {
    const { id, password, authToken } = req.body;

    if (id && password && authToken) {
      const result = await authCenterLogin({
        id,
        password,
        authToken,
      });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(AUTH_INFO_PREFIX);
    } else if (!req.headers.cookie) {
      return MissingCredentialResponse;
    }

    const cookieHeader = req.headers.cookie;

    if (cookieHeader.includes("TEST")) {
      return res.json(TEST_AVATAR_RESPONSE);
    }

    return res.json(await getAvatar(cookieHeader));
  },
);
