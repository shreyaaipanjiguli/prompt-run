export const moneyPlanTabs = [
  {
    id: "budget-goals",
    label: "Budget & Goals",
    tabId: "money-plan-tab-budget-goals",
    panelId: "money-plan-panel-budget-goals",
  },
  {
    id: "commitments",
    label: "Upcoming commitments",
    tabId: "money-plan-tab-commitments",
    panelId: "money-plan-panel-commitments",
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    tabId: "money-plan-tab-subscriptions",
    panelId: "money-plan-panel-subscriptions",
  },
] as const;

export type MoneyPlanTabId = (typeof moneyPlanTabs)[number]["id"];

export function getNextMoneyPlanTab(currentId: MoneyPlanTabId, key: string): MoneyPlanTabId | null {
  const currentIndex = moneyPlanTabs.findIndex((tab) => tab.id === currentId);
  if (currentIndex < 0) return null;

  switch (key) {
    case "ArrowRight":
      return moneyPlanTabs[(currentIndex + 1) % moneyPlanTabs.length].id;
    case "ArrowLeft":
      return moneyPlanTabs[(currentIndex - 1 + moneyPlanTabs.length) % moneyPlanTabs.length].id;
    case "Home":
      return moneyPlanTabs[0].id;
    case "End":
      return moneyPlanTabs[moneyPlanTabs.length - 1].id;
    default:
      return null;
  }
}
