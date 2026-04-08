import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot } from '../engine/WorldState';

export function useWorldState(selector) {
  return useSyncExternalStore(subscribe, () => selector(getSnapshot()));
}
