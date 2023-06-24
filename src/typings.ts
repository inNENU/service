export type EmptyObject = Record<never, never>;

export interface CommonFailedResponse {
  status: "failed";
  msg: string;
}
