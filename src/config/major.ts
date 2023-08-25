const majorConfig: [string, string][] = [
  // 数学与统计学院
  ["数学与应用数学（公费师范）", "170111"],
  ["数学类", "170910"],
  ["数学与应用数学（优师专项）", "170112"],
  ["数学与应用数学", "170110"],
  ["统计学", "071400"],
  ["应用数学", "070104"],
  ["运筹学与控制论", "070105"],

  // 文学院
  ["汉语言文学（公费师范）", "164111"],
  ["汉语言文学（优师专项）", "164112"],
  ["汉语言文学", "164110"],

  // 心理学院
  ["心理学（公费师范）", "158141"],
  ["心理学", "158140"],
  ["应用心理", "045400"],
  ["心理健康教育", "045116"],

  // 历史文化学院
  ["历史学", "166110"],
  ["历史学（公费师范）", "166111"],

  // 教育学部
  ["小学教育", "045115"],
  ["小学教育（公费师范）", "158131"],
  ["教育学类", "158010"],
  ["学前教育（公费师范）", "158121"],
  ["教育学原理", "040101"],
  ["课程与教学论", "040102"],

  // 马克思主义学部
  ["马克思主义理论类", "179910"],
  ["马克思主义理论类（预科）", "179911"],

  // 物理学院
  ["物理学（公费师范）", "173111"],
  ["物理学（优师专项）", "173112"],
  ["物理学类", "173910"],
  ["物理学", "173110"],
  ["理论物理", "070201"],
  ["电子信息", "085400"],
  ["材料学", "077302"],

  // 化学学院
  ["化学（公费师范）", "174111"],
  ["化学（优师专项）", "174113"],
  ["化学", "174110"],
  ["物理化学", "070304"],
  ["学科教学（化学）", "045106"],

  // 生命科学学院
  ["生物科学类", "175910"],
  ["生物科学", "175110"],

  // 地理科学学院
  ["地理科学（公费师范）", "234111"],
  ["地理科学类", "234910"],
  ["地理科学", "234110"],
  ["地理信息科学", "234140"],
  ["人文地理与城乡规划", "234130"],

  // 体育学院
  ["体育教育（公费师范）", "177111"],
  ["体育教育", "177110"],
  ["冰雪运动", "177140"],
  ["运动训练", "177120"],

  // 经济与管理学院
  ["经济学类", "162010"],
  ["会计学（中美合作）", "163141"],
  ["金融学", "162150"],
  ["人力资源管理", "163120"],

  // 音乐学院
  ["音乐学（钢琴，师范）", "168126"],
  ["音乐学（器乐）", "168115"],
  ["音乐学（声乐，师范）", "168127"],
  ["舞蹈编导", "168120"],

  // 美术学院
  ["设计学类", "169030"],
  ["美术学", "169110"],
  ["服装与服饰设计", "169160"],
  ["艺术设计", "135108"],

  // 政法学院
  ["政治学类", "161010"],
  ["思想政治教育（公费师范）", "161121"],
  ["思想政治教育（优师专项）", "161123"],
  ["法学", "161140"],

  // 信息科学与技术学院
  ["计算机类", "252010"],
  ["计算机类（预科）", "252011"],
  ["计算机科学与技术", "077500"],
  ["计算机科学与技术（中美合作）", "171121"],
  ["教育技术学（公费师范）", "171111"],
  ["智能科学与技术", "252160"],

  // 环境学院
  ["环境科学与工程类", "235010"],

  // 传媒科学学院
  ["新闻传播学类", "178010"],
  ["广播电视编导", "178130"],
  ["数字媒体技术", "178160"],
  ["播音与主持艺术", "178140"],

  // 外国语学院 本部
  ["英语（公费师范）", "167111"],
  ["英语", "167110"],
  ["英语（科技交流）", "1066"],
  ["英语语言文学", "050201"],
  ["英语口译", "055102"],

  // 外国语学院 净月
  ["俄语", "167120"],
  ["德语", "167180"],
  ["日语", "167130"],
  ["商务英语", "167140"],
];

export const major2code = new Map<string, string>(majorConfig);

export const code2major = new Map<string, string>(
  majorConfig.map(([major, code]) => [code, major]),
);
