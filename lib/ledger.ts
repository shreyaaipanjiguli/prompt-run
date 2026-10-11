import { calculateBudget, CHALLENGE_DAYS, type FinancialEntry, type PlannedCharge } from "./budget.ts";

export type Subscription = PlannedCharge & { intervalDays: number };
export type LedgerState = {
  day: number;
  income: FinancialEntry[];
  expenses: FinancialEntry[];
  commitments: PlannedCharge[];
  subscriptions: Subscription[];
  reservedSavings: number;
  savingsGoal: { name: string; target: number };
};
export type LedgerAction =
  | { type: "income" | "expense" | "simulated-expense"; entry: FinancialEntry }
  | { type: "commitment"; entry: PlannedCharge }
  | { type: "subscription"; entry: Subscription }
  | { type: "pay-commitment"; id: number; paidEntry: FinancialEntry }
  | { type: "pay-subscription"; id: number; paidEntry: FinancialEntry }
  | { type: "remove-commitment" | "remove-subscription"; id: number }
  | { type: "reserve-savings"; amount: number }
  | { type: "release-savings"; amount: number }
  | { type: "savings-goal"; name: string; target: number }
  | { type: "advance-day" };

export const initialLedgerState: LedgerState = {
  day: 1,
  income: [],
  expenses: [],
  commitments: [],
  subscriptions: [],
  reservedSavings: 0,
  savingsGoal: { name: "Emergency buffer", target: 2000 },
};

export function ledgerReducer(state: LedgerState, action: LedgerAction): LedgerState {
  const budget = calculateBudget({ ...state, savingsGoalTarget: state.savingsGoal?.target ?? 0 });
  switch (action.type) {
    case "income":
      if (!isValidEntry(action.entry, state)) return state;
      return { ...state, income: [...state.income, normalizeEntry(action.entry)] };
    case "expense":
      if (!isValidEntry(action.entry, state)) return state;
      return { ...state, expenses: [...state.expenses, normalizeEntry(action.entry)] };
    case "simulated-expense":
      if (!isValidEntry(action.entry, state) || action.entry.amount > budget.availableToSpend) return state;
      return { ...state, expenses: [...state.expenses, normalizeEntry(action.entry)] };
    case "commitment":
      if (!isValidCharge(action.entry.amount, action.entry.dueDay, state.day)) return state;
      return { ...state, commitments: [...state.commitments, normalizeCharge(action.entry)] };
    case "subscription":
      if (!isValidCharge(action.entry.amount, action.entry.dueDay, state.day) || !Number.isInteger(action.entry.intervalDays) || action.entry.intervalDays < 1) return state;
      return { ...state, subscriptions: [...state.subscriptions, normalizeCharge(action.entry)] };
    case "pay-commitment": {
      const item = state.commitments.find((entry) => entry.id === action.id);
      if (!item || item.amount > budget.cashBalance - budget.reservedSavings || action.paidEntry.amount !== item.amount || !isValidEntry(action.paidEntry, state)) return state;
      return { ...state, expenses: [...state.expenses, normalizeEntry({ ...action.paidEntry, name: item.name, amount: item.amount, category: "Commitment" })], commitments: state.commitments.filter((entry) => entry.id !== action.id) };
    }
    case "pay-subscription": {
      const item = state.subscriptions.find((entry) => entry.id === action.id);
      if (!item || item.dueDay > state.day || item.amount > budget.cashBalance - budget.reservedSavings || action.paidEntry.amount !== item.amount || state.day > CHALLENGE_DAYS || !isValidEntry(action.paidEntry, state)) return state;
      const nextDueDay = item.dueDay + item.intervalDays;
      return {
        ...state,
        expenses: [...state.expenses, normalizeEntry({ ...action.paidEntry, name: item.name, amount: item.amount, category: "Subscription" })],
        subscriptions: state.subscriptions.map((entry) => entry.id === item.id ? { ...entry, dueDay: nextDueDay } : entry),
      };
    }
    case "remove-commitment":
      return { ...state, commitments: state.commitments.filter((entry) => entry.id !== action.id) };
    case "remove-subscription":
      return { ...state, subscriptions: state.subscriptions.filter((entry) => entry.id !== action.id) };
    case "reserve-savings":
      if (!isPositiveFinite(action.amount) || action.amount > budget.availableToSpend) return state;
      return { ...state, reservedSavings: (toPaise(state.reservedSavings) + toPaise(action.amount)) / 100 };
    case "release-savings":
      if (!isPositiveFinite(action.amount) || action.amount > state.reservedSavings) return state;
      return { ...state, reservedSavings: (toPaise(state.reservedSavings) - toPaise(action.amount)) / 100 };
    case "savings-goal":
      if (!Number.isFinite(action.target) || action.target < 0 || !Number.isSafeInteger(toPaise(action.target))) return state;
      return { ...state, savingsGoal: { name: action.name.trim(), target: toPaise(action.target) / 100 } };
    case "advance-day":
      return state.day <= CHALLENGE_DAYS ? { ...state, day: state.day + 1 } : state;
    default:
      return state;
  }
}

function isPositiveFinite(amount: number) {
  const paise = toPaise(amount);
  return Number.isSafeInteger(paise) && paise > 0;
}

function isValidEntry(entry: FinancialEntry, state: LedgerState) {
  const duplicateId = [...state.income, ...state.expenses].some((existing) => existing.id === entry.id);
  return isPositiveFinite(entry.amount) && Boolean(entry.name.trim()) && entry.day === state.day && state.day <= CHALLENGE_DAYS && !duplicateId;
}

function isValidCharge(amount: number, dueDay: number, currentDay: number) {
  return isPositiveFinite(amount) && Number.isInteger(dueDay) && dueDay >= currentDay && dueDay <= CHALLENGE_DAYS && currentDay <= CHALLENGE_DAYS;
}

function toPaise(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100);
}

function normalizeEntry(entry: FinancialEntry): FinancialEntry {
  return { ...entry, amount: toPaise(entry.amount) / 100 };
}

function normalizeCharge<T extends PlannedCharge>(entry: T): T {
  return { ...entry, amount: toPaise(entry.amount) / 100 };
}
