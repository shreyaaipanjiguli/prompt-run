import assert from "node:assert/strict";
import test from "node:test";
import { calculateBudget } from "../lib/budget.ts";
import { simulateExpense, simulateSkip } from "../lib/decision.ts";
import { initialLedgerState, ledgerReducer } from "../lib/ledger.ts";

function scenarioLedger(day = 7) {
  return {
    ...structuredClone(initialLedgerState),
    day,
    expenses: [{ id: 1, name: "Completed days", amount: 600, day: 1, category: "Food" }],
    commitments: [{ id: 2, name: "Upcoming bill", amount: 1000, dueDay: Math.min(9, day) }],
    reservedSavings: 500,
  };
}

test("buy, skip, and cheaper alternative compare through the shared budget calculation", () => {
  const state = scenarioLedger();
  const skip = simulateSkip(state, 2000);
  const buy = simulateExpense(state, { id: "buy", entryId: -1, name: "Headphones", category: "Personal", amount: 3000, day: 7, goalTarget: 2000 });
  const alternative = simulateExpense(state, { id: "alternative", entryId: -2, name: "Headphones alternative", category: "Personal", amount: 1500, day: 7, goalTarget: 2000 });

  assert.equal(buy.budget.availableToSpend, skip.budget.availableToSpend - 3000);
  assert.equal(alternative.budget.availableToSpend, skip.budget.availableToSpend - 1500);
  assert.equal(skip.budget.pendingCommitments, 1000);
  assert.equal(buy.budget.paidExpenses, skip.budget.paidExpenses + 3000);
  assert.equal(buy.affordable, true);
  assert.equal(buy.budget.dailyAllowance, buy.budget.availableToSpend / buy.budget.daysRemaining);
  assert.equal(buy.budget.projectedAvailable, skip.budget.projectedAvailable - 2900, "the purchase replaces the remaining current-day estimate up to its daily rate");
  assert.equal(buy.commitmentsCovered, true);
  assert.equal(buy.savingsTargetReachable, true);
  assert.equal(3000 - 1500, 1500);
  assert.equal(state.expenses.length, 1, "preview must not mutate the actual ledger");

  const recorded = ledgerReducer(state, { type: "simulated-expense", entry: { id: 9, name: "Headphones", amount: 3000, day: 7, category: "Personal" } });
  assert.equal(recorded.expenses.length, state.expenses.length + 1);
  assert.equal(calculateBudget(recorded).projectedAvailable, buy.budget.projectedAvailable, "Overview after recording matches the equivalent simulator Buy scenario");
});

test("day-1 decision scenarios share the baseline forecast and change it by the purchase amount", () => {
  const state = { ...structuredClone(initialLedgerState), savingsGoal: { name: "Buffer", target: 1000 } };
  const skip = simulateSkip(state, 1000);
  const buy = simulateExpense(state, { id: "buy", entryId: -1, name: "Book", category: "Education", amount: 500, day: 1, goalTarget: 1000 });
  assert.equal(skip.budget.forecastBasis, "baseline");
  assert.equal(buy.budget.forecastBasis, "baseline");
  assert.equal(buy.budget.expectedCurrentDaySpend, 0);
  assert.equal(skip.budget.expectedCurrentDaySpend, 333.33);
  assert.equal(Math.round((skip.budget.expectedRemainingSpend - buy.budget.expectedRemainingSpend) * 100), 33333);
  assert.equal(Math.round((skip.budget.projectedAvailable - buy.budget.projectedAvailable) * 100), 16667);
  assert.equal(state.expenses.length, 0, "scenario calculation leaves actual state unchanged");
});

test("a large scenario flags savings and bill shortfalls and preserves negative projections", () => {
  const state = scenarioLedger();
  const scenario = simulateExpense(state, { id: "buy", entryId: -1, name: "Large item", category: "Personal", amount: 8100, day: 7, goalTarget: 2500 });
  assert.equal(scenario.budget.availableToSpend < 0, true);
  assert.equal(scenario.savingsTargetReachable, false);
  assert.equal(scenario.commitmentsCovered, false);
  assert.ok(scenario.budget.projectedAvailable < 0);
  assert.equal(scenario.budget.risk, "High");
});

test("unexpected expense preview uses the shared budget and does not record it", () => {
  const state = scenarioLedger();
  const preview = simulateExpense(state, { id: "unexpected", entryId: -1, name: "Urgent repair", category: "Unexpected", amount: 1200, day: 7, goalTarget: 2000 });
  assert.equal(preview.id, "unexpected");
  assert.equal(preview.budget.cashBalance, calculateBudget(state).cashBalance - 1200);
  assert.equal(state.expenses.length, 1);
});

