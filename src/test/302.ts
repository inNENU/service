import { middleware } from "../utils/index.js";

export const test302Handler = middleware((req, res) => {
  console.log(req.headers);
  console.log(req.query);
  console.log(req.path);
  console.log(req.body);

  res.cookie("a", "1");
  res.cookie("b", "2");
  res.header("Location", "https://service.innenu.com");
  res.status(302);
  res.end();
});
