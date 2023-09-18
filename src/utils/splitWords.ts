import Client, { GetWeChGeneralRequest } from "@alicloud/alinlp20200629";
import { Config } from "@alicloud/openapi-client";
import "../config/loadEnv.js";

interface NLPWeChGeneralResponse {
  success: boolean;
  result: {
    word: string;
    id: string;
    tags: string[];
  }[];
}

// @ts-ignore
const client = new (Client as unknown as { default: typeof Client }).default(
  new Config({
    accessKeyId: process.env.NLP_ACCESS_KEY,
    accessKeySecret: process.env.NLP_ACCESS_SECRET,
    regionId: "cn-hangzhou",
  }),
);

export const splitWords = async (text: string): Promise<string[]> => {
  const response = await client.getWsChGeneral(
    new GetWeChGeneralRequest({
      serviceCode: "alinlp",
      text,
    }),
  );

  return (<NLPWeChGeneralResponse>JSON.parse(response.body.data!)).result.map(
    ({ word }) => word,
  );
};
