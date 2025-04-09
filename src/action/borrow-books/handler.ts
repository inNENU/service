import { request } from "@/utils/index.js";

import type { BorrowBooksResponse } from "./provider.js";
import { getBorrowBooks } from "./provider.js";
import { BORROW_BOOKS_TEST_RESPONSE } from "./test-data.js";

export const borrowBooksHandler = request<BorrowBooksResponse>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST"))
      return res.json(BORROW_BOOKS_TEST_RESPONSE);

    return res.json(await getBorrowBooks(cookieHeader));
  },
);
