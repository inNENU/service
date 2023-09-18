/* eslint-disable */
import type { RequestHandler } from "express";
import type { EmptyObject } from "../typings";

type Time = `${number}${number}:${number}${number}`;
type Date =
  `${number}${number}${number}${number}${number}${number}${number}${number}`;

interface WeatherData {
  data: {
    air: {
      aqi: number;
      aqi_level: string;
      aqi_name: string;
    };

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

    index: {
      time: string;
      [type: string]:
        | {
            detail: string;
            info: string;
            name: string;
          }
        | string;
    };

    limit: {
      tail_number: string;
      time: string;
    };

    observe: {
      degree: string;
      humidity: string;
      precipitation: string;
      pressure: string;
      update_time: string;
      weather: string;
      weather_code: string;
      weather_short: "多云";
      wind_direction: string;
      wind_power: string;
    };

    rise: Record<
      number,
      {
        sunrise: Time;
        sunset: Time;
        time: Date;
      }
    >;

    tips: {
      observe: {
        [props: string]: string;
      };
    };
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

const getWindDirection = (direction: string): string =>
  direction === "8"
    ? "北"
    : direction === "1"
    ? "东北"
    : direction === "2"
    ? "东"
    : direction === "3"
    ? "东南"
    : direction === "4"
    ? "南"
    : direction === "5"
    ? "西南"
    : direction === "6"
    ? "西"
    : direction === "7"
    ? "西北"
    : "未知";

export interface WeatherOptions {
  province?: string;
  city?: string;
  county?: string;
}

export const weatherHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  WeatherOptions
> = async (req, res) => {
  const { province = "吉林", city = "长春", county = "南关" } = req.body;

  const { data } = <WeatherData>(
    await (
      await fetch(
        `https://wis.qq.com/weather/common?source=xw&weather_type=observe|rise|air|forecast_1h|forecast_24h|index|alarm|limit|tips&province=${province}&city=${city}&county=${county}`
      )
    ).json()
  );

  const air = {
    aqi: data.air.aqi,
    aqiLevel: data.air.aqi_level,
    aqiName: data.air.aqi_name,
  };

  const alarm = Object.entries(data.alarm).map(([, value]) => {
    const { detail, level_name, type_name } = value;

    return { level: level_name, type: type_name, text: detail };
  });

  const { wind_direction: windDirection } = data.observe;

  const observe = {
    weatherCode: data.observe.weather_code,
    weatherShort: data.observe.weather_short,
    weather: data.observe.weather,
    degree: data.observe.degree,
    windDirection: getWindDirection(windDirection),
    windPower: data.observe.wind_power,
    humidity: data.observe.humidity,
    precipitation: data.observe.precipitation,
    pressure: data.observe.pressure,
    updateTime: data.observe.update_time,
  };

  const rise = Object.entries(data.rise)
    .sort(([keyA], [keyB]) => Number(keyA) - Number(keyB))
    .map(([, value]) => value);

  const hints = [
    ...Object.entries(data.index)
      .filter(([id]) => id !== "time")
      .map(([id, value]) => ({
        id,
        ...(<{ name: string; info: string; detail: string }>value),
      })),
    {
      id: "tailnumber",
      name: "尾号限行",
      info: data.limit.tail_number,
      detail: `今日尾号限行情况: 限行${data.limit.tail_number}尾号`,
    },
  ];

  const hourForecast = Object.entries(data.forecast_1h)
    .sort(([keyA], [keyB]) => Number(keyA) - Number(keyB))
    .map(([, value]) => value)
    .map(({ degree, update_time: updateTime, weather_code: weatherCode }) => {
      const { sunrise, sunset } = rise.find(
        (item) => item.time === updateTime.substring(0, 8)
      )!;
      const hour = Number(updateTime.substring(8, 10));
      const sunriseHour = Number(sunrise.substring(0, 2));
      const sunsetHour = Number(sunset.substring(0, 2));
      const isDay = sunriseHour < hour && hour <= sunsetHour;

      const weather = {
        degree: `${degree}°`,
        weatherCode: getWeatherCode(weatherCode, isDay),
        time: `${updateTime.substring(8, 10)}:${updateTime.substring(10, 12)}`,
      };

      if (hour === sunriseHour)
        return [
          weather,
          {
            degree: "日出",
            weatherCode: "rise",
            time: sunrise,
          },
        ];

      if (hour === sunsetHour)
        return [
          weather,
          {
            degree: "日落",
            weatherCode: "set",
            time: sunset,
          },
        ];

      return weather;
    })
    .flat();

  const dayForecast = Object.entries(data.forecast_24h)
    .sort(([keyA], [keyB]) => Number(keyA) - Number(keyB))
    .map(
      ([
        index,
        {
          day_weather: dayWeather,
          day_weather_short: dayWeatherShort,
          day_weather_code: dayWeatherCode,
          day_wind_direction: dayWindDirection,
          day_wind_power: dayWindPower,
          night_weather: nightWeather,
          night_weather_code: nightWeatherCode,
          night_weather_short: nightWeatherShort,
          night_wind_direction: nightWindDirection,
          night_wind_power: nightWindPower,
          max_degree: maxDegree,
          min_degree: minDegree,
          time,
        },
      ]) => ({
        date: `${time.substring(5, 7)}/${time.substring(8, 10)}`,
        weekday:
          index === "0"
            ? "昨天"
            : index === "1"
            ? "今天"
            : index === "2"
            ? "明天"
            : index === "3"
            ? "后天"
            : `星期${
                ["天", "一", "二", "三", "四", "五", "六"][
                  (new Date().getDay() + Number(index) - 1) % 7
                ]
              }`,
        dayWeather,
        dayWeatherShort,
        dayWeatherCode: getWeatherCode(dayWeatherCode, true),
        dayWindPower,
        dayWindDirection: getWindDirection(dayWindDirection),
        nightWeather,
        nightWeatherShort,
        nightWeatherCode: getWeatherCode(nightWeatherCode, false),
        nightWindPower,
        nightWindDirection: getWindDirection(nightWindDirection),
        maxDegree,
        minDegree,
      })
    );

  const tips = Object.values(data.tips.observe);

  return res.json({
    air,
    alarm,
    dayForecast,
    hourForecast,
    hints,
    observe,
    rise,
    tips,
  });
};
