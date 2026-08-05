import { describe, expect, it } from "vitest";
import {
  formatFinnishDateTime,
  formatMoney,
  getBalanceTone,
  getViewerRelativeBalance,
  type BalanceRow,
} from "@/lib/format";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

describe("formatMoney", () => {
  it("formats a positive amount as Finnish currency", () => {
    const result = formatMoney(12.5);
    expect(result).toContain("12,50");
    expect(result).toContain("€");
  });

  it("formats zero", () => {
    const result = formatMoney(0);
    expect(result).toContain("0,00");
  });
});

describe("formatFinnishDateTime", () => {
  it("formats a Date in Europe/Helsinki, day-first order", () => {
    // 2026-08-04T11:30:00Z is 14:30 in Helsinki (UTC+3 in August, DST)
    const result = formatFinnishDateTime(new Date("2026-08-04T11:30:00Z"));
    expect(result).toContain("04.08.2026");
    expect(result).toContain("14.30");
  });

  it("accepts an ISO date string as well as a Date", () => {
    const result = formatFinnishDateTime("2026-08-04T11:30:00Z");
    expect(result).toContain("04.08.2026");
    expect(result).toContain("14.30");
  });
});

describe("getViewerRelativeBalance", () => {
  it("is settled when there is no balance row", () => {
    expect(getViewerRelativeBalance(USER_A, null)).toEqual({ status: "settled" });
  });

  it("is settled when net_amount is zero", () => {
    const balance: BalanceRow = { user_a: USER_A, user_b: USER_B, net_amount: 0 };
    expect(getViewerRelativeBalance(USER_A, balance)).toEqual({ status: "settled" });
  });

  it("shows the viewer as owed when they are user_a and net_amount is positive", () => {
    const balance: BalanceRow = { user_a: USER_A, user_b: USER_B, net_amount: 12.5 };
    expect(getViewerRelativeBalance(USER_A, balance)).toEqual({ status: "owed_to_viewer", amount: 12.5 });
  });

  it("shows the counterparty as owed when the viewer is user_a and net_amount is negative", () => {
    const balance: BalanceRow = { user_a: USER_A, user_b: USER_B, net_amount: -12.5 };
    expect(getViewerRelativeBalance(USER_A, balance)).toEqual({ status: "owed_by_viewer", amount: 12.5 });
  });

  it("flips the sign when the viewer is user_b instead of user_a", () => {
    const balance: BalanceRow = { user_a: USER_A, user_b: USER_B, net_amount: 12.5 };
    // user_a is owed (net_amount > 0), so from user_b's (the viewer's) side, the viewer owes.
    expect(getViewerRelativeBalance(USER_B, balance)).toEqual({ status: "owed_by_viewer", amount: 12.5 });
  });

  it("shows user_b as owed when net_amount is negative and viewer is user_b", () => {
    const balance: BalanceRow = { user_a: USER_A, user_b: USER_B, net_amount: -12.5 };
    expect(getViewerRelativeBalance(USER_B, balance)).toEqual({ status: "owed_to_viewer", amount: 12.5 });
  });
});

describe("getBalanceTone", () => {
  it("maps owed_to_viewer to success", () => {
    expect(getBalanceTone("owed_to_viewer")).toBe("success");
  });

  it("maps owed_by_viewer to destructive", () => {
    expect(getBalanceTone("owed_by_viewer")).toBe("destructive");
  });

  it("maps settled to muted", () => {
    expect(getBalanceTone("settled")).toBe("muted");
  });
});
