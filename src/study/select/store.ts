export interface SelectOptionConfig {
  value: string;
  name: string;
}

const CACHE_TTL = 2592000000; // 30 天

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface Store<T> {
  state: T;
  setState: (newState: T) => void;
  isValid: () => boolean;
  reset: () => void;
}

const createStore = <T>(initialState: T): Store<T> => {
  const entry: CacheEntry<T> = { data: initialState, timestamp: 0 };

  return {
    get state(): T {
      return entry.data;
    },
    setState(newState: T): void {
      entry.data = newState;
      entry.timestamp = Date.now();
    },
    isValid(): boolean {
      return Date.now() - entry.timestamp < CACHE_TTL;
    },
    reset(): void {
      entry.data = initialState;
      entry.timestamp = 0;
    },
  };
};

export const areasStore = createStore<SelectOptionConfig[]>([]);

export const officesStore = createStore<SelectOptionConfig[]>([]);

export const typesStore = createStore<SelectOptionConfig[]>([]);

export const majorsStore = createStore<SelectOptionConfig[]>([]);
