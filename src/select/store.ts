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

export interface CourseInfo {
  /** 名称 */
  name: string;
  /** 开课单位 */
  office: string;
  /** 类别 */
  type: string;
  /** 学分 */
  point: number;
  /** 容量 */
  capacity: number;
  /** 任课教师 */
  teacher: string;
  /** 上课周次 */
  week: string;
  /** 上课时间 */
  time: string;
  /** 上课地点 */
  place: string;
  /** 课 ID */
  cid: string;
  /** 课程 ID */
  id: string;

  /** 考试时间 */
  examTime: string;
  /** 周次类型 */
  weekType: string;
  /** 班级名称 */
  className: string;
}

export const underCoursesStore = createStore<CourseInfo[]>([]);
export const postCoursesStore = createStore<CourseInfo[]>([]);

export const underCoursesOfficeStore = createStore<string[]>([]);
export const postCoursesOfficeStore = createStore<string[]>([]);

export const gradesStore = createStore<string[]>([]);

export interface MajorInfo {
  /** 名称 */
  name: string;
  /** 编号 */
  id: string;
}

export const underMajorsStore = createStore<MajorInfo[]>([]);
export const postMajorsStore = createStore<MajorInfo[]>([]);

export interface ParamsStore {
  jx0502id: string;
  jx0502zbid: string;
}

export const underParamsStore = createStore<ParamsStore | null>(null);

export const postParamsStore = createStore<ParamsStore | null>(null);
