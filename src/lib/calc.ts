// Arithmetic evaluator for the amount calculator input (+ - × ÷, standard
// precedence, no parentheses — the on-screen keypad never produces any).
// Deliberately not eval()/Function() — a tiny hand-rolled evaluator instead.

type Token = { type: "number"; value: number } | { type: "op"; value: "+" | "-" | "*" | "/" };

// "−" (U+2212 minus sign) is what the keypad displays, matching the rest of
// the app's typography (see the direction control's "− I owe them"); "-"
// (plain hyphen) is accepted too since it's what a real keyboard types.
const OPERATOR_CHARS = ["+", "-", "−", "×", "÷"] as const;

export function isOperatorChar(char: string): boolean {
  return (OPERATOR_CHARS as readonly string[]).includes(char);
}

function tokenize(raw: string): Token[] | null {
  const cleaned = raw
    .replace(/,/g, ".")
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\s+/g, "");
  if (!cleaned) return null;

  const tokens: Token[] = [];
  const pattern = /\d+(?:\.\d+)?|[+\-*/]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(cleaned)) !== null) {
    if (match.index !== lastIndex) return null; // unrecognized character in the gap
    const value = match[0];
    tokens.push(
      /^[+\-*/]$/.test(value)
        ? { type: "op", value: value as "+" | "-" | "*" | "/" }
        : { type: "number", value: Number(value) }
    );
    lastIndex = pattern.lastIndex;
  }

  return lastIndex === cleaned.length ? tokens : null;
}

// Returns the evaluated total, or null if the expression is empty, malformed
// (trailing operator, stray character, division by zero), or the display
// string a user is still mid-typing (e.g. "12," with nothing after the
// comma yet) — callers should treat null as "not ready to submit."
export function evaluateAmountExpression(raw: string): number | null {
  const tokens = tokenize(raw);
  if (!tokens || tokens.length === 0 || tokens.length % 2 === 0) return null;
  if (tokens[0].type !== "number") return null;
  for (let i = 1; i < tokens.length; i++) {
    const shouldBeOp = i % 2 === 1;
    if (shouldBeOp !== (tokens[i].type === "op")) return null;
  }

  const numbers = tokens.filter((t): t is { type: "number"; value: number } => t.type === "number");
  const ops = tokens.filter((t): t is { type: "op"; value: "+" | "-" | "*" | "/" } => t.type === "op");

  // Pass 1: collapse * and / left to right.
  const collapsedNumbers: number[] = [numbers[0].value];
  const collapsedOps: Array<"+" | "-"> = [];
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i].value;
    const next = numbers[i + 1].value;
    if (op === "*" || op === "/") {
      if (op === "/" && next === 0) return null;
      const last = collapsedNumbers.pop()!;
      collapsedNumbers.push(op === "*" ? last * next : last / next);
    } else {
      collapsedOps.push(op);
      collapsedNumbers.push(next);
    }
  }

  // Pass 2: sum/subtract left to right.
  let result = collapsedNumbers[0];
  for (let i = 0; i < collapsedOps.length; i++) {
    result = collapsedOps[i] === "+" ? result + collapsedNumbers[i + 1] : result - collapsedNumbers[i + 1];
  }

  return Number.isFinite(result) ? Math.round(result * 100) / 100 : null;
}
