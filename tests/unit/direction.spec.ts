import { describe, expect, it } from "vitest";
import { resolveParticipants } from "@/app/(dashboard)/_lib/direction";

const VIEWER = "11111111-1111-1111-1111-111111111111";
const FRIEND = "22222222-2222-2222-2222-222222222222";

describe("resolveParticipants", () => {
  it("makes the viewer the creditor when the friend owes them", () => {
    expect(resolveParticipants(VIEWER, FRIEND, "owed_to_me")).toEqual({
      creditorId: VIEWER,
      debtorId: FRIEND,
    });
  });

  it("makes the friend the creditor when the viewer owes them", () => {
    expect(resolveParticipants(VIEWER, FRIEND, "i_owe")).toEqual({
      creditorId: FRIEND,
      debtorId: VIEWER,
    });
  });
});
