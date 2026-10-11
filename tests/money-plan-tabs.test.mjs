import assert from "node:assert/strict";
import test from "node:test";
import { getNextMoneyPlanTab, moneyPlanTabs } from "../lib/money-plan-tabs.ts";

test("Money Plan tabs have unique, connected tab and panel identifiers", () => {
  const tabIds = moneyPlanTabs.map((tab) => tab.tabId);
  const panelIds = moneyPlanTabs.map((tab) => tab.panelId);

  assert.equal(new Set(tabIds).size, moneyPlanTabs.length);
  assert.equal(new Set(panelIds).size, moneyPlanTabs.length);
  for (const tab of moneyPlanTabs) {
    assert.ok(tab.tabId.startsWith("money-plan-tab-"));
    assert.ok(tab.panelId.startsWith("money-plan-panel-"));
    assert.equal(tab.tabId.slice("money-plan-tab-".length), tab.id);
    assert.equal(tab.panelId.slice("money-plan-panel-".length), tab.id);
  }
});

test("Arrow keys wrap between horizontal Money Plan tabs", () => {
  assert.equal(getNextMoneyPlanTab("budget-goals", "ArrowLeft"), "subscriptions");
  assert.equal(getNextMoneyPlanTab("budget-goals", "ArrowRight"), "commitments");
  assert.equal(getNextMoneyPlanTab("subscriptions", "ArrowRight"), "budget-goals");
  assert.equal(getNextMoneyPlanTab("subscriptions", "ArrowLeft"), "commitments");
});

test("Home and End select the first and last Money Plan tabs", () => {
  assert.equal(getNextMoneyPlanTab("commitments", "Home"), "budget-goals");
  assert.equal(getNextMoneyPlanTab("budget-goals", "End"), "subscriptions");
  assert.equal(getNextMoneyPlanTab("subscriptions", "Tab"), null);
});
