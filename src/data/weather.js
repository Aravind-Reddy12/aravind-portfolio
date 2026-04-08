export const WEATHER_ZONES = [
  { worldX: 0,    weather: { rainIntensity: 0,   windIntensity: 0.1, fogOpacity: 0,    lightningActive: false } },
  { worldX: 600,  weather: { rainIntensity: 0.3, windIntensity: 0.1, fogOpacity: 0.05, lightningActive: false } },
  { worldX: 1800, weather: { rainIntensity: 0,   windIntensity: 0.6, fogOpacity: 0,    lightningActive: false } },
  { worldX: 2800, weather: { rainIntensity: 0.5, windIntensity: 0.3, fogOpacity: 0.1,  lightningActive: true  } },
  { worldX: 3800, weather: { rainIntensity: 0,   windIntensity: 0.2, fogOpacity: 0,    lightningActive: false } },
  { worldX: 4800, weather: { rainIntensity: 0.1, windIntensity: 0.1, fogOpacity: 0,    lightningActive: false } },
];

export const DEFAULT_ZONE = {
  weather: { rainIntensity: 0, windIntensity: 0.1, fogOpacity: 0, lightningActive: false },
};
