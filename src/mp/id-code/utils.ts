export interface InfoData {
  uuid: string;
  openid?: string;
  type: "account" | "admission";
  id?: number;
  name: string;
  gender: string;
  school: string;
  major: string;
  grade: number;
  createTime: number;
  remark: string;
  verifyId?: number;
  verifyRemark?: string;
}
