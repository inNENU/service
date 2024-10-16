import type { CommonSuccessResponse } from "../typings.js";
import { isInBlackList, request } from "../utils/index.js";

export interface BlacklistOptions {
  id: number;
  openid?: string | null;
}

export interface BlacklistQuery {
  id: string;
  openid?: string;
}

export type BlacklistResponse = CommonSuccessResponse<{
  inBlacklist: boolean;
}>;

export const mpBlacklistHandler = request<
  BlacklistResponse,
  BlacklistOptions,
  BlacklistQuery
>(async (req, res) => {
  const { id, openid = null } = req.method === "GET" ? req.query : req.body;

  console.info("Checking blacklist with", id, openid);

  return res.json({
    success: true,
    data: {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      inBlacklist: await isInBlackList(Number(id), openid || null),
    },
  });
});
