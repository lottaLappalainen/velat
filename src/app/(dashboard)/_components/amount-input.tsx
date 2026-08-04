"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { evaluateAmountExpression, isOperatorChar } from "@/lib/calc";

// A MobilePay-style calculator for the Amount field: instead of typing a
// single number, you can chain "12,50+8×2" and the running total is what
// actually gets submitted (see debt-form.tsx / add-transaction-form.tsx —
// they call evaluateAmountExpression(value) on submit, not Number(value)).
// A custom on-screen keypad, not the OS keyboard, is deliberate: no mobile
// numeric keypad exposes +/×/÷, only a real calculator UI does.
//
// Folded by default — most transactions are a single plain number, so the
// keypad would just be dead space most of the time. Tapping the display
// (or the chevron) unfolds it; the value/total keep working either way,
// since typing an expression only happens through the keypad, not the OS
// keyboard, so there's nothing to lose by hiding it.
export function AmountInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const total = evaluateAmountExpression(value);

  function pressDigit(digit: string) {
    onChange(value + digit);
  }

  function pressDecimal() {
    let i = value.length - 1;
    while (i >= 0 && !isOperatorChar(value[i])) i--;
    const segment = value.slice(i + 1);
    if (segment.includes(",")) return; // this number already has a decimal point
    onChange(value + (segment === "" ? "0," : ","));
  }

  function pressOperator(op: string) {
    if (value === "") return; // can't start an expression with an operator
    const last = value[value.length - 1];
    onChange(isOperatorChar(last) ? value.slice(0, -1) + op : value + op);
  }

  function pressBackspace() {
    onChange(value.slice(0, -1));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          className="min-w-0 flex-1 text-left"
        >
          <div className="truncate text-sm text-muted-foreground">{value || "0"}</div>
          <div className="text-2xl font-semibold tabular-nums text-foreground">
            {total !== null ? formatMoney(total) : "…"}
          </div>
        </button>
        {value !== "" && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 text-xs font-medium text-muted-foreground underline underline-offset-2"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Collapse calculator" : "Expand calculator"}
          className="shrink-0"
        >
          <ChevronDown
            className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")}
          />
        </button>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-4 gap-2 pt-1">
            <CalcButton onClick={() => pressDigit("7")}>7</CalcButton>
            <CalcButton onClick={() => pressDigit("8")}>8</CalcButton>
            <CalcButton onClick={() => pressDigit("9")}>9</CalcButton>
            <CalcButton variant="operator" onClick={() => pressOperator("÷")}>÷</CalcButton>

            <CalcButton onClick={() => pressDigit("4")}>4</CalcButton>
            <CalcButton onClick={() => pressDigit("5")}>5</CalcButton>
            <CalcButton onClick={() => pressDigit("6")}>6</CalcButton>
            <CalcButton variant="operator" onClick={() => pressOperator("×")}>×</CalcButton>

            <CalcButton onClick={() => pressDigit("1")}>1</CalcButton>
            <CalcButton onClick={() => pressDigit("2")}>2</CalcButton>
            <CalcButton onClick={() => pressDigit("3")}>3</CalcButton>
            <CalcButton variant="operator" onClick={() => pressOperator("−")}>−</CalcButton>

            <CalcButton onClick={pressBackspace} ariaLabel="Backspace">
              ⌫
            </CalcButton>
            <CalcButton onClick={() => pressDigit("0")}>0</CalcButton>
            <CalcButton onClick={pressDecimal} ariaLabel="Decimal point">
              ,
            </CalcButton>
            <CalcButton variant="operator" onClick={() => pressOperator("+")}>+</CalcButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalcButton({
  children,
  onClick,
  variant = "digit",
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "digit" | "operator";
  ariaLabel?: string;
}) {
  return (
    <Button
      type="button"
      variant={variant === "operator" ? "accent" : "secondary"}
      onClick={onClick}
      aria-label={ariaLabel}
      className="h-12 text-lg"
    >
      {children}
    </Button>
  );
}
