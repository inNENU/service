type SingleNumber = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type Time = `${"0" | "1" | "2"}${SingleNumber}:${SingleNumber}${SingleNumber}`;
type Date = string;
type DateWithMinus = string;

export interface WeatherRawData {
  air: {
    aqi: number;
    aqi_level: number;
    aqi_name: string;
    co: string;
    no2: string;
    o3: string;
    pm10: string;
    "pm2.5": string;
    so2: string;
  };

  /** 天气预警 */
  alarm: Record<
    `${number}`,
    {
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
    }
  >;

  forecast_1h: Record<
    `${number}`,
    {
      degree: string;
      update_time: string;
      weather: string;
      weather_code: string;
      weather_short: string;
      weather_url: "";
      wind_direction: string;
      wind_power: string;
    }
  >;

  forecast_24h: Record<
    `${number}`,
    {
      aqi_level: number;
      aqi_name: "";
      aqi_url: "";
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
      time: DateWithMinus;
    }
  >;

  index: Record<
    string,
    {
      detail: string;
      info: string;
      name: string;
    }
  > & { time: string };

  limit: {
    tail_number: string;
    time: Date;
  };

  observe: {
    degree: `${number}`;
    humidity: `${number}`;
    precipitation: `${number}`;
    pressure: `${number}`;
    update_time: `${number}`;
    weather: string;
    weather_bg_pag: "";
    weather_color: null;
    weather_first: "";
    weather_pag: "";
    weather_code: "";
    weather_short: string;
    weather_url: "";
    wind_direction: `${number}`;
    wind_direction_name: string;
    wind_power: string;
  };

  rise: Record<
    `${number}`,
    {
      sunrise: Time;
      sunset: Time;
      time: Date;
    }
  >;

  tips: {
    // FIXME: type this
    forecast_24h: unknown;
  };
}

export interface WeatherRawResponse {
  data: WeatherRawData;
  status: 200;
}

export interface WeatherAirInfo {
  /** 空气质量 */
  aqi: number;
  /** 空气质量等级 */
  aqiLevel: number;
  /** 空气质量描述 */
  aqiName: string;
  co: number;
  no2: number;
  o3: number;
  pm10: number;
  pm25: number;
  so2: number;
}

export interface WeatherAlarm {
  level: string;
  type: string;
  text: string;
}

/** 一小时天气预报详情 */
export interface WeatherForecast1H {
  /** 摄氏度 */
  degree: string;
  /** 更新时间 */
  time: string;
  /** 天气代码 */
  weatherCode: string;
}

/** 24小时天气预报详情 */
export interface WeatherForecast24H {
  /** 日间天气 */
  dayWeather: string;
  /** 日间天气代码 */
  dayWeatherCode: string;
  /** 日间天气缩写 */
  dayWeatherShort: string;
  /** 最高温 */
  maxDegree: string;
  /** 最低温 */
  minDegree: string;
  /** 夜间温度 */
  nightWeather: string;
  /** 夜间温度代码 */
  nightWeatherCode: string;
  /** 夜间温度缩写 */
  nightWeatherShort: string;
  /** 夜间风向 */
  nightWindDirection: string;
  /** 夜间风力 */
  nightWindPower: string;
  /** 星期 */
  weekday: string;
}

export interface WeatherHint {
  id: string;
  name: string;
  info: string;
  detail: string;
}

export interface WeatherObserveInfo {
  /** 温度 */
  degree: string;
  /** 湿度 */
  humidity: string;
  /** 降水量 */
  precipitation: string;
  /** 压力 */
  pressure: string;
  /** 更新时间 */
  updateTime: string;
  /** 天气 */
  weather: string;
  /** 天气代码 */
  weatherCode: string;
  /** 天气缩写 */
  weatherShort: string;
  /** 风向 */
  windDirection: string;
  /** 风力 */
  windPower: string;
}

export interface WeatherRiseInfo {
  /** 日出时间 */
  sunrise: string;
  /** 日落时间 */
  sunset: string;
  /** 日期 */
  time: string;
}

/** 天气详情 */
export interface WeatherData {
  air: WeatherAirInfo;
  /** 天气预警 */
  alarm: WeatherAlarm[];
  /** 天预报 */
  dayForecast: WeatherForecast24H[];
  /** 小时预报 */
  hourForecast: WeatherForecast1H[];
  /** 实时数据 */
  observe: WeatherObserveInfo;
  /** 日出日落时间 */
  rise: WeatherRiseInfo[];
  hints: WeatherHint[];
}

export interface WeatherOptions {
  province?: string;
  city?: string;
  county?: string;
}
