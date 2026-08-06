import { describe, expect, it } from "vitest";
import { evaluateAmountExpression, isOperatorChar } from "@/lib/calc";

describe("isOperatorChar", () => {
  it.each([["+"], ["-"], ["−"], ["×"], ["÷"]])("treats %s as an operator", (char) => {
    expect(isOperatorChar(char)).toBe(true);
  });

  it.each([["5"], [","], ["."], [" "], ["a"]])("does not treat %s as an operator", (char) => {
    expect(isOperatorChar(char)).toBe(false);
  });
});

describe("evaluateAmountExpression", () => {
  it.each([
    // [input, expected]
    ["12,50+8×2", 28.5],
    ["2+3", 5],
    ["10-4", 6],
    ["2+3×4", 14],
    ["10-2×3", 4],
    ["12,5+2", 14.5],
    ["6÷2", 3],
    ["3×4", 12],
    ["5-2", 3],
    ["5−2", 3], // unicode minus sign, as displayed by the keypad
    ["0,1+0,2", 0.3], // floating-point rounding
    ["12,50+8×2-1÷2", 28], // mixed precedence
  ])("evaluates %s to %s", (input, expected) => {
    expect(evaluateAmountExpression(input)).toBe(expected);
  });

  it.each([
    ["", "empty string"],
    ["   ", "whitespace only"],
    ["12+", "trailing operator"],
    ["5×", "trailing operator"],
    ["+5", "leading operator"],
    ["×5", "leading operator"],
    ["5÷0", "division by zero"],
    ["5/0", "division by zero (plain slash)"],
    ["5++3", "consecutive operators"],
    ["12+a", "stray unrecognized character"],
    ["12$3", "stray unrecognized character"],
  ])("returns null for %s (%s)", (input) => {
    expect(evaluateAmountExpression(input)).toBeNull();
  });
});
