import { UnknownResponse } from "../config/index.js";
import { middleware } from "../utils/index.js";

export const emailHandler = middleware((_req, res) => {
  return res.json(
    UnknownResponse("邮箱申请已移动至学校 OA 系统，正在适配中..."),
  );
});
