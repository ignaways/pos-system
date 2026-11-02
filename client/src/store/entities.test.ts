import { describe, expect, it } from "vitest";
import { removeOne, selectAll, setAll, upsertMany } from "./entities";

const a = { id: "a", name: "A" };
const b = { id: "b", name: "B" };

describe("entity tables", () => {
  it("updates in place without changing order", () => {
    const table = upsertMany(setAll([a, b]), [{ id: "a", name: "A2" }]);
    expect(selectAll(table).map((x) => x.name)).toEqual(["A2", "B"]);
  });

  it("prepends new records when asked", () => {
    const table = upsertMany(setAll([a]), [b], "prepend");
    expect(table.ids).toEqual(["b", "a"]);
  });

  it("returns the same table when removing an unknown id", () => {
    const table = setAll([a]);
    expect(removeOne(table, "zzz")).toBe(table);
    expect(removeOne(table, "a").ids).toEqual([]);
  });
});
