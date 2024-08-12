import type { BorrowBooksSuccessResponse } from "./provider.js";

export const BORROW_BOOKS_TEST_RESPONSE: BorrowBooksSuccessResponse = {
  success: true,
  data: Array(4)
    .fill(null)
    .map((_, i) => ({
      name: `测试书籍${i + 1}`,
      author: `书籍作者${i + 1}`,
      year: new Date().getFullYear(),
      status: "借出",
      barcode: Date.now().toString(),
      loanDate: `${new Date().getFullYear()}-01-01`,
      dueDate: `${new Date().getFullYear()}-01-31`,
      location: `位置${i + 1}`,
      shelfNumber: `A${i}`,
      renew: true,
      renewTime: `${new Date().getFullYear()}-01-15`,
    })),
};
