import assert from "node:assert/strict";
import test from "node:test";
import { BASELINE_DAILY_SPENDING, calculateBudget, parsePositiveAmount, STARTING_FUNDS } from "../lib/budget.ts";
import { initialLedgerState, ledgerReducer } from "../lib/ledger.ts";

const emptyLedger = {
  day: 1,
  income: [],
  expenses: [],
  commitments: [],
  subscriptions: [],
  reservedSavings: 0,
};

test("cash balance adds received income and subtracts paid expenses", () => {
  const result = calculateBudget({
    ...emptyLedger,
    income: [{ id: 1, name: "Pay", amount: 2500, day: 2, category: "Income" }],
    expenses: [{ id: 2, name: "Groceries", amount: 700, day: 2, category: "Food" }],
  });
  assert.equal(result.cashBalance, STARTING_FUNDS + 2500 - 700);
});

test("savings and unpaid bills reduce available money without reducing cash balance", () => {
  const result = calculateBudget({
    ...emptyLedger,
    reservedSavings: 1000,
    commitments: [{ id: 1, name: "Rent", amount: 2000, dueDay: 10 }],
    subscriptions: [{ id: 2, name: "Music", amount: 300, dueDay: 12, intervalDays: 30 }],
  });
  assert.equal(result.cashBalance, STARTING_FUNDS);
  assert.equal(result.availableToSpend, 6700);
});

test("weekly subscriptions reserve every occurrence left in the 30-day window", () => {
  const result = calculateBudget({
    ...emptyLedger,
    subscriptions: [{ id: 1, name: "Streaming", amount: 120, dueDay: 7, intervalDays: 7 }],
  });
  assert.equal(result.pendingSubscriptions, 480);
});

test("moving a planned charge to paid spending leaves available money unchanged", () => {
  const planned = calculateBudget({
    ...emptyLedger,
    commitments: [{ id: 1, name: "Bill", amount: 850, dueDay: 4 }],
  });
  const paid = calculateBudget({
    ...emptyLedger,
    expenses: [{ id: 1, name: "Bill", amount: 850, day: 1, category: "Commitment" }],
  });
  assert.equal(planned.availableToSpend, paid.availableToSpend);
  assert.equal(paid.cashBalance, STARTING_FUNDS - 850);
});

test("end of day 30 has no remaining days and no projected future spending", () => {
  const result = calculateBudget({ ...emptyLedger, day: 31 });
  assert.equal(result.completedDays, 30);
  assert.equal(result.daysRemaining, 0);
  assert.equal(result.dailyAllowance, 0);
  assert.equal(result.projectedAvailable, STARTING_FUNDS);
});

test("day 1 has a transparent baseline estimate before history exists", () => {
  const result = calculateBudget(emptyLedger);
  assert.equal(result.forecastBasis, "baseline");
  assert.equal(result.averageDailySpend, null, "no actual observed average is claimed");
  assert.equal(result.forecastDailySpendRate, BASELINE_DAILY_SPENDING);
  assert.equal(result.fullFutureDays, 29);
  assert.equal(result.expectedCurrentDaySpend, 333.33);
  assert.equal(result.expectedRemainingSpend, 10000);
  assert.equal(result.projectedAvailable, 0);
  assert.equal(result.risk, "Medium", "the assumed zero month-end buffer meets the documented limited-buffer rule");
  assert.match(result.riskReason, /baseline estimate.*limited buffer/i);
});

test("Day 1 with ₹7,000 paid spending forecasts a real assumed shortfall and high risk", () => {
  const result = calculateBudget({
    ...emptyLedger,
    expenses: [{ id: 1, name: "Paid spending", amount: 7000, day: 1, category: "Other" }],
    savingsGoalTarget: 2000,
  });
  assert.equal(result.cashBalance, 3000);
  assert.equal(result.availableToSpend, 3000);
  assert.equal(result.forecastBasis, "baseline");
  assert.equal(result.expectedCurrentDaySpend, 0);
  assert.equal(result.expectedRemainingSpend, 9666.67);
  assert.equal(result.projectedAvailable, -6666.67);
  assert.equal(result.risk, "High");
  assert.match(result.riskReason, /baseline estimate is .* below zero/i);
});

test("zero available-to-spend remains zero now and negative forecast is not clamped", () => {
  const result = calculateBudget({
    ...emptyLedger,
    expenses: [{ id: 1, name: "All funds spent", amount: 10000, day: 1, category: "Other" }],
  });
  assert.equal(result.availableToSpend, 0);
  assert.ok(result.projectedAvailable < 0);
  assert.equal(result.risk, "High");
});

