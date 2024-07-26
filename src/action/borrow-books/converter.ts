interface RawBorrowBookData extends Record<string, unknown> {
  due_date: string;
  loan_date: string;
  title: string;
  author: string;
  publication_year: string;
  item_barcode: string;
  process_status: "NORMAL" | "RENEW";
  location_code: {
    value: string;
    name: string;
  };
  item_policy: {
    value: string;
    description: string;
  };
  call_number: string;
  last_renew_date: string;
  last_renew_status: {
    value: string;
    desc: string;
  };
  loan_status: "ACTIVE";
}

export type RawBorrowBooksData =
  | {
      success: true;
      data: RawBorrowBookData[];
    }
  | {
      success: false;
      data: "";
    };

export interface BorrowBookData {
  /** 书名 */
  name: string;
  /** 作者 */
  author: string;
  /** 出版年份 */
  year: number;
  /** 借阅状态 */
  status: string;
  /** 条形码 */
  barcode: string;
  /** 借出时间 */
  loanDate: string;
  /** 到期时间 */
  dueDate: string;
  /** 位置 */
  location: string;
  /** 书架号 */
  shelfNumber: string;
  /** 是否续借 */
  renew: boolean;
  /** 续借时间 */
  renewTime?: string;
}

export const getBorrowBookData = ({
  title,
  author,
  loan_date: loanDate,
  due_date: dueDate,
  item_barcode: barcode,
  location_code: locationCode,
  call_number: shelfNumber,
  process_status: status,
  last_renew_date: renewTime,
  item_policy: policy,
  publication_year: year,
}: RawBorrowBookData): BorrowBookData => ({
  name: title,
  author,
  loanDate,
  dueDate,
  year: Number(year),
  barcode,
  location: locationCode.name,
  shelfNumber,
  renew: status === "RENEW",
  renewTime,
  status: policy.description,
});
