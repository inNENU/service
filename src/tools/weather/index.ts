import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { request } from "@/utils/index.js";

import type { WeatherData, WeatherOptions, WeatherRawResponse } from "./typings.js";
import { getWeather } from "./utils.js";

export type { WeatherData } from "./typings.js";

const weatherLimiter = rateLimit({
  windowMs: 60000, // 1 分钟
  max: 30,
  legacyHeaders: false,
  standardHeaders: true,
});

const weatherHandler = request<WeatherData, WeatherOptions>(async (req, res) => {
  const {
    province = "吉林",
    city = "长春",
    county = "南关",
  } = req.params as Record<string, string>;

  const weather = await fetch(
    `https://wis.qq.com/weather/common?source=pc&weather_type=observe|rise|air|forecast_1h|forecast_24h|index|alarm|limit|tips&province=${province}&city=${city}&county=${county}`,
  );

  const rawData = ((await weather.json()) as WeatherRawResponse).data;

  return res.json(getWeather(rawData));
});

export const weatherRouter = Router().get("/", weatherLimiter, weatherHandler);