test("Day 2 forecast covers 29 remaining days including today exactly once", () => {
  const result = calculateBudget({
    ...emptyLedger,
    day: 2,
    expenses: [{ id: 1, name: "Day one", amount: 5000, day: 1, category: "Food" }],
  });
  assert.equal(result.completedDays, 1);
  assert.equal(result.daysRemaining, 29, "remaining includes current day");
  assert.equal(result.fullFutureDays, 28, "full future days exclude current day");
  assert.equal(result.averageDailySpend, 5000);
  assert.equal(result.availableToSpend, 5000);
  assert.equal(result.expectedCurrentDaySpend, 5000);
  assert.equal(result.expectedRemainingSpend, 145000);
  assert.equal(result.projectedAvailable, -140000);
  assert.equal(result.risk, "High");
  assert.equal(result.projectedAvailable, result.availableToSpend - result.expectedRemainingSpend);
});

test("Day 2 current-day spending is already in balance and reduces only today's remaining estimate", () => {
  const result = calculateBudget({
    ...emptyLedger,
    day: 2,
    expenses: [
      { id: 1, name: "Day one", amount: 5000, day: 1, category: "Food" },
      { id: 2, name: "Today", amount: 1000, day: 2, category: "Food" },
    ],
  });
  assert.equal(result.availableToSpend, 4000);
  assert.equal(result.expectedCurrentDaySpend, 4000);
  assert.equal(result.expectedRemainingSpend, 144000);
  assert.equal(result.projectedAvailable, -140000);
});

test("zero completed-day spending projects zero future spending", () => {
  const result = calculateBudget({ ...emptyLedger, day: 2 });
  assert.equal(result.averageDailySpend, 0);
  assert.equal(result.expectedCurrentDaySpend, 0);
  assert.equal(result.expectedRemainingSpend, 0);
  assert.equal(result.projectedAvailable, result.availableToSpend);
});

test("forecast changes from baseline to completed-day observed spending", () => {
  const baseline = calculateBudget({ ...emptyLedger, day: 1 });
  const observed = calculateBudget({
    ...emptyLedger,
    day: 3,
    expenses: [
      { id: 1, name: "Day one", amount: 200, day: 1, category: "Food" },
      { id: 2, name: "Today", amount: 100, day: 3, category: "Food" },
    ],
  });
  assert.equal(baseline.forecastBasis, "baseline");
  assert.equal(observed.forecastBasis, "observed");
  assert.equal(observed.averageDailySpend, 100);
  assert.equal(observed.forecastDailySpendRate, 100);
  assert.equal(observed.completedDays, 2);
  assert.equal(observed.fullFutureDays, 27);
  assert.equal(observed.expectedRemainingSpend, 2700);
  assert.equal(observed.projectedAvailable, 7000);
});

test("baseline subtracts unpaid bills and savings once, without treating them as spending", () => {
  const result = calculateBudget({
    ...emptyLedger,
    reservedSavings: 1000,
    commitments: [{ id: 1, name: "Rent", amount: 2000, dueDay: 10 }],
    subscriptions: [{ id: 2, name: "Music", amount: 300, dueDay: 12, intervalDays: 30 }],
  });
  assert.equal(result.cashBalance, STARTING_FUNDS);
  assert.equal(result.paidExpenses, 0);
  assert.equal(result.reservedCharges, 2300);
  assert.equal(result.availableToSpend, 6700);
  assert.equal(result.expectedRemainingSpend, 10000);
  assert.equal(result.projectedAvailable, -3300);
  assert.equal(result.projectedAvailable, result.availableToSpend - result.expectedRemainingSpend);
});

test("canonical day model keeps current-day counts consistent from day 1 through completion", () => {
  const day1 = calculateBudget({ ...emptyLedger, day: 1 });
  assert.deepEqual([day1.displayDay, day1.completedDays, day1.daysRemaining, day1.progressPercent], [1, 0, 30, 0]);
  const day7 = calculateBudget({ ...emptyLedger, day: 7 });
  assert.deepEqual([day7.displayDay, day7.completedDays, day7.daysRemaining, day7.progressPercent], [7, 6, 24, 20]);
  const day30 = calculateBudget({ ...emptyLedger, day: 30 });
  assert.deepEqual([day30.displayDay, day30.completedDays, day30.daysRemaining, day30.progressPercent], [30, 29, 1, 29 / 30 * 100]);
  const finalDayWithHistory = calculateBudget({
    ...emptyLedger,
    day: 30,
    expenses: [{ id: 1, name: "Earlier spending", amount: 2900, day: 1, category: "Food" }],
  });
  assert.equal(finalDayWithHistory.fullFutureDays, 0);
  assert.equal(finalDayWithHistory.expectedCurrentDaySpend, 100);
  assert.equal(finalDayWithHistory.expectedRemainingSpend, 100);
  assert.equal(finalDayWithHistory.projectedAvailable, 7000);
  const complete = calculateBudget({ ...emptyLedger, day: 31 });
  assert.deepEqual([complete.displayDay, complete.completedDays, complete.daysRemaining, complete.progressPercent], [30, 30, 0, 100]);
});

