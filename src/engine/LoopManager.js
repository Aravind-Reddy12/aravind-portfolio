import { world, notifySubscribers } from './WorldState';
import { WORLD_WIDTH } from '../constants';
import { reset as resetWeather } from './WeatherSystem';

let prevOffset = 0;

export function checkWrap(worldOffset) {
  if (prevOffset > WORLD_WIDTH * 0.9 && worldOffset < WORLD_WIDTH * 0.1) {
    onWrap();
  }
  prevOffset = worldOffset;
}

function onWrap() {
  world.lap++;
  if (world.lap === 2) {
    world.autoTourActive = false;
    world.autoShownBuildings.clear();
  }
  resetWeather();
  notifySubscribers();
}