test("scenario risk and explanation come from the same hypothetical budget without mutating the ledger", () => {
  const state = scenarioLedger();
  const before = structuredClone(state);
  const scenario = simulateExpense(state, {
    id: "buy",
    entryId: -10,
    name: "Large purchase",
    category: "Personal",
    amount: 8100,
    day: 7,
    goalTarget: 2000,
  });
  const expectedBudget = calculateBudget({
    ...state,
    expenses: [...state.expenses, { id: -10, name: "Large purchase", amount: 8100, day: 7, category: "Personal" }],
    savingsGoalTarget: 2000,
  });

  assert.deepEqual(state, before, "preview does not mutate current financial state");
  assert.equal(scenario.budget.risk, expectedBudget.risk);
  assert.equal(scenario.budget.riskReason, expectedBudget.riskReason);
  assert.equal(scenario.affordable, false);
  assert.ok(scenario.shortfall > 0);
  const rejected = ledgerReducer(state, {
    type: "simulated-expense",
    entry: { id: 20, name: "Large purchase", amount: 8100, day: 7, category: "Personal" },
  });
  assert.equal(rejected, state, "unaffordable scenario cannot be confirmed into the ledger");
});

test("cancel or skip is a no-op; confirmed purchase records exactly once", () => {
  const state = scenarioLedger();
  const original = calculateBudget(state);
  const preview = simulateExpense(state, { id: "buy", entryId: -1, name: "Headphones", category: "Personal", amount: 3000, day: 7, goalTarget: 2000 });
  assert.equal(calculateBudget(state).cashBalance, original.cashBalance, "cancel has no dispatch and leaves state unchanged");
  assert.equal(preview.budget.cashBalance, original.cashBalance - 3000);

  const action = { type: "simulated-expense", entry: { id: 3, name: "Headphones", amount: 3000, day: 7, category: "Personal" } };
  const purchased = ledgerReducer(state, action);
  const duplicate = ledgerReducer(purchased, action);
  assert.equal(purchased.expenses.length, state.expenses.length + 1);
  assert.equal(duplicate, purchased, "same confirmation id cannot be recorded a second time");
  assert.equal(calculateBudget(purchased).cashBalance, original.cashBalance - 3000);
});

test("insufficient funds are rejected by the shared ledger confirmation reducer", () => {
  const state = scenarioLedger();
  const available = calculateBudget(state).availableToSpend;
  const rejected = ledgerReducer(state, { type: "simulated-expense", entry: { id: 4, name: "Too expensive", amount: available + 0.01, day: 7, category: "Purchase" } });
  assert.equal(rejected, state);
});

test("₹700 available and a ₹6,000 decision shows a ₹5,300 hypothetical shortfall", () => {
  const state = { ...structuredClone(initialLedgerState), expenses: [{ id: 1, name: "Paid spending", amount: 9300, day: 1, category: "Other" }] };
  const current = calculateBudget({ ...state, savingsGoalTarget: state.savingsGoal.target });
  const buy = simulateExpense(state, { id: "buy", entryId: -1, name: "Laptop", category: "Education", amount: 6000, day: 1, goalTarget: 2000 });
  const alternative = simulateExpense(state, { id: "alternative", entryId: -2, name: "Used laptop", category: "Education", amount: 500, day: 1, goalTarget: 2000 });
  assert.equal(current.availableToSpend, 700);
  assert.equal(buy.affordable, false);
  assert.equal(buy.shortfall, 5300);
  assert.equal(alternative.affordable, true);
  assert.equal(alternative.budget.availableToSpend, 200);
  const rejected = ledgerReducer(state, { type: "simulated-expense", entry: { id: 2, name: "Laptop", amount: 6000, day: 1, category: "Education" } });
  assert.equal(rejected, state);
});

test("an equal-price alternative reports zero saved", () => {
  const state = scenarioLedger();
  const full = simulateExpense(state, { id: "buy", entryId: -1, name: "Item", category: "Personal", amount: 800, day: 7, goalTarget: 2000 });
  const equal = simulateExpense(state, { id: "alternative", entryId: -2, name: "Item alternative", category: "Personal", amount: 800, day: 7, goalTarget: 2000 });
  assert.equal(full.budget.availableToSpend - equal.budget.availableToSpend, 0);
  assert.equal(full.budget.projectedAvailable, equal.budget.projectedAvailable);
  assert.equal(full.budget.dailyAllowance, equal.budget.dailyAllowance);
  assert.equal(full.budget.risk, equal.budget.risk);
});

