import { afterEach, describe, expect, it } from "vitest";

import { previousWeek, weekOf, weekRange } from "./week.ts";

const originalTimeZone = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTimeZone;
});

describe("weekOf", () => {
  it("같은 주에 쓴 Note는 요일이 달라도 같은 주로 묶인다", () => {
    expect(weekOf("2026-08-10")).toBe("2026-W33");
    expect(weekOf("2026-08-14")).toBe("2026-W33");
    expect(weekOf("2026-08-16")).toBe("2026-W33");
  });

  it("일요일 다음 날은 다음 주다 — 주는 월요일에 시작한다", () => {
    expect(weekOf("2026-08-16")).toBe("2026-W33");
    expect(weekOf("2026-08-17")).toBe("2026-W34");
  });

  it("해를 넘는 주는 목요일이 속한 해의 주가 된다", () => {
    expect(weekOf("2025-12-29")).toBe("2026-W01");
    expect(weekOf("2026-01-01")).toBe("2026-W01");
    expect(weekOf("2026-01-04")).toBe("2026-W01");
    expect(weekOf("2025-12-28")).toBe("2025-W52");
  });

  it("타임존이 UTC보다 뒤에 있어도 같은 주로 묶인다", () => {
    process.env.TZ = "Pacific/Midway";

    expect(weekOf("2026-08-10")).toBe("2026-W33");
    expect(weekOf("2026-01-01")).toBe("2026-W01");
  });

  it("타임존이 UTC보다 앞에 있어도 같은 주로 묶인다", () => {
    process.env.TZ = "Pacific/Kiritimati";

    expect(weekOf("2026-08-16")).toBe("2026-W33");
    expect(weekOf("2025-12-28")).toBe("2025-W52");
  });
});

describe("weekRange", () => {
  it("주 식별자를 월요일부터 일요일까지의 날짜로 편다", () => {
    expect(weekRange("2026-W33")).toEqual({ start: "2026-08-10", end: "2026-08-16" });
  });

  it("해를 넘는 주는 지난 해에서 시작한다", () => {
    expect(weekRange("2026-W01")).toEqual({ start: "2025-12-29", end: "2026-01-04" });
  });

  it("타임존이 달라도 같은 날짜가 나온다", () => {
    process.env.TZ = "Pacific/Midway";

    expect(weekRange("2026-W33")).toEqual({ start: "2026-08-10", end: "2026-08-16" });
  });

  it("형식이 아닌 값과 달력에 없는 주는 예외다", () => {
    expect(() => weekRange("2026-33")).toThrow();
    expect(() => weekRange("2026-W99")).toThrow();
  });
});

describe("previousWeek", () => {
  it("직전 주를 돌려준다", () => {
    expect(previousWeek("2026-W33")).toBe("2026-W32");
  });

  it("해의 첫 주에서는 지난 해의 마지막 주로 넘어간다", () => {
    expect(previousWeek("2026-W01")).toBe("2025-W52");
  });
});
