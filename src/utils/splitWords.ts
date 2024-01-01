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

const config = new Config({
  accessKeyId: process.env.NLP_ACCESS_KEY,
  accessKeySecret: process.env.NLP_ACCESS_SECRET,
  regionId: "cn-hangzhou",
});

// @ts-ignore
// eslint-disable-next-line
const client: Client = Client.default
  ? // eslint-disable-next-line
    // @ts-ignore
    // eslint-disable-next-line
    new Client.default(config)
  : new Client(config);

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
