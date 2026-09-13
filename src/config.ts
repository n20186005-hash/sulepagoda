export const siteConfig = {
  name: 'Sule Pagoda',
  baseUrl: 'https://sulepagoda.org',
  slug: 'sule-pagoda',
  locales: ['zh', 'en', 'my', 'ja', 'ko'] as const,
};

export const ogLocale: Record<string, string> = {
  zh: 'zh_CN',
  en: 'en_US',
  my: 'my',
  ja: 'ja_JP',
  ko: 'ko_KR',
};

/**
 * 单景点 SEO 实体绑定配置变量表
 * 页面中所有实体信息（标题层级、结构化数据、地图、外链）统一从该表读取，
 * 需要新增/替换景点时只需修改此处变量。
 */
export const entityConfig = {
  /** {{DOMAIN_NAME}} */
  domainName: 'sulepagoda.org',
  /** {{ATTRACTION_FULL_NAME}} */
  attractionFullName: 'Sule Pagoda',
  /** {{ATTRACTION_SHORT_NAME}} */
  attractionShortName: 'Sule Pagoda',
  /** 本地语种名称（用于 alternateName） */
  attractionNativeName: 'ဆူးလေစေတီတော်',
  /**
   * 其他常用名与拼写变体（用于 alternateName）。
   * 覆盖 GSC 中已出现曝光的写法：sule paya / sulay pagoda / 苏雷宝塔，
   * 帮助 Google 把这些查询变体归并到同一实体。
   */
  alternateNames: ['苏雷宝塔', '苏雷佛塔', 'Sule Paya', 'Sulay Pagoda'],
  /** {{CITY_NAME}} */
  cityName: 'Yangon',
  /** {{STATE_PROVINCE}} */
  stateProvince: 'Yangon Region',
  /** {{COUNTRY_NAME}} */
  countryName: 'Myanmar (Burma)',
  /** {{COUNTRY_CODE_2LETTER}} */
  countryCode: 'MM',
  /** {{POSTAL_CODE}} */
  postalCode: '11141',
  /** {{LATITUDE}} */
  latitude: 16.7744222,
  /** {{LONGITUDE}} */
  longitude: 96.1587556,
  /** Google Plus Code */
  plusCode: 'Q5F5+WG Yangon, Myanmar (Burma)',
  telephone: '+951371561',
  streetAddress: 'Junction of Sule Pagoda Road and Maha Bandula Road',
  /** {{MAPS_SHARE_URL}} */
  mapsShareUrl: 'https://maps.app.goo.gl/ux28gsEjSyso9gAF9',
  /** {{MAPS_EMBED_SRC}} */
  mapsEmbedSrc: 'https://www.google.com/maps?q=16.7744222,96.1587556&hl=en&z=17&output=embed',
  /** {{NEARBY_LANDMARK_1}} */
  nearbyLandmark1: 'Maha Bandula Park',
  /** {{NEARBY_LANDMARK_2}} */
  nearbyLandmark2: 'Yangon City Hall',
  /** {{GOVT_TOURISM_URL}} */
  govtTourismUrl: 'https://www.tourism.gov.mm',
  /** 图片与媒体 */
  heroImage: '/og-image.jpg',
  heroImageWidth: 1200,
  heroImageHeight: 630,
  galleryImages: [
    '/gallery/sule-pagoda-yangon-myanmar-1.jpg',
    '/gallery/sule-pagoda-yangon-myanmar-2.jpg',
    '/gallery/sule-pagoda-yangon-myanmar-3.jpg',
    '/gallery/sule-pagoda-yangon-myanmar-4.jpg',
  ],
  /** 评分与评价（来源：Google 地图，随最新评价同步更新） */
  rating: {
    value: '4.4',
    count: 6586,
    best: '5',
    worst: '1',
    sourceName: 'Google Maps',
    sourceUrl: 'https://maps.app.goo.gl/ux28gsEjSyso9gAF9',
    asOf: '2026-09',
  },
  openingHours: {
    opens: '04:00',
    closes: '23:00',
  },
};

export default siteConfig;
