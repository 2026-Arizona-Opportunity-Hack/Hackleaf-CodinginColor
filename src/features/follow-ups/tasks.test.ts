import { expect, it } from "vitest";
import { demoDonors, demoFollowUps, demoMembers } from "@/lib/demo/data";
import { makeTask, orderedTasks, phoenixDate, taskGroup } from "./tasks";

it("uses Phoenix day across UTC midnight and daylight-saving boundaries", () => {
  expect(phoenixDate(new Date("2026-11-15T06:59:59Z"))).toBe("2026-11-14");
  expect(phoenixDate(new Date("2026-11-15T07:00:00Z"))).toBe("2026-11-15");
  expect(phoenixDate(new Date("2026-03-08T07:00:00Z"))).toBe("2026-03-08");
});

it("sorts oldest overdue first and keeps completion separate", () => {
  const task = demoFollowUps[0];
  const tasks = [{ ...task, id: "b", dueOn: "2026-11-13" }, { ...task, id: "a", dueOn: "2026-11-12" }];
  expect(orderedTasks(tasks).map((item) => item.id)).toEqual(["a", "b"]);
  expect(tasks[0].id).toBe("b");
  expect(taskGroup(tasks[0], "2026-11-14")).toBe("Overdue");
  expect(taskGroup(task, "2026-11-14")).toBe("Today");
  expect(taskGroup(task, "2026-11-13")).toBe("Upcoming");
  expect(taskGroup({ ...task, status: "completed" }, "2026-11-15")).toBe("Completed");
});

it("validates calendar dates, text and owner membership without accepting privilege fields", () => {
  const input = { donorId: demoDonors[0].id, title: " Call ", dueOn: "2026-11-14", kind: "check_in" };
  expect(makeTask(input, demoDonors, demoMembers, "task")).toMatchObject({ title: "Call", ownerId: demoDonors[0].ownerId });
  for (const bad of [{ ...input, dueOn: "2026-02-30" }, { ...input, title: " " }, { ...input, ownerId: "other" }, { ...input, donorId: demoMembers[0].id }]) {
    expect(() => makeTask(bad, demoDonors, demoMembers, "task")).toThrow();
  }
  expect(() => makeTask(input, demoDonors, [], "task")).toThrow();
});
