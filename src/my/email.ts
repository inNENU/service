import { request } from "@/utils/index.js";

import { unknownResponse } from "../config/index.js";

export const emailHandler = request((_req, res) =>
  res.json(unknownResponse("邮箱申请已移动至学校 OA 系统，正在适配中...")),
);
