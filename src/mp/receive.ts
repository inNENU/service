import { sha1 } from "js-sha1";
import type { PoolConnection } from "mysql2/promise";
import { v7 } from "uuid";

import { getConnection, releaseConnection, request } from "@/utils/index.js";
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

export const mpReceiveHandler = request<
  unknown,
  ContactMessage | EnterEvent,
  { signature: string; timestamp: string; nonce: string; echostr: string }
>(async (req, res) => {
  let connection: PoolConnection | null = null;

  try {
    const { signature, timestamp, nonce } = req.query;

    if (
      sha1([process.env.TOKEN, timestamp, nonce].sort().join("")) !== signature
    ) {
      return res.status(403).send("Invalid signature");
    }

    if (req.method === "GET") {
      return res.send(req.query.echostr);
    }

    const { ToUserName, FromUserName, CreateTime, MsgType } = req.body;

    try {
      connection = await getConnection();

      await connection.execute(
        "INSERT INTO contact (`uuid`, `appId`, `openid`, `createTime`, `type`, `content`) VALUES (?, ?, ?, FROM_UNIXTIME(?), ?, ?)",
        [
          v7(),
          ToUserName,
          FromUserName,
          CreateTime,
          MsgType ?? "Unknown",
          MsgType === "text" ? req.body.Content : null,
        ],
      );
    } catch (err) {
      console.error("Database error", err);
    }

    if (
      MsgType === "text" ||
      MsgType === "image" ||
      MsgType === "miniprogrampage"
    ) {
      return res.json({
        ToUserName: FromUserName,
        FromUserName: ToUserName,
        CreateTime,
        MsgType: "transfer_customer_service",
      });
    }

    return res.send("success");
  } finally {
    releaseConnection(connection);
  }
});