test("unexpected cost above available-to-spend cannot be confirmed", () => {
  const state = { ...structuredClone(initialLedgerState), expenses: [{ id: 1, name: "Paid spending", amount: 9300, day: 1, category: "Other" }] };
  const unexpected = simulateExpense(state, { id: "unexpected", entryId: -1, name: "Repair", category: "Unexpected", amount: 1200, day: 1, goalTarget: 2000 });
  assert.equal(unexpected.affordable, false);
  assert.equal(unexpected.shortfall, 500);
  const rejected = ledgerReducer(state, { type: "simulated-expense", entry: { id: 2, name: "Repair", amount: 1200, day: 1, category: "Unexpected" } });
  assert.equal(rejected, state);
});

test("affordable unexpected cost records once only after confirmation", () => {
  const state = scenarioLedger();
  const before = calculateBudget(state);
  const preview = simulateExpense(state, { id: "unexpected", entryId: -1, name: "Repair", category: "Unexpected", amount: 250, day: 7, goalTarget: 2000 });
  assert.equal(preview.affordable, true);
  assert.equal(calculateBudget(state).cashBalance, before.cashBalance);
  const action = { type: "simulated-expense", entry: { id: 5, name: "Repair", amount: 250, day: 7, category: "Unexpected" } };
  const confirmed = ledgerReducer(state, action);
  assert.equal(confirmed.expenses.length, state.expenses.length + 1);
  assert.equal(ledgerReducer(confirmed, action), confirmed);
});

test("day-30 scenarios use the existing no-future-days convention", () => {
  const state = scenarioLedger(30);
  const scenario = simulateExpense(state, { id: "buy", entryId: -1, name: "Last day item", category: "Personal", amount: 250, day: 30, goalTarget: 2000 });
  assert.equal(scenario.budget.daysRemaining, 1);
  assert.equal(scenario.budget.fullFutureDays, 0);
  assert.equal(scenario.budget.projectedAvailable, scenario.budget.availableToSpend);
});

test("shared ledger flows keep income, expenses, commitments, savings, day, and preview aligned", () => {
  let state = structuredClone(initialLedgerState);
  state = ledgerReducer(state, { type: "income", entry: { id: 10, name: "Pay", amount: 1000, day: 1, category: "Income" } });
  const afterIncome = calculateBudget(state);
  assert.equal(afterIncome.cashBalance, 11000);
  assert.equal(state.income.length, 1);

  state = ledgerReducer(state, { type: "expense", entry: { id: 11, name: "Lunch", amount: 300, day: 1, category: "Food" } });
  const beforePlan = calculateBudget(state);
  state = ledgerReducer(state, { type: "commitment", entry: { id: 12, name: "Bill", amount: 800, dueDay: 3 } });
  assert.equal(calculateBudget(state).paidExpenses, beforePlan.paidExpenses);
  assert.equal(calculateBudget(state).availableToSpend, beforePlan.availableToSpend - 800);

  const beforePay = calculateBudget(state);
  state = ledgerReducer(state, { type: "pay-commitment", id: 12, paidEntry: { id: 13, name: "Bill", amount: 800, day: 1, category: "Commitment" } });
  assert.equal(calculateBudget(state).availableToSpend, beforePay.availableToSpend);
  assert.equal(calculateBudget(state).paidExpenses, beforePay.paidExpenses + 800);
  assert.equal(calculateBudget(state).pendingCommitments, 0);

  state = ledgerReducer(state, { type: "reserve-savings", amount: 1200 });
  assert.equal(calculateBudget(state).reservedSavings, 1200);
  const beforePreview = calculateBudget(state);
  simulateExpense(state, { id: "buy", entryId: -1, name: "Preview", category: "Personal", amount: 50, day: 1, goalTarget: 2000 });
  assert.equal(calculateBudget(state).availableToSpend, beforePreview.availableToSpend);

  for (let index = 0; index < 6; index += 1) state = ledgerReducer(state, { type: "advance-day" });
  const daySeven = calculateBudget(state);
  assert.deepEqual([daySeven.displayDay, daySeven.completedDays, daySeven.daysRemaining], [7, 6, 24]);
  assert.equal(daySeven.cashBalance, 9900);
});
