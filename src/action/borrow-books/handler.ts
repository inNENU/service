import type { RequestHandler } from "express";

import { getBorrowBooks } from "./provider.js";
import { BORROW_BOOKS_TEST_RESPONSE } from "./test-data.js";
import {
  MissingCredentialResponse,
  UnknownResponse,
} from "../../config/index.js";
import type { EmptyObject, LoginOptions } from "../../typings.js";
import { actionLogin } from "../login.js";
import { ACTION_SERVER } from "../utils.js";

export const borrowBooksHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password, authToken } = req.body;

    if (id && password && authToken) {
      const result = await actionLogin({ id, password, authToken });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(ACTION_SERVER);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    const cookieHeader = req.headers.cookie;

    if (cookieHeader?.includes("TEST"))
      return res.json(BORROW_BOOKS_TEST_RESPONSE);

    return res.json(getBorrowBooks(cookieHeader));
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