test("forecast uses completed-day pace for full future days, not current-day payments", () => {
  const result = calculateBudget({
    ...emptyLedger,
    day: 7,
    expenses: [
      { id: 1, name: "Past days", amount: 600, day: 1, category: "Other" },
      { id: 2, name: "Today", amount: 200, day: 7, category: "Other" },
    ],
  });
  assert.equal(result.averageDailySpend, 100);
  assert.equal(result.fullFutureDays, 23);
  assert.equal(result.projectedAvailable, 6900);
});

test("negative forecast yields high risk and remains negative", () => {
  const result = calculateBudget({
    ...emptyLedger,
    day: 7,
    expenses: [{ id: 1, name: "Spending pace", amount: 6000, day: 1, category: "Other" }],
  });
  assert.ok(result.cashBalance > 0, "the current actual balance remains positive");
  assert.ok(result.projectedAvailable < 0);
  assert.equal(result.risk, "High");
  assert.match(result.riskReason, /forecast is .* below zero/i);
});

test("baseline limited-buffer risk explains its assumption without an insufficient-data label", () => {
  const result = calculateBudget(emptyLedger);
  assert.equal(result.forecastBasis, "baseline");
  assert.equal(result.risk, "Medium");
  assert.match(result.riskReason, /baseline estimate.*less than 10% of starting funds/i);
});

test("a negative baseline forecast is high risk even when the savings target is also unreachable", () => {
  const result = calculateBudget({ ...emptyLedger, reservedSavings: 1000, savingsGoalTarget: 12000 });
  assert.equal(result.forecastBasis, "baseline");
  assert.equal(typeof result.projectedAvailable, "number");
  assert.equal(result.savingsGoalReachable, false);
  assert.ok(result.projectedAvailable < 0);
  assert.equal(result.risk, "High");
  assert.match(result.riskReason, /baseline estimate is .* below zero/i);
});

test("adequate forecast buffer is low risk and limited available cash is high risk", () => {
  const adequate = calculateBudget({
    ...emptyLedger,
    day: 2,
    expenses: [{ id: 1, name: "Day one", amount: 100, day: 1, category: "Other" }],
    savingsGoalTarget: 1000,
  });
  assert.equal(adequate.risk, "Low");
  const lowCash = calculateBudget({
    ...emptyLedger,
    expenses: [{ id: 1, name: "Paid spending", amount: 9500, day: 1, category: "Other" }],
  });
  assert.equal(lowCash.availableToSpend, 500);
  assert.equal(lowCash.risk, "High");
  assert.match(lowCash.riskReason, /5% of starting funds/i);
});

test("unpaid obligations that exceed cash are high risk without counting them as paid", () => {
  const result = calculateBudget({
    ...emptyLedger,
    day: 2,
    expenses: [{ id: 1, name: "Paid", amount: 9000, day: 1, category: "Other" }],
    commitments: [{ id: 2, name: "Rent", amount: 2000, dueDay: 3 }],
  });
  assert.equal(result.paidExpenses, 9000);
  assert.equal(result.pendingCommitments, 2000);
  assert.equal(result.risk, "High");
  assert.match(result.riskReason, /short of savings and unpaid bills/i);
});

test("confirmed income can recover the forecast and risk immediately", () => {
  let state = {
    ...emptyLedger,
    day: 30,
    expenses: [{ id: 1, name: "Spending", amount: 11000, day: 1, category: "Other" }],
  };
  assert.equal(calculateBudget(state).risk, "High");
  state = ledgerReducer(state, { type: "income", entry: { id: 2, name: "Received pay", amount: 12000, day: 30, category: "Income" } });
  assert.equal(calculateBudget(state).cashBalance, 11000);
  assert.equal(calculateBudget(state).risk, "Low");
});

test("amount parser rejects blank, zero, negative, and non-finite values", () => {
  for (const input of ["", "  ", "0", "-5", "NaN", "Infinity", "1e100", "0.001"]) {
    assert.equal(parsePositiveAmount(input), null, input);
  }
  assert.equal(parsePositiveAmount("12.5"), 12.5);
  assert.equal(parsePositiveAmount("1.005"), 1.01);
});

test("decimal values are summed as paise to avoid floating point balance drift", () => {
  const result = calculateBudget({
    ...emptyLedger,
    income: [{ id: 1, name: "Received", amount: 0.3, day: 1, category: "Income" }],
    expenses: [
      { id: 2, name: "One", amount: 0.1, day: 1, category: "Other" },
      { id: 3, name: "Two", amount: 0.2, day: 1, category: "Other" },
    ],
  });
  assert.equal(result.cashBalance, STARTING_FUNDS);
});

