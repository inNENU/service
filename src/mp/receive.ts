import type { RequestHandler } from "express";
import { sha1 } from "js-sha1";

import { DatabaseError, rawID2appID } from "../config/index.js";
import type { EmptyObject } from "../typings.js";
import { connect, getShortUUID, getWechatAccessToken } from "../utils/index.js";
import "../config/loadEnv.js";

interface BaseMessage {
  ToUserName: string;
  FromUserName: string;
  CreateTime: string;
  MsgId: string;
}

interface TextMessage extends BaseMessage {
  MsgType: "text";
  Content: string;
}

interface ImageMessage extends BaseMessage {
  MsgType: "image";
  Content: string;
  PicUrl: string;
  MediaId: string;
}

interface CardMessage extends BaseMessage {
  MsgType: "miniprogrampage";
  Title: string;
  AppId: string;
  PagePath: string;
  ThumbUrl: string;
  ThumbMediaId: string;
}

type ContactMessage = TextMessage | ImageMessage | CardMessage;

interface EnterEvent {
  ToUserName: string;
  FromUserName: string;
  CreateTime: string;
  MsgType: "event";
  Event: "user_enter_tempsession";
  SessionFrom: string;
}

export const mpReceiveHandler: RequestHandler<
  { signature: string; timestamp: string; nonce: string; echostr: string },
  EmptyObject,
  ContactMessage | EnterEvent
> = async (req, res) => {
  const { signature, timestamp, nonce } = req.query;

  if (
    sha1([process.env.TOKEN, timestamp, nonce].sort().join("")) !== signature
  ) {
    return res.status(403).end("Invalid signature");
  }

  if (req.method === "GET") {
    return res.end(req.query.echostr);
  }

  const { ToUserName, FromUserName, CreateTime, MsgType } = req.body;

  try {
    const { connection, release } = await connect();

    await connection.execute(
      `INSERT INTO contact (uuid, appId, openid, createTime, type, content) VALUES (?, ?, ?, FROM_UNIXTIME(?), ?, ?)`,
      [
        getShortUUID(),
        ToUserName,
        FromUserName,
        CreateTime,
        MsgType ?? "Unknown",
        MsgType === "text" ? req.body.Content : null,
      ],
    );

    release();

    if (
      MsgType === "text" ||
      MsgType === "image" ||
      MsgType === "miniprogrampage"
    ) {
      const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${await getWechatAccessToken(rawID2appID[ToUserName])}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            touser: FromUserName,
            msgtype: "text",
            text: {
              content:
                "当前消息已通知给 Mr.Hope，您可继续留言完整阐述您的问题。待 Mr.Hope 接入后会向您解答。",
            },
          }),
        },
      );

      const data = (await response.json()) as {
        errcode: number;
        errmsg: string;
      };

      if (data.errcode) {
        console.error("Failed to send message to user:", data);
      }

      return res.json({
        ToUserName: FromUserName,
        FromUserName: ToUserName,
        CreateTime,
        MsgType: "transfer_customer_service",
      });
    }

    return res.end("success");
  } catch (err) {
    console.error(err);

    return DatabaseError((err as Error).message);
  }
};
