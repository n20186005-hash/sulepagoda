/**
 * 气象数据服务（服务端）
 *
 * 在服务器端统一获取并缓存仰光苏雷佛塔所在地的实时天气与多日预报，
 * 供页面在请求渲染时使用，避免访客浏览器直接发起第三方请求。
 *
 * 缓存策略（两级）：
 *  1. 边缘缓存（运行时可用时）：30 分钟
 *  2. 实例内内存缓存：10 分钟
 *
 * 另含「可执行建议」推导引擎：把原始气象数值翻译成游客一眼能懂的行动建议，
 * 按「出行穿搭 / 游玩安排 / 随身物品」三类输出，风险项单独置顶。
 */

const LATITUDE = 16.7744222;
const LONGITUDE = 96.1587556;
const TIMEZONE = 'Asia/Yangon';

const MEMORY_TTL_MS = 10 * 60 * 1000;
const EDGE_TTL_SECONDS = 30 * 60;
const CACHE_KEY = 'https://sulepagoda.org/__internal/weather/v2';

export interface CurrentConditions {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  windGust: number;
  windDirection: number;
  cloudCover: number;
  weatherCode: number;
  isDay: boolean;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  apparentMax: number;
  apparentMin: number;
  precipitationProbability: number;
  precipitationSum: number;
  uvIndexMax: number;
  windMax: number;
  gustMax: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherBundle {
  current: CurrentConditions;
  today: DailyForecast;
  daily: DailyForecast[];
}

let memoryCache: { at: number; data: WeatherBundle } | null = null;

function getEdgeCache(): Cache | null {
  try {
    const store = (globalThis as unknown as { caches?: { default?: Cache } }).caches;
    if (store && store.default && typeof store.default.match === 'function') {
      return store.default;
    }
  } catch {
    /* 运行时未提供缓存 API 时降级为内存缓存 */
  }
  return null;
}

function round(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
}

function pick<T>(list: T[] | undefined, index: number, fallback: T): T {
  if (!Array.isArray(list) || list[index] === undefined || list[index] === null) return fallback;
  return list[index];
}

async function requestWeather(): Promise<WeatherBundle | null> {
  const params = new URLSearchParams({
    latitude: String(LATITUDE),
    longitude: String(LONGITUDE),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,is_day',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,precipitation_sum,uv_index_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset',
    timezone: TIMEZONE,
    forecast_days: '7',
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      current?: Record<string, number>;
      daily?: Record<string, Array<string | number>>;
    };

    const daily: DailyForecast[] = (payload.daily?.time ?? []).map((date, index) => ({
      date: String(date),
      weatherCode: round(pick(payload.daily?.weather_code, index, 0)),
      tempMax: round(pick(payload.daily?.temperature_2m_max, index, 0)),
      tempMin: round(pick(payload.daily?.temperature_2m_min, index, 0)),
      apparentMax: round(pick(payload.daily?.apparent_temperature_max, index, 0)),
      apparentMin: round(pick(payload.daily?.apparent_temperature_min, index, 0)),
      precipitationProbability: round(pick(payload.daily?.precipitation_probability_max, index, 0)),
      precipitationSum: round(pick(payload.daily?.precipitation_sum, index, 0)),
      uvIndexMax: round(pick(payload.daily?.uv_index_max, index, 0)),
      windMax: round(pick(payload.daily?.wind_speed_10m_max, index, 0)),
      gustMax: round(pick(payload.daily?.wind_gusts_10m_max, index, 0)),
      sunrise: String(pick(payload.daily?.sunrise, index, '')),
      sunset: String(pick(payload.daily?.sunset, index, '')),
    }));

    const today = daily[0];
    if (!today) return null;

    return {
      current: {
        temperature: round(payload.current?.temperature_2m),
        apparentTemperature: round(payload.current?.apparent_temperature),
        humidity: round(payload.current?.relative_humidity_2m),
        precipitation: round(payload.current?.precipitation),
        windSpeed: round(payload.current?.wind_speed_10m),
        windGust: round(payload.current?.wind_gusts_10m),
        windDirection: round(payload.current?.wind_direction_10m),
        cloudCover: round(payload.current?.cloud_cover),
        weatherCode: round(payload.current?.weather_code),
        isDay: round(payload.current?.is_day, 1) === 1,
      },
      today,
      daily,
    };
  } catch {
    return null;
  }
}

export async function getWeather(): Promise<WeatherBundle | null> {
  const now = Date.now();

  if (memoryCache && now - memoryCache.at < MEMORY_TTL_MS) {
    return memoryCache.data;
  }

  const cache = getEdgeCache();
  if (cache) {
    try {
      const hit = await cache.match(CACHE_KEY);
      if (hit) {
        const data = (await hit.json()) as WeatherBundle;
        memoryCache = { at: now, data };
        return data;
      }
    } catch {
      /* 忽略缓存读取异常，继续回源 */
    }
  }

  const data = await requestWeather();
  if (!data) return memoryCache?.data ?? null;

  memoryCache = { at: now, data };

  if (cache) {
    try {
      await cache.put(
        CACHE_KEY,
        new Response(JSON.stringify(data), {
          headers: {
            'content-type': 'application/json',
            'cache-control': `public, max-age=${EDGE_TTL_SECONDS}`,
          },
        }),
      );
    } catch {
      /* 忽略缓存写入异常 */
    }
  }

  return data;
}

/** WMO 天气代码 → 语义分组，用于多语言文案与图标 */
export type ConditionKey =
  | 'clear'
  | 'mainlyClear'
  | 'partlyCloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'showers'
  | 'thunder'
  | 'snow';

export function conditionKey(code: number): ConditionKey {
  if (code === 0) return 'clear';
  if (code === 1) return 'mainlyClear';
  if (code === 2) return 'partlyCloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'showers';
  if (code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunder';
  return 'partlyCloudy';
}

export const conditionIcon: Record<ConditionKey, string> = {
  clear: '☀️',
  mainlyClear: '🌤️',
  partlyCloudy: '⛅',
  overcast: '☁️',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  showers: '🌧️',
  thunder: '⛈️',
  snow: '🌨️',
};

/** "2026-09-13T17:52" → "17:52" */
export function clockFromIso(iso: string): string {
  const index = typeof iso === 'string' ? iso.indexOf('T') : -1;
  return index === -1 ? '—' : iso.slice(index + 1, index + 6);
}

/** 本地时间偏移，用于计算日落前的到达时刻与蓝调时刻 */
export function shiftClock(clock: string, minutes: number): string {
  const match = /^(\d{2}):(\d{2})$/.exec(clock);
  if (!match) return '—';
  const total = Number(match[1]) * 60 + Number(match[2]) + minutes;
  const normalized = ((total % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const mins = String(normalized % 60).padStart(2, '0');
  return `${hours}:${mins}`;
}

/* ------------------------------------------------------------------ *
 * 可执行建议推导
 * ------------------------------------------------------------------ */

export type AdviceGroup = 'outfit' | 'plan' | 'pack';
export type AdviceLevel = 'info' | 'risk';

export interface AdviceItem {
  /** 对应 i18n 文案键：weather.advice.items.<id> */
  id: string;
  group: AdviceGroup;
  level: AdviceLevel;
}

export interface WeatherAdvice {
  risks: AdviceItem[];
  outfit: AdviceItem[];
  plan: AdviceItem[];
  pack: AdviceItem[];
}

/** 本景点为城市人文型遗产地：不涉及海域、山地等野外环境风险。 */
export const SITE_PROFILE = 'urban-culture' as const;

/** 阈值：风力按蒲福风级换算（km/h） */
const WIND_BREEZY = 29; // 5 级
const WIND_STRONG = 50; // 7 级
const UV_HIGH = 5;
const HEAT_TEMP = 32;
const COLD_TEMP = 10;
const SWING_TEMP = 8;
const RAIN_LIKELY = 60;

interface Metrics {
  condition: ConditionKey;
  code: number;
  tempMax: number;
  tempMin: number;
  swing: number;
  apparentMax: number;
  uv: number;
  rainProb: number;
  todayRainProb: number;
  rainSum: number;
  windMax: number;
  gustMax: number;
  humidity: number;
  cloudCover: number;
  isDay: boolean;
}

const RAINY: ConditionKey[] = ['drizzle', 'rain', 'showers', 'thunder'];

function isRainy(condition: ConditionKey): boolean {
  return RAINY.includes(condition);
}

function metricsFrom(data: WeatherBundle): Metrics {
  const today = data.today;
  const tomorrow = data.daily[1];
  return {
    condition: conditionKey(today.weatherCode),
    code: today.weatherCode,
    tempMax: today.tempMax,
    tempMin: today.tempMin,
    swing: today.tempMax - today.tempMin,
    apparentMax: today.apparentMax,
    uv: today.uvIndexMax,
    rainProb: Math.max(today.precipitationProbability, tomorrow?.precipitationProbability ?? 0),
    todayRainProb: today.precipitationProbability,
    rainSum: today.precipitationSum,
    windMax: today.windMax,
    gustMax: today.gustMax,
    humidity: data.current.humidity,
    cloudCover: data.current.cloudCover,
    isDay: data.current.isDay,
  };
}

interface Rule {
  id: string;
  group: AdviceGroup;
  level?: AdviceLevel;
  /** 数值越小越优先，超过分组上限的条目会被隐藏 */
  priority: number;
  /** 兜底文案：仅在该分组没有任何条目命中时才显示 */
  fallback?: boolean;
  when: (m: Metrics) => boolean;
}

const SEVERE_RAIN = new Set([65, 67, 82]);

const severeRain = (m: Metrics) => SEVERE_RAIN.has(m.code) || m.rainSum >= 20 || m.todayRainProb >= 80;
const strongWind = (m: Metrics) => m.windMax >= WIND_STRONG || m.gustMax >= 70;
const rainyWindow = (m: Metrics) => m.rainProb >= RAIN_LIKELY || isRainy(m.condition);
/** 已经升级为雷雨或强降雨时，不再重复输出普通降雨提示 */
const mildRain = (m: Metrics) => rainyWindow(m) && m.condition !== 'thunder' && !severeRain(m);

const RULES: Rule[] = [
  /* ---------- 风险提醒（需触发才显示，置顶红色） ---------- */
  { id: 'riskThunder', group: 'plan', level: 'risk', priority: 1, when: (m) => m.condition === 'thunder' },
  { id: 'riskStrongWind', group: 'plan', level: 'risk', priority: 2, when: strongWind },
  { id: 'riskHeavyRain', group: 'plan', level: 'risk', priority: 3, when: severeRain },
  { id: 'riskFog', group: 'plan', level: 'risk', priority: 4, when: (m) => m.condition === 'fog' },

  /* ---------- 出行穿搭 ---------- */
  { id: 'outfitCold', group: 'outfit', priority: 10, when: (m) => m.tempMax <= COLD_TEMP },
  { id: 'outfitHot', group: 'outfit', priority: 11, when: (m) => m.tempMax >= HEAT_TEMP },
  { id: 'outfitWet', group: 'outfit', priority: 12, when: rainyWindow },
  { id: 'outfitWind', group: 'outfit', priority: 13, when: (m) => m.windMax >= WIND_BREEZY },
  { id: 'outfitSwing', group: 'outfit', priority: 14, when: (m) => m.swing > SWING_TEMP },
  { id: 'outfitHumid', group: 'outfit', priority: 15, when: (m) => m.humidity >= 80 && m.tempMax >= 28 },
  { id: 'outfitCalm', group: 'outfit', priority: 99, fallback: true, when: () => true },

  /* ---------- 游玩安排 ---------- */
  { id: 'planThunder', group: 'plan', priority: 20, when: (m) => m.condition === 'thunder' },
  { id: 'planHeavyRain', group: 'plan', priority: 21, when: severeRain },
  { id: 'planRain', group: 'plan', priority: 22, when: mildRain },
  { id: 'planStrongWind', group: 'plan', priority: 23, when: strongWind },
  { id: 'planFog', group: 'plan', priority: 24, when: (m) => m.condition === 'fog' },
  { id: 'planPlatform', group: 'plan', priority: 25, when: (m) => m.tempMax >= HEAT_TEMP || m.apparentMax >= 33 },
  { id: 'planWind', group: 'plan', priority: 26, when: (m) => m.windMax >= WIND_BREEZY },
  {
    id: 'planPhoto',
    group: 'plan',
    priority: 27,
    when: (m) => m.condition === 'partlyCloudy' || m.condition === 'overcast',
  },
  {
    id: 'planSunny',
    group: 'plan',
    priority: 28,
    when: (m) => (m.condition === 'clear' || m.condition === 'mainlyClear') && m.rainProb < RAIN_LIKELY,
  },
  { id: 'planCalm', group: 'plan', priority: 99, fallback: true, when: () => true },

  /* ---------- 随身物品 ---------- */
  {
    id: 'packRaincoat',
    group: 'pack',
    priority: 30,
    when: (m) => m.condition === 'thunder' || SEVERE_RAIN.has(m.code) || m.rainSum >= 20,
  },
  { id: 'packUmbrella', group: 'pack', priority: 31, when: mildRain },
  { id: 'packSun', group: 'pack', priority: 32, when: (m) => m.uv >= UV_HIGH || m.cloudCover < 30 },
  { id: 'packWater', group: 'pack', priority: 33, when: (m) => m.tempMax >= HEAT_TEMP || m.apparentMax >= 33 },
  { id: 'packWarm', group: 'pack', priority: 34, when: (m) => m.tempMax <= COLD_TEMP },
  { id: 'packLayer', group: 'pack', priority: 35, when: (m) => m.swing > SWING_TEMP },
  { id: 'packMask', group: 'pack', priority: 36, when: (m) => m.condition === 'fog' },
];

const GROUP_LIMITS: Record<AdviceGroup, number> = {
  outfit: 2,
  plan: 3,
  pack: 3,
};

/**
 * 依据当天与次日气象数据推导游客可直接执行的建议。
 * 不满足条件的条目直接不返回，页面无需自行过滤；
 * 只有整组都无命中时才回落到「今天的天气不构成障碍」这类兜底文案。
 */
export function buildAdvice(data: WeatherBundle): WeatherAdvice {
  const metrics = metricsFrom(data);

  const matched = RULES.filter((rule) => {
    try {
      return rule.when(metrics);
    } catch {
      return false;
    }
  });

  const take = (group: AdviceGroup): AdviceItem[] => {
    const hits = matched
      .filter((rule) => rule.group === group && rule.level !== 'risk' && !rule.fallback)
      .sort((a, b) => a.priority - b.priority)
      .slice(0, GROUP_LIMITS[group]);

    if (hits.length === 0) {
      const fallback = matched.find((rule) => rule.group === group && rule.fallback);
      if (fallback) hits.push(fallback);
    }

    return hits.map((rule) => ({ id: rule.id, group, level: 'info' as AdviceLevel }));
  };

  const risks = matched
    .filter((rule) => rule.level === 'risk')
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 2)
    .map((rule) => ({ id: rule.id, group: 'plan' as AdviceGroup, level: 'risk' as AdviceLevel }));

  return {
    risks,
    outfit: take('outfit'),
    plan: take('plan'),
    pack: take('pack'),
  };
}
