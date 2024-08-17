import { middleware } from "../utils/index.js";

export const testGetHandler = middleware((req, res) => {
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
    body: req.body,
    path: req.path,
    query: req.query,
  });
});
