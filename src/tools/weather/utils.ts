import type { WeatherData, WeatherRawData } from "./typings.js";

/**
 * 获得天气代码
 *
 * @param icon 天气代码
 * @param isDay 当前是否是白天
 * @returns 天气代码
 */
const getWeatherCode = (icon: string, isDay: boolean): string =>
  icon === "00" || icon === "01" || icon === "03" || icon === "13"
    ? isDay
      ? `${icon}-day`
      : `${icon}-night`
    : icon;

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

export const getWeather = ({ air, alarm, ...data }: WeatherRawData): WeatherData => {
  const {
    aqi,
    aqi_level: aqiLevel,
    aqi_name: aqiName,
    co,
    no2,
    o3,
    pm10,
    "pm2.5": pm25,
    so2,
  } = air;
  const {
    wind_direction: windDirection,
    weather_code: weatherCode,
    weather_short: weatherShort,
    weather,
    degree,
    wind_power: windPower,
    humidity,
    precipitation,
    pressure,
    update_time: updateTime,
  } = data.observe;

  const rise = Object.entries(data.rise)
    .sort(([keyA], [keyB]) => Number(keyA) - Number(keyB))
    .map(([, value]) => value);

  const hints = [
    ...Object.entries(data.index)
      .filter(([id]) => id !== "time")
      .map(([id, value]) =>
        Object.assign({ id }, value as { name: string; info: string; detail: string }),
      ),
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
    .flatMap(
      ({ degree: hourDegree, update_time: hourUpdateTime, weather_code: hourWeatherCode }) => {
        const { sunrise, sunset } = rise.find((item) => item.time === hourUpdateTime.slice(0, 8))!;
        const hour = Number(hourUpdateTime.slice(8, 10));
        const sunriseHour = Number(sunrise.slice(0, 2));
        const sunsetHour = Number(sunset.slice(0, 2));
        const isDay = sunriseHour < hour && hour <= sunsetHour;

        const hourWeather = {
          degree: `${hourDegree}°`,
          weatherCode: getWeatherCode(hourWeatherCode, isDay),
          time: `${hourUpdateTime.slice(8, 10)}:${hourUpdateTime.slice(10, 12)}`,
        };

        if (hour === sunriseHour) {
          return [
            hourWeather,
            {
              degree: "日出",
              weatherCode: "rise",
              time: sunrise,
            },
          ];
        }

        if (hour === sunsetHour) {
          return [
            hourWeather,
            {
              degree: "日落",
              weatherCode: "set",
              time: sunset,
            },
          ];
        }

        return hourWeather;
      },
    );

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
        date: `${time.slice(5, 7)}/${time.slice(8, 10)}`,
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
        dayWindDirection,
        nightWeather,
        nightWeatherShort,
        nightWeatherCode: getWeatherCode(nightWeatherCode, false),
        nightWindPower,
        nightWindDirection,
        maxDegree,
        minDegree,
      }),
    );

  return {
    air: {
      aqi,
      aqiLevel,
      aqiName,
      co: Number(co),
      no2: Number(no2),
      o3: Number(o3),
      pm10: Number(pm10),
      pm25: Number(pm25),
      so2: Number(so2),
    },
    alarm: Object.entries(alarm).map(([, { detail, level_name: level, type_name: type }]) => ({
      level,
      type,
      text: detail,
    })),
    dayForecast,
    hourForecast,
    hints,
    observe: {
      weatherCode,
      weatherShort,
      weather,
      degree,
      windDirection: getWindDirection(windDirection),
      windPower,
      humidity,
      precipitation,
      pressure,
      updateTime,
    },
    rise,
  };
};
