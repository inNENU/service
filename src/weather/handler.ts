/* eslint-disable */
import type { RequestHandler } from "express";

type Time = `${number}${number}:${number}${number}`;
type Date =
  `${number}${number}${number}${number}${number}${number}${number}${number}`;

interface WeatherData {
  data: {
    /** 天气预警 */
    alarm: {
      [props: number]: {
        /** 城市 */
        city: string;
        /** 区域 */
        country: string;
        /** 报警详情 */
        detail: string;
        /** 信息 */
        info: string;
        /** 级别代码 */
        level_code: string;
        /** 级别名称 */
        level_name: string;
        /** 省份 */
        province: string;
        /** 类型代码 */
        type_code: string;
        /** 类型名称 */
        type_name: string;
        /** 更新时间 */
        update_time: string;
        /** 对应地址 */
        url: string;
      };
    };

    forecast_1h: Record<
      number,
      {
        degree: string;
        update_time: string;
        weather: string;
        weather_code: string;
        weather_short: string;
        wind_direction: string;
        wind_power: string;
      }
    >;

    forecast_24h: Record<
      number,
      {
        day_weather: string;
        day_weather_code: string;
        day_weather_short: string;
        day_wind_direction: string;
        day_wind_direction_code: string;
        day_wind_power: string;
        day_wind_power_code: string;
        max_degree: string;
        min_degree: string;
        night_weather: string;
        night_weather_code: string;
        night_weather_short: string;
        night_wind_direction: string;
        night_wind_direction_code: string;
        night_wind_power: string;
        night_wind_power_code: string;
        time: string;
      }
    >;

    rise: Record<
      number,
      {
        sunrise: Time;
        sunset: Time;
        time: Date;
      }
    >;
  };
}

/**
 * 获得天气代码
 *
 * @param icon 天气代码
 * @param $isDay 当前是否是白天
 */
const getWeatherCode = (icon: string, isDay: boolean) =>
  (icon === "00" || icon === "01" || icon === "03" || icon === "13"
    ? isDay
      ? "day/"
      : "night/"
    : "") + icon;

export const weatherHandler: RequestHandler = async (_req, res) => {
  const { data } = <WeatherData>(
    await (
      await fetch(
        "https://wis.qq.com/weather/common?source=xw&weather_type=observe|rise|air|forecast_1h|forecast_24h|index|alarm|limit|tips&province=吉林&city=长春&county=南关"
      )
    ).json()
  );

  console.log(data);

  const riseTime = Object.entries(data.rise)
    .sort(([keyA], [keyB]) => Number(keyA) - Number(keyB))
    .map(([, value]) => value);

  const alarm = Object.entries(data.alarm).map(([, value]) => {
    const { detail, level_name, type_name } = value;

    return { level: level_name, type: type_name, text: detail };
  });

  const hourForecast = [];

  const sortedForecast1H = Object.entries(data.forecast_1h).sort(
    ([keyA], [keyB]) => Number(keyA) - Number(keyB)
  );

  res.json({ ...data, alarm });
};
