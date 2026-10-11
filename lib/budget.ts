export const STARTING_FUNDS = 10_000;
export const CHALLENGE_DAYS = 30;

export type FinancialEntry = { id: number; name: string; amount: number; day: number; category: string };
export type PlannedCharge = { id: number; name: string; amount: number; dueDay: number };
export type RecurringCharge = PlannedCharge & { intervalDays: number };
export type BudgetInput = {
  day: number;
  income: FinancialEntry[];
  expenses: FinancialEntry[];
  commitments: PlannedCharge[];
  subscriptions: RecurringCharge[];
  reservedSavings: number;
};
export type RiskLevel = "Low" | "Medium" | "High";

export function parsePositiveAmount(raw: string): number | null {
  if (!raw.trim()) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const paise = Math.round((amount + Number.EPSILON) * 100);
  return Number.isSafeInteger(paise) && paise > 0 ? paise / 100 : null;
}

function sumAmounts<T extends { amount: number }>(items: T[], include: (item: T) => boolean = () => true) {
  const paise = items.reduce((sum, item) => sum + (include(item) ? Math.round((item.amount + Number.EPSILON) * 100) : 0), 0);
  return paise / 100;
}

function toPaise(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100);
}

function roundMoney(amount: number) {
  return toPaise(amount) / 100;
}

export function calculateBudget(input: BudgetInput) {
  const incomeReceived = sumAmounts(input.income);
  const paidExpenses = sumAmounts(input.expenses);
  const cashBalance = roundMoney(STARTING_FUNDS + incomeReceived - paidExpenses);
  const pendingCommitments = sumAmounts(input.commitments);
  const pendingSubscriptions = input.subscriptions.reduce((sum, item) => {
    if (item.dueDay > CHALLENGE_DAYS || !Number.isInteger(item.intervalDays) || item.intervalDays < 1) return sum;
    const occurrences = Math.floor((CHALLENGE_DAYS - item.dueDay) / item.intervalDays) + 1;
    return sum + toPaise(item.amount) * occurrences;
  }, 0) / 100;
  const reservedCharges = roundMoney(pendingCommitments + pendingSubscriptions);
  const availableToSpend = roundMoney(cashBalance - input.reservedSavings - reservedCharges);
  const requestedDay = Number.isFinite(input.day) ? Math.floor(input.day) : 1;
  const currentDay = Math.max(1, Math.min(CHALLENGE_DAYS + 1, requestedDay));
  const isComplete = currentDay > CHALLENGE_DAYS;
  const displayDay = Math.min(currentDay, CHALLENGE_DAYS);
  const completedDays = isComplete ? CHALLENGE_DAYS : currentDay - 1;
  const daysRemaining = CHALLENGE_DAYS - completedDays;
  const progressPercent = (completedDays / CHALLENGE_DAYS) * 100;
  const completedDaySpend = sumAmounts(input.expenses, (entry) => entry.day <= completedDays);
  const averageDailySpend = completedDays > 0 ? completedDaySpend / completedDays : null;
  const fullFutureDays = Math.max(0, daysRemaining - (isComplete ? 0 : 1));
  const projectedAvailable = averageDailySpend === null
    ? null
    : roundMoney(availableToSpend - averageDailySpend * fullFutureDays);
  const risk: RiskLevel = projectedAvailable === null
    ? "Medium"
    : projectedAvailable < 0
      ? "High"
      : availableToSpend > 0 && projectedAvailable >= availableToSpend * 0.2 ? "Low" : "Medium";
  const health = projectedAvailable === null
    ? "Building history"
    : projectedAvailable < 0
      ? "Shortfall forecast"
      : projectedAvailable < STARTING_FUNDS * 0.1 ? "Watch your pace" : "On track";

  return {
    incomeReceived,
    paidExpenses,
    cashBalance,
    reservedSavings: input.reservedSavings,
    pendingCommitments,
    pendingSubscriptions,
    reservedCharges,
    availableToSpend,
    currentDay,
    displayDay,
    isComplete,
    completedDays,
    daysRemaining,
    progressPercent,
    fullFutureDays,
    completedDaySpend,
    averageDailySpend,
    projectedAvailable,
    risk,
    health,
    budgetUsedPercent: STARTING_FUNDS + incomeReceived > 0
      ? Math.max(0, Math.min(100, (paidExpenses / (STARTING_FUNDS + incomeReceived)) * 100))
      : 0,
    dailyAllowance: daysRemaining > 0 ? availableToSpend / daysRemaining : 0,
  };
}
