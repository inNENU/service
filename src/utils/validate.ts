import type { NextFunction, Request, Response } from "express-serve-static-core";
import type { ZodSchema } from "zod";

import { invalidArgResponse, missingArgResponse } from "../config/index.js";

interface ZodParseIssue {
  code: string;
  path: (string | number)[];
}

interface ZodParseError {
  issues: ZodParseIssue[];
}

/**
 * 创建请求体校验中间件
 *
 * @param schema Zod schema
 * @returns Express 中间件
 */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const error = result.error as unknown as ZodParseError;
      const [firstIssue] = error.issues;
      const field = firstIssue.path.join(".");

      if (firstIssue.code === "invalid_type") {
        res.json(missingArgResponse(field));

        return;
      }

      res.json(invalidArgResponse(field));

      return;
    }

    req.body = result.data;
    next();
  };
