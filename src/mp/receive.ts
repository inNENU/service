import type { RequestHandler } from "express";
import { sha1 } from "js-sha1";

import { DatabaseError } from "../config/index.js";
import type { EmptyObject } from "../typings.js";
import { connect, getShortUUID } from "../utils/index.js";
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
      `INSERT INTO contact (uuid, appId, openid, content,) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        getShortUUID(),
        ToUserName,
        FromUserName,
        CreateTime,
        MsgType === "text" ? req.body.Content : null,
      ],
    );

    release();

    if (
      MsgType === "text" ||
      MsgType === "image" ||
      MsgType === "miniprogrampage"
    ) {
      res.header("Content-Type", "application/json");

      return res.end({
        ToUserName,
        FromUserName,
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
