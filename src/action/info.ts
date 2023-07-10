import type { RequestHandler } from "express";

// import { JSEncrypt } from "nodejs-jsencrypt";
import type { Cookie } from "set-cookie-parser";

import JSEncrypt from "./jsencrypt.js";
import { actionLogin } from "./login.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import type {
  CommonFailedResponse,
  CookieOptions,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { getCookieHeader } from "../utils/index.js";

type RawInfoData =
  | {
      success: true;
      demo: {
        items: {
          item: [{ kye: string }];
        };
      };
    }
  | {
      success: false;
    };

export type InfoOptions = LoginOptions | (CookieOptions & { id: number });

export interface InfoSuccessResponse {
  status: "success";
  data: number;
}

export type InfoResponse = InfoSuccessResponse | CommonFailedResponse;

const OPENSSL_PRIVATE_KEY =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC89hvzkO2bUJ/QBdwjw+1YEcRRVdGL/3FvDxZ6OYZyMmFJFJRmhMukLA7KSHMqtnn6PY/1qcG/yjk48K4EHa5UjkXfMiszOdM3UBnEXv3+iOKrm7lWibrY+XuLalvOID3LbZ4fVeSlLRphRc3s3r77v4hP0otnpOE8AbNlxUyr1QIDAQAB";

const crypt = new JSEncrypt();

crypt.setPrivateKey(OPENSSL_PRIVATE_KEY);

'dn9t02Cx9HW2h8OtiZRCqv7LEfn2RFBNJkqL2pSST3VQg4UR2/9Z16EP7Aq+7VxVAF65Ed+7xrwqD4yhJGxAs/IiB/N2M7OqbioskLVG93DCnmzif8vkaJ+ILILL7ZjSYo7RjOrAh747zcoLmZsZuXwk6Zrm6yA/6oahfE1pdVE=,KV03pyx2tCo5rqBqfN4BZqvIJ0rdqAygi/q0MSm9lQjO7/3N0FROUna/tuM2dvHeQRnFPT4sxGYYoP2oNkE1u3v9OHFsgxgEodu2a3l9H0I02HFTYQrX9tswc60axJmb6rEqfPQ+/YCAeqo69N5saB2njJtnxMhSSO3JVeehyxU=,R4eZsNVs23n090D/SjubzmknDdNXBWSKEU2WRi6jZQ/7DiFvMcdSy3xJ82ewJUs6xN3fvFA3G45CtF9y2pkbF002hZI74tN2x0A9oi2WPA++2hvIm490oS5yHVpJI0mp61ZGKtvP2ewYNyCgWb9q6BXcljsPthA6183X/VZ82L8=,eRnT6lHcLW2k5pqzecYOdO7Iy+HLlvboKXCuj9yO+LSfi2eyt7w8glwUQA8wmfsNPyflw0USRLIe//vdHZmI32e04tG5Iyr9hHdkA0qZDq8yGRJvXSbY9T6G4vzcwLEUiIcn9nPxUmSq0OvZiTy3L9Kdu1KMxfMfgEzYzrIxUEY='.split(',').forEach((item)=>{

  console.log(crypt.decrypt(item))
})
  
  export const personInfoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  InfoOptions
> = async (req, res) => {
  try {
    let cookies: Cookie[] = [];
    const { id } = req.body;

    if ("cookies" in req.body) {
      ({ cookies } = req.body);
    } else {
      const result = await actionLogin(req.body);

      if (result.status === "failed") return res.json(result);

      ({ cookies } = result);
    }

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: getCookieHeader(cookies),
      Referer:
        "https://m-443.webvpn.nenu.edu.cn//basicInfo/studentPageTurn?type=xsjbxx",
    };

    console.log("Using headers", headers);

    const serviceInfo = JSON.stringify({
      serviceAddress: "wis-apis/soap/00001_00057_01_02_20181115164625",
      serviceType: "soap",
      serviceSource: "ds2",
      paramDataFormat: "xml",
      httpMethod: "POST",
      soapInterface: "exec",
      params: { arg0: { Body: { condition: { xh: id.toString() } } } },
      cDataPath: ["arg0"],
      namespace: "",
      xml_json: "",
      businessServiceName: "",
    });

    const sliceNumber = Math.ceil(serviceInfo.length / 100);
    const params = [];

    for (let i = 0; i < sliceNumber; i++) {
      console.log("Slice", serviceInfo.substring(i * 100, (i + 1) * 100));

      params.push(crypt.encrypt(serviceInfo.substring(i * 100, (i + 1) * 100)));
    }

    console.log(
      new URLSearchParams({
        serviceInfo: params.toString(),
      }).toString(),
    );

    const response = await fetch(
      "https://m-443.webvpn.nenu.edu.cn/remote/service/process",
      {
        method: "POST",
        headers,
        body: new URLSearchParams({
          serviceInfo: params.toString(),
        }).toString(),
      },
    );

    console.log(response.status);

    const data = <RawInfoData>await response.json();

    if (data.success)
      return res.json(<InfoSuccessResponse>{
        status: "success",
        data: Number(data.demo.items.item[0].kye) / 100,
      });

    return res.json(<AuthLoginFailedResponse>{
      status: "failed",
      msg: JSON.stringify(data),
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResponse>{
      status: "failed",
      msg: message,
    });
  }
};
