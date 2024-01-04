import type { RequestHandler } from "express";

export const test302Handler: RequestHandler = (req, res) => {
  console.log(req.headers);
  console.log(req.query);
  console.log(req.path);
  console.log(req.body);

  res.cookie("a", "1");
  res.cookie("b", "2");
  res.header("Location", "https://service.innenu.com");
  res.status(302);
  res.end();
};
