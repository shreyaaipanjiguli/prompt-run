export const STARTING_FUNDS = 10_000;
export const CHALLENGE_DAYS = 30;
/** No-history fallback: evenly allocate the challenge's starting funds across 30 days. */
export const BASELINE_DAILY_SPENDING = STARTING_FUNDS / CHALLENGE_DAYS;

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
  savingsGoalTarget?: number;
};
export type RiskLevel = "Low" | "Medium" | "High" | "Insufficient data";

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
  const averageDailySpend = completedDays > 0 ? roundMoney(completedDaySpend / completedDays) : null;
  const forecastDailySpendRate = averageDailySpend ?? BASELINE_DAILY_SPENDING;
  const forecastBasis = averageDailySpend === null ? "baseline" as const : "observed" as const;
  const fullFutureDays = Math.max(0, daysRemaining - (isComplete ? 0 : 1));
  const currentDaySpend = isComplete ? 0 : sumAmounts(input.expenses, (entry) => entry.day === currentDay);
  // The available balance already subtracts today's paid spending. Forecast only
  // the unspent part of today's daily rate, then each full day after today.
  const expectedCurrentDaySpend = isComplete
    ? 0
    : roundMoney(Math.max(0, forecastDailySpendRate - currentDaySpend));
  const expectedRemainingSpend = roundMoney(
    expectedCurrentDaySpend + forecastDailySpendRate * fullFutureDays,
  );
  const projectedAvailable = roundMoney(availableToSpend - expectedRemainingSpend);
  const savingsGoalTarget = Math.max(0, input.savingsGoalTarget ?? 0);
  const savingsGoalGap = Math.max(0, savingsGoalTarget - input.reservedSavings);
  const savingsGoalReachable = availableToSpend >= savingsGoalGap;
  const { risk, riskReason } = evaluateFinancialRisk({
    cashBalance,
    availableToSpend,
    reservedSavings: input.reservedSavings,
    reservedCharges,
    projectedAvailable,
    completedDays,
    savingsGoalReachable,
    savingsGoalGap,
  });
  const health = availableToSpend < 0
    ? "Plan shortfall"
    : forecastBasis === "baseline"
      ? projectedAvailable < 0 ? "Baseline shortfall estimate" : projectedAvailable < STARTING_FUNDS * 0.1 ? "Baseline buffer estimate" : "Baseline estimate"
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
    forecastDailySpendRate,
    forecastBasis,
    currentDaySpend,
    expectedCurrentDaySpend,
    expectedRemainingSpend,
    projectedAvailable,
    risk,
    riskReason,
    savingsGoalTarget,
    savingsGoalGap,
    savingsGoalReachable,
    unexpectedExpenseBuffer: availableToSpend,
    health,
    budgetUsedPercent: STARTING_FUNDS + incomeReceived > 0
      ? Math.max(0, Math.min(100, (paidExpenses / (STARTING_FUNDS + incomeReceived)) * 100))
      : 0,
    dailyAllowance: daysRemaining > 0 ? availableToSpend / daysRemaining : 0,
  };
}

export function evaluateFinancialRisk(input: {
  cashBalance: number;
  availableToSpend: number;
  reservedSavings: number;
  reservedCharges: number;
  projectedAvailable: number;
  completedDays: number;
  savingsGoalReachable: boolean;
  savingsGoalGap: number;
}): { risk: RiskLevel; riskReason: string } {
  if (input.cashBalance < 0) {
    return { risk: "High", riskReason: `Cash would be below zero by ${formatRiskMoney(Math.abs(input.cashBalance))}.` };
  }
  const plannedShortfall = Math.max(0, input.reservedSavings + input.reservedCharges - input.cashBalance);
  const criticalAvailableThreshold = STARTING_FUNDS * 0.05;
  if (plannedShortfall > 0) {
    return { risk: "High", riskReason: `Cash is ${formatRiskMoney(plannedShortfall)} short of savings and unpaid bills.` };
  }
  if (input.availableToSpend <= criticalAvailableThreshold) {
    return { risk: "High", riskReason: `Only ${formatRiskMoney(input.availableToSpend)} is available for unplanned costs, at or below 5% of starting funds.` };
  }
  if (input.projectedAvailable < 0) {
    const basis = input.completedDays < 1 ? "baseline estimate" : "observed-spending forecast";
    return { risk: "High", riskReason: `The ${basis} is ${formatRiskMoney(Math.abs(input.projectedAvailable))} below zero; future spending may differ, but the current estimate indicates a shortfall.` };
  }
  if (!input.savingsGoalReachable) {
    return { risk: "Medium", riskReason: `Available funds are ${formatRiskMoney(input.savingsGoalGap - input.availableToSpend)} short of the remaining savings target.` };
  }
  const belowStartingBuffer = input.projectedAvailable < STARTING_FUNDS * 0.1;
  const belowAvailableBuffer = input.projectedAvailable < input.availableToSpend * 0.2;
  const limitedForecastBuffer = belowStartingBuffer || belowAvailableBuffer;
  if (limitedForecastBuffer) {
    const triggers = [
      belowStartingBuffer ? `less than 10% of starting funds (${formatRiskMoney(STARTING_FUNDS * 0.1)})` : null,
      belowAvailableBuffer ? "less than 20% of current available-to-spend" : null,
    ].filter((reason): reason is string => reason !== null).join(" and ");
    const basis = input.completedDays < 1 ? "baseline estimate" : "observed-spending forecast";
    return { risk: "Medium", riskReason: `The ${basis} leaves ${formatRiskMoney(input.projectedAvailable)} after planned bills and savings, a limited buffer because it is ${triggers}.` };
  }
  const basis = input.completedDays < 1 ? "baseline estimate" : "observed-spending forecast";
  return { risk: "Low", riskReason: `The ${basis} leaves ${formatRiskMoney(input.projectedAvailable)} after planned bills and savings, above the limited-buffer thresholds.` };
}

function formatRiskMoney(amount: number) {
  const sign = amount < 0 ? "\u2212" : "";
  return `${sign}\u20B9${Math.abs(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
