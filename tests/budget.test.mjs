import assert from "node:assert/strict";
import test from "node:test";
import { calculateBudget, parsePositiveAmount, STARTING_FUNDS } from "../lib/budget.ts";
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

test("canonical day model keeps current-day counts consistent from day 1 through completion", () => {
  const day1 = calculateBudget({ ...emptyLedger, day: 1 });
  assert.deepEqual([day1.displayDay, day1.completedDays, day1.daysRemaining, day1.progressPercent], [1, 0, 30, 0]);
  const day7 = calculateBudget({ ...emptyLedger, day: 7 });
  assert.deepEqual([day7.displayDay, day7.completedDays, day7.daysRemaining, day7.progressPercent], [7, 6, 24, 20]);
  const day30 = calculateBudget({ ...emptyLedger, day: 30 });
  assert.deepEqual([day30.displayDay, day30.completedDays, day30.daysRemaining, day30.progressPercent], [30, 29, 1, 29 / 30 * 100]);
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
    day: 30,
    expenses: [{ id: 1, name: "Spending", amount: 11000, day: 1, category: "Other" }],
  });
  assert.ok(result.projectedAvailable < 0);
  assert.equal(result.risk, "High");
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
