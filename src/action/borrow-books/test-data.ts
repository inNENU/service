import type { BorrowBookData } from "./converter.js";
import type { BorrowBooksSuccessResponse } from "./provider.js";

export const BORROW_BOOKS_TEST_RESPONSE: BorrowBooksSuccessResponse = {
  success: true,
  data: Array<BorrowBookData>(4).fill({
    name: "测试书籍",
    author: "测试作者",
    year: 2021,
    status: "借出",
    barcode: "000000000000",
    loanDate: "2021-09-01",
    dueDate: "2021-09-30",
    location: "测试位置",
    shelfNumber: "A1",
    renew: true,
    renewTime: "2021-09-15",
  }),
};
