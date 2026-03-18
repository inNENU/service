import { CookieStore } from "@mptool/net";

const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

export const TEST_GRADE = currentMonth >= 9 ? currentYear : currentYear - 1;
export const TEST_ID = `${TEST_GRADE}000001`;
export const TEST_ID_NUMBER = Number(TEST_ID);

export const TEST_COOKIE_STORE = new CookieStore();

TEST_COOKIE_STORE.set({
  domain: ".nenu.edu.cn",
  name: "TEST",
  value: "0",
});

export const TEST_INFO = {
  avatar: "",
  id: TEST_ID_NUMBER,
  name: "测试用户",
  idCard: "123456789012345678",
  org: "测试学院",
  orgId: 1,
  major: "测试专业",
  majorId: "1",
  inYear: TEST_GRADE,
  grade: TEST_GRADE,
  type: "本科",
  typeId: "bks",
  code: "1",
  politicalStatus: "群众",
  people: "汉族",
  peopleId: 1,
  gender: "男",
  genderId: 1,
  birth: "2000-01-01",
  location: "benbu",
} as const;

export const TEST_LOGIN_RESULT = {
  success: true,
  cookieStore: TEST_COOKIE_STORE,
} as const;
