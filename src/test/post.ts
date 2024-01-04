import type { RequestHandler } from "express";

export const testPostHandler: RequestHandler = (req, res) => {
  console.log(req.headers);
  console.log(req.query);
  console.log(req.path);
  console.log(req.body);

  res.cookie("a", "1");
  res.cookie("b", "2");
  res.json({
    success: true,
    msg: "test",
    headers: req.headers,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    body: req.body,
    path: req.path,
    query: req.query,
  });
};
