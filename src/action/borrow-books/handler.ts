import type { BorrowBooksResponse } from "./provider.js";
import { getBorrowBooks } from "./provider.js";
import { BORROW_BOOKS_TEST_RESPONSE } from "./test-data.js";
import { middleware } from "../../utils/handler.js";

export const borrowBooksHandler = middleware<BorrowBooksResponse>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader?.includes("TEST"))
      return res.json(BORROW_BOOKS_TEST_RESPONSE);

    return res.json(await getBorrowBooks(cookieHeader));
  },
);
