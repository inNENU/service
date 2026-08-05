/** 天气 /tools/weather 端点测试（无需登录；/weather 为废弃端点，不测） */
import { describe, expect, it } from "vitest";

import { ApiClient } from "../../client.js";
import { expectArrayItems, expectObjectKeys } from "../../helpers.js";

const client = new ApiClient();

describe("天气 /tools/weather", () => {
  it("天气 GET /tools/weather", async () => {
    const res = await client.get("/tools/weather/");

    expect(res.status).toBe(200);
    expectObjectKeys(
      res.body,
      ["air", "alarm", "dayForecast", "hourForecast", "observe", "rise", "hints"],
      "/tools/weather",
    );
    expectObjectKeys(
      res.body.air,
      ["aqi", "aqiLevel", "aqiName", "co", "no2", "o3", "pm10", "pm25", "so2"],
      "weather.air",
    );
    expect(res.body.air.aqi, "AQI 应为数字").toBeTypeOf("number");
    expectArrayItems(res.body.alarm, ["level", "type", "text"], "weather.alarm");
    expectArrayItems(
      res.body.dayForecast,
      [
        "dayWeather",
        "dayWeatherCode",
        "dayWeatherShort",
        "maxDegree",
        "minDegree",
        "nightWeather",
        "nightWeatherCode",
        "nightWeatherShort",
        "nightWindDirection",
        "nightWindPower",
        "weekday",
      ],
      "weather.dayForecast",
    );
    expectArrayItems(
      res.body.hourForecast,
      ["degree", "time", "weatherCode"],
      "weather.hourForecast",
    );
    expectArrayItems(res.body.rise, ["sunrise", "sunset", "time"], "weather.rise");
    expectArrayItems(res.body.hints, ["id", "name", "info", "detail"], "weather.hints");
    expectObjectKeys(
      res.body.observe,
      [
        "degree",
        "humidity",
        "precipitation",
        "pressure",
        "updateTime",
        "weather",
        "weatherCode",
        "weatherShort",
        "windDirection",
        "windPower",
      ],
      "weather.observe",
    );
  });
});
