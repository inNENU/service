import { request } from "@/utils/index.js";

import { UnknownResponse } from "../config/index.js";

export const emailHandler = request((_req, res) => {
  return res.json(
    UnknownResponse("邮箱申请已移动至学校 OA 系统，正在适配中..."),
  );
});