test("income, a paid expense, and savings reservations update distinct balances", () => {
  let state = structuredClone(initialLedgerState);
  state = ledgerReducer(state, { type: "income", entry: { id: 3, name: "Shift", amount: 1500, day: 1, category: "Income" } });
  state = ledgerReducer(state, { type: "reserve-savings", amount: 500 });
  const beforeExpense = calculateBudget(state);
  state = ledgerReducer(state, { type: "expense", entry: { id: 4, name: "Lunch", amount: 200, day: 1, category: "Everyday" } });
  const afterExpense = calculateBudget(state);
  assert.equal(afterExpense.cashBalance, beforeExpense.cashBalance - 200);
  assert.equal(afterExpense.reservedSavings, 500);
  assert.equal(afterExpense.availableToSpend, beforeExpense.availableToSpend - 200);
});

test("paid commitments move to expenses without changing available-to-spend twice", () => {
  let state = structuredClone(initialLedgerState);
  state = ledgerReducer(state, { type: "commitment", entry: { id: 3, name: "Phone bill", amount: 800, dueDay: 7 } });
  const beforePayment = calculateBudget(state);
  state = ledgerReducer(state, { type: "pay-commitment", id: 3, paidEntry: { id: 4, name: "Phone bill", amount: 800, day: 1, category: "Commitment" } });
  const afterPayment = calculateBudget(state);
  assert.equal(afterPayment.availableToSpend, beforePayment.availableToSpend);
  assert.equal(afterPayment.cashBalance, beforePayment.cashBalance - 800);
  assert.equal(afterPayment.pendingCommitments, 0);
});

test("simulated purchases are blocked above available funds and recorded on confirm", () => {
  const state = structuredClone(initialLedgerState);
  const available = calculateBudget(state).availableToSpend;
  const tooLarge = ledgerReducer(state, { type: "simulated-expense", entry: { id: 3, name: "Too much", amount: available + 1, day: 1, category: "Purchase" } });
  assert.equal(tooLarge, state);
  const purchased = ledgerReducer(state, { type: "simulated-expense", entry: { id: 4, name: "Confirmed", amount: 500, day: 1, category: "Purchase" } });
  assert.equal(purchased.expenses.length, state.expenses.length + 1);
  assert.equal(calculateBudget(purchased).cashBalance, calculateBudget(state).cashBalance - 500);
});

test("weekly subscription advances only when due and releases the paid occurrence", () => {
  let state = structuredClone(initialLedgerState);
  state = ledgerReducer(state, { type: "subscription", entry: { id: 3, name: "Streaming", amount: 100, dueDay: 7, intervalDays: 7 } });
  const original = calculateBudget(state);
  assert.equal(original.pendingSubscriptions, 400);
  const earlyAttempt = ledgerReducer(state, { type: "pay-subscription", id: 3, paidEntry: { id: 4, name: "Streaming", amount: 100, day: 1, category: "Subscription" } });
  assert.equal(earlyAttempt, state);
  state = { ...state, day: 7 };
  const beforePayment = calculateBudget(state);
  state = ledgerReducer(state, { type: "pay-subscription", id: 3, paidEntry: { id: 4, name: "Streaming", amount: 100, day: 7, category: "Subscription" } });
  assert.equal(state.subscriptions[0].dueDay, 14);
  assert.equal(calculateBudget(state).pendingSubscriptions, 300);
  assert.equal(calculateBudget(state).availableToSpend, beforePayment.availableToSpend);
});

test("invalid direct expense and day advancement after day 30 are rejected", () => {
  const state = { ...structuredClone(initialLedgerState), day: 30 };
  const invalid = ledgerReducer(state, { type: "expense", entry: { id: 3, name: "Zero", amount: 0, day: 30, category: "Everyday" } });
  assert.equal(invalid, state);
  const complete = ledgerReducer(state, { type: "advance-day" });
  assert.equal(complete.day, 31);
  assert.equal(ledgerReducer(complete, { type: "advance-day" }), complete);
});

test("day advancement reaches day 30 and completion, but cannot go past it", () => {
  let state = structuredClone(initialLedgerState);
  for (let expectedDay = 2; expectedDay <= 31; expectedDay += 1) {
    state = ledgerReducer(state, { type: "advance-day" });
    assert.equal(state.day, expectedDay);
  }
  assert.equal(calculateBudget(state).completedDays, 30);
  assert.equal(calculateBudget(state).daysRemaining, 0);
  assert.equal(ledgerReducer(state, { type: "advance-day" }), state);
});
