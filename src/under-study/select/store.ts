export interface SelectOptionConfig {
  value: string;
  name: string;
}

export interface Store<T = unknown> {
  state: T;
  setState: (newState: T) => void;
}

export const createStore = <T = unknown>(initialState: T): Store<T> => {
  const store = {
    state: initialState,
    setState: (newState: T): void => {
      store.state = newState;
    },
  };

  return store;
};

export const areasStore = createStore<SelectOptionConfig[]>([]);

export const courseOfficesStore = createStore<SelectOptionConfig[]>([]);

export const courseTypesStore = createStore<SelectOptionConfig[]>([]);

export const majorsStore = createStore<SelectOptionConfig[]>([]);

// export const coursesStore = createStore<Course[]>([]);
