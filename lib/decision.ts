import { calculateBudget, type BudgetInput, type FinancialEntry } from "./budget.ts";
import type { LedgerState } from "./ledger.ts";

export type DecisionScenario = {
  id: "buy" | "skip" | "alternative" | "unexpected";
  label: string;
  amount: number;
  budget: ReturnType<typeof calculateBudget>;
  commitmentsCovered: boolean;
  savingsTargetReachable: boolean;
  affordable: boolean;
  shortfall: number;
};

export function simulateExpense(
  state: LedgerState,
  options: { id: DecisionScenario["id"]; amount: number; name: string; category: string; day: number; entryId: number; goalTarget: number },
): DecisionScenario {
  const entry: FinancialEntry = {
    id: options.entryId,
    name: options.name,
    amount: options.amount,
    category: options.category,
    day: options.day,
  };
  const currentBudget = calculateBudget({ ...state, savingsGoalTarget: options.goalTarget });
  const budget = calculateBudget({ ...state, expenses: [...state.expenses, entry], savingsGoalTarget: options.goalTarget });
  return {
    id: options.id,
    label: options.id === "alternative" ? "Alternative" : options.id === "unexpected" ? "Unexpected expense" : "Buy",
    amount: options.amount,
    budget,
    commitmentsCovered: budget.cashBalance >= budget.reservedSavings + budget.reservedCharges,
    savingsTargetReachable: budget.savingsGoalReachable,
    affordable: options.amount <= currentBudget.availableToSpend,
    shortfall: Math.max(0, options.amount - currentBudget.availableToSpend),
  };
}

export function simulateSkip(state: BudgetInput, goalTarget: number): DecisionScenario {
  const budget = calculateBudget({ ...state, savingsGoalTarget: goalTarget });
  return {
    id: "skip",
    label: "Skip",
    amount: 0,
    budget,
    commitmentsCovered: budget.cashBalance >= budget.reservedSavings + budget.reservedCharges,
    savingsTargetReachable: budget.savingsGoalReachable,
    affordable: true,
    shortfall: 0,
  };
}
