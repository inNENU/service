import Client, { GetWeChGeneralRequest } from "@alicloud/alinlp20200629";
import { Config } from "@alicloud/openapi-client";
// oxlint-disable-next-line import/no-unassigned-import
import "../config/loadEnv.js";

interface NLPWeChGeneralResponse {
  success: boolean;
  result: {
    word: string;
    id: string;
    tags: string[];
  }[];
}

const config = new Config({
  accessKeyId: process.env.NLP_ACCESS_KEY,
  accessKeySecret: process.env.NLP_ACCESS_SECRET,
  regionId: "cn-hangzhou",
});

// @ts-expect-error: Type Error
// oxlint-disable-next-line typescript/no-unsafe-assignment
const client: Client = Client.default
  ? // @ts-expect-error: Type Error
    // oxlint-disable-next-line new-cap, typescript/no-unsafe-call
    new Client.default(config)
  : new Client(config);

export const splitWords = async (text: string): Promise<string[]> => {
  const response = await client.getWsChGeneral(
    new GetWeChGeneralRequest({
      serviceCode: "alinlp",
      text,
    }),
  );

  const data = JSON.parse(response.body!.data!) as NLPWeChGeneralResponse;

  return data.success ? data.result.map(({ word }) => word) : [text];
};
