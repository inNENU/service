/** 研究生招生目录解析器单元测试（不依赖外部服务） */
import { describe, expect, it } from "vitest";

import type { GradEnrollPlanRow } from "../../src/enroll/grad-plan-parser.js";
import { parseGradEnrollPlan } from "../../src/enroll/grad-plan-parser.js";

describe("研究生招生目录解析 parseGradEnrollPlan", () => {
  it("将分组行与明细行解析为 专业 → 研究方向 结构", () => {
    const rows: GradEnrollPlanRow[] = [
      {
        isMajorRow: true,
        title: "040101 教育学原理【全日制学术学位】",
        groupKey: "040101_1_21",
      },
      {
        isMajorRow: false,
        title: "01教育学原理",
        groupKey: "040101_1_21",
        code: "01",
        name: "教育学原理",
        count: 8,
        recommendCount: 11,
        subjects: "①101思想政治理论,②201英语（一）,③311教育学专业基础,④--无",
        note: "复试科目：教育学原理,不招同等学力考生",
      },
      {
        isMajorRow: true,
        title: "045101 教育管理【非全日制专业学位】",
        groupKey: "045101_2_21",
      },
      {
        isMajorRow: false,
        title: "00不区分研究方向",
        groupKey: "045101_2_21",
        code: "00",
        name: "不区分研究方向",
        count: 30,
        recommendCount: 0,
        subjects: "①199管理类综合能力,②204英语（二）",
        note: "复试科目：教育管理学",
      },
    ];

    const majors = parseGradEnrollPlan(rows);

    expect(majors).toHaveLength(2);

    expect(majors[0]).toStrictEqual({
      name: "教育学原理",
      code: "040101",
      type: "全日制学术学位",
      directions: [
        {
          name: "教育学原理",
          code: "01",
          count: 8,
          recommendCount: 11,
          subjects: "①101思想政治理论,②201英语（一）,③311教育学专业基础,④--无",
          note: "复试科目：教育学原理,不招同等学力考生",
        },
      ],
    });

    expect(majors[1]).toStrictEqual({
      name: "教育管理",
      code: "045101",
      type: "非全日制专业学位",
      directions: [
        {
          name: "不区分研究方向",
          code: "00",
          count: 30,
          recommendCount: 0,
          subjects: "①199管理类综合能力,②204英语（二）",
          note: "复试科目：教育管理学",
        },
      ],
    });
  });

  it("缺少分组行时，明细行被丢弃", () => {
    const majors = parseGradEnrollPlan([
      {
        isMajorRow: false,
        title: "01无分组方向",
        groupKey: "x_1_21",
        code: "01",
        name: "无分组方向",
      },
    ]);

    expect(majors).toStrictEqual([]);
  });

  it("未匹配专业格式的行以整行作为专业名兜底", () => {
    const majors = parseGradEnrollPlan([
      {
        isMajorRow: true,
        title: "自定义专业",
        groupKey: "x_1_21",
      },
    ]);

    expect(majors).toHaveLength(1);
    expect(majors[0]).toStrictEqual({
      name: "自定义专业",
      code: "",
      type: "",
      directions: [],
    });
  });

  it("缺失字段的明细行使用默认值", () => {
    const majors = parseGradEnrollPlan([
      { isMajorRow: true, title: "040101 教育学原理【全日制学术学位】", groupKey: "040101_1_21" },
      {
        isMajorRow: false,
        title: "01教育学原理",
        groupKey: "040101_1_21",
      },
    ]);

    expect(majors[0].directions).toStrictEqual([
      {
        name: "01教育学原理", // 方向名缺失时用整行文本兜底
        code: "",
        count: 0,
        recommendCount: 0,
        subjects: "",
        note: "",
      },
    ]);
  });
});
