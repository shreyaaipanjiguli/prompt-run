"use client";

import { useMemo, useReducer, useRef, useState } from "react";
import {
  ArrowDownLeft, ArrowLeftRight, ArrowRight, ChartNoAxesColumn,
  Check, ChevronRight, CircleAlert, Home as HomeIcon, Plus, ShieldCheck, Sparkles, Trash2,
} from "lucide-react";
import {
  calculateBudget, CHALLENGE_DAYS, parsePositiveAmount, STARTING_FUNDS,
} from "@/lib/budget";
import { simulateExpense, simulateSkip } from "@/lib/decision";
import type { DecisionScenario } from "@/lib/decision";
import { initialLedgerState, ledgerReducer, type Subscription } from "@/lib/ledger";
import type { PlannedCharge } from "@/lib/budget";

const navItems = [
  { id: "overview", label: "Overview", icon: HomeIcon },
  { id: "money-plan", label: "Money Plan", icon: ChartNoAxesColumn },
  { id: "activity", label: "Activity", icon: ArrowLeftRight },
  { id: "simulator", label: "Decision Simulator", icon: Sparkles },
];

const money = (value: number) => `${value < 0 ? "−" : ""}₹${Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fieldClass = "w-full rounded-md border border-[#e3e4df] bg-white px-3 py-2 text-sm text-[#30332f] placeholder:text-[#999d96] outline-none transition focus:border-[#879b81] focus:ring-2 focus:ring-[#879b81]/15";
const primaryButton = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-[#526c50] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#435a42] disabled:cursor-not-allowed disabled:opacity-45";
const secondaryButton = "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-[#e2e4de] bg-white px-2.5 py-1.5 text-xs font-medium text-[#4a4e48] transition hover:bg-[#f5f6f2] disabled:cursor-not-allowed disabled:opacity-45";

export default function Home() {
  const [state, dispatch] = useReducer(ledgerReducer, initialLedgerState);
  const [activeSection, setActiveSection] = useState("overview");
  const [moneyPlanTab, setMoneyPlanTab] = useState("budget-goals");
  const [incomeName, setIncomeName] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [commitmentName, setCommitmentName] = useState("");
  const [commitmentAmount, setCommitmentAmount] = useState("");
  const [commitmentDay, setCommitmentDay] = useState("7");
  const [subscriptionName, setSubscriptionName] = useState("");
  const [subscriptionAmount, setSubscriptionAmount] = useState("");
  const [subscriptionDay, setSubscriptionDay] = useState("7");
  const [subscriptionInterval, setSubscriptionInterval] = useState("30");
  const [goalName, setGoalName] = useState("Emergency buffer");
  const [goalTarget, setGoalTarget] = useState("2000");
  const [savingsInput, setSavingsInput] = useState("");
  const [simKind, setSimKind] = useState<"purchase" | "unexpected">("purchase");
  const [simName, setSimName] = useState("");
  const [simCategory, setSimCategory] = useState("Personal");
  const [simAmount, setSimAmount] = useState("");
  const [alternativeAmount, setAlternativeAmount] = useState("");
  const [simDay, setSimDay] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [simulationError, setSimulationError] = useState("");
  const [transactionError, setTransactionError] = useState("");
  const [commitmentError, setCommitmentError] = useState("");
  const [subscriptionError, setSubscriptionError] = useState("");
  const [goalError, setGoalError] = useState("");
  const nextId = useRef(1);

  const budget = useMemo(() => calculateBudget(state), [state]);
  const transactions = useMemo(() => [
    ...state.income.map((entry) => ({ ...entry, kind: "Income" as const })),
    ...state.expenses.map((entry) => ({ ...entry, kind: "Expense" as const })),
  ].sort((a, b) => b.day - a.day || b.id - a.id), [state.income, state.expenses]);
  const targetValue = parsePositiveAmount(goalTarget) ?? 0;
  const simulationValue = parsePositiveAmount(simAmount);
  const alternativeValue = parsePositiveAmount(alternativeAmount);
  const plannedDay = simDay === "" ? state.day : Number(simDay);
  const simulations = useMemo(() => {
    const skip = simulateSkip(state, targetValue);
    if (simulationValue === null || !Number.isInteger(plannedDay) || plannedDay < state.day || plannedDay > CHALLENGE_DAYS) return { skip, buy: null, alternative: null, unexpected: null };
    const id = -Math.max(1, state.expenses.length + 1);
    const buy = simulateExpense(state, { id: simKind === "unexpected" ? "unexpected" : "buy", entryId: id, amount: simulationValue, name: simName.trim() || (simKind === "unexpected" ? "Unexpected expense" : "Planned purchase"), category: simKind === "unexpected" ? "Unexpected" : simCategory, day: plannedDay, goalTarget: targetValue });
    const alternative = alternativeValue === null ? null : simulateExpense(state, { id: "alternative", entryId: id - 1, amount: alternativeValue, name: `${simName.trim() || "Purchase"} alternative`, category: simCategory, day: plannedDay, goalTarget: targetValue });
    return { skip, buy, alternative, unexpected: simKind === "unexpected" ? buy : null };
  }, [state, targetValue, simulationValue, alternativeValue, simName, simCategory, simKind, plannedDay]);
  const confirmationLock = useRef(false);

  function makeId() {
    const value = nextId.current;
    nextId.current += 1;
    return value;
  }

  function addEntry(kind: "income" | "expense") {
    const name = kind === "income" ? incomeName.trim() : expenseName.trim();
    const amount = parsePositiveAmount(kind === "income" ? incomeAmount : expenseAmount);
    if (!name || amount === null) {
      setTransactionError("Enter a description and a finite amount greater than ₹0.");
      return;
    }
    if (state.day > CHALLENGE_DAYS) { setTransactionError("The 30-day challenge is complete."); return; }
    dispatch({ type: kind, entry: { id: makeId(), name, amount, category: kind === "income" ? "Income" : "Everyday", day: state.day } });
    if (kind === "income") { setIncomeName(""); setIncomeAmount(""); }
    else { setExpenseName(""); setExpenseAmount(""); }
    setTransactionError("");
  }

  function addCommitment() {
    const amount = parsePositiveAmount(commitmentAmount);
    const dueDay = Number(commitmentDay);
    if (!commitmentName.trim() || amount === null || !Number.isInteger(dueDay) || dueDay < state.day || dueDay > CHALLENGE_DAYS) {
      setCommitmentError("Enter a name, positive amount, and due day from today through day 30."); return;
    }
    dispatch({ type: "commitment", entry: { id: makeId(), name: commitmentName.trim(), amount, dueDay } });
    setCommitmentName(""); setCommitmentAmount(""); setCommitmentError("");
  }

  function addSubscription() {
    const amount = parsePositiveAmount(subscriptionAmount);
    const dueDay = Number(subscriptionDay);
    const intervalDays = Number(subscriptionInterval);
    if (!subscriptionName.trim() || amount === null || !Number.isInteger(dueDay) || dueDay < state.day || dueDay > CHALLENGE_DAYS || !Number.isInteger(intervalDays) || intervalDays < 1) {
      setSubscriptionError("Enter a name, positive amount, due day, and repeat interval."); return;
    }
    dispatch({ type: "subscription", entry: { id: makeId(), name: subscriptionName.trim(), amount, dueDay, intervalDays } });
    setSubscriptionName(""); setSubscriptionAmount(""); setSubscriptionError("");
  }

  function previewDecision() {
    setSimulationError("");
    if (!simName.trim() || simulationValue === null || (simKind === "purchase" && alternativeValue === null) || !Number.isInteger(plannedDay) || plannedDay < state.day || plannedDay > CHALLENGE_DAYS) {
      setSimulationError("Enter a description, valid amount, alternative price, and a simulation day from today through day 30.");
      setPreviewOpen(false);
      return;
    }
    confirmationLock.current = false;
    setPreviewOpen(true);
  }

  function confirmSimulation(choice: "buy" | "alternative" | "unexpected") {
    const scenario = choice === "alternative" ? simulations.alternative : choice === "unexpected" ? simulations.unexpected : simulations.buy;
    const amount = choice === "alternative" ? alternativeValue : simulationValue;
    if (!previewOpen || !scenario || confirmationLock.current || amount === null || amount > budget.availableToSpend || state.day > CHALLENGE_DAYS || plannedDay !== state.day) {
      setSimulationError(plannedDay !== state.day ? "A confirmed expense must be dated today. Change the planned day to today, or keep this as a preview." : "This amount is invalid or exceeds available-to-spend.");
      return;
    }
    confirmationLock.current = true;
    dispatch({
      type: "simulated-expense",
      entry: { id: makeId(), name: choice === "alternative" ? `${simName.trim()} alternative` : simName.trim(), amount, category: choice === "unexpected" ? "Unexpected" : simCategory, day: state.day },
    });
    setPreviewOpen(false);
    setSimulationError("");
  }

  function cancelSimulation() {
    setPreviewOpen(false);
    confirmationLock.current = false;
    setSimulationError("");
  }

  function payCommitment(item: PlannedCharge) {
    dispatch({ type: "pay-commitment", id: item.id, paidEntry: { id: makeId(), name: item.name, amount: item.amount, category: "Commitment", day: state.day } });
  }

  function paySubscription(item: Subscription) {
    dispatch({ type: "pay-subscription", id: item.id, paidEntry: { id: makeId(), name: item.name, amount: item.amount, category: "Subscription", day: state.day } });
  }

  function contributeSavings() {
    const amount = parsePositiveAmount(savingsInput);
    if (amount === null || amount > budget.availableToSpend || targetValue <= 0) {
      setGoalError("Set a positive goal target and enter an amount within available-to-spend."); return;
    }
    dispatch({ type: "reserve-savings", amount }); setSavingsInput(""); setGoalError("");
  }

  const riskClass = budget.risk === "Low" ? "text-[#426843] bg-[#edf3eb]" : budget.risk === "Medium" ? "text-[#80652d] bg-[#f7f1e4]" : "text-[#914f43] bg-[#f7ece9]";
  const listedSubscriptions = state.subscriptions.slice().sort((a, b) => a.dueDay - b.dueDay);
  const summaryExpenses = state.expenses.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#30332f]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#e8e9e5] bg-white/95 px-4 backdrop-blur sm:px-6">
        <a href="#overview" onClick={() => setActiveSection("overview")} className="flex items-center gap-2 text-sm font-semibold tracking-[-0.02em]" aria-label="Survive30 overview">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#526c50] text-xs font-bold text-white">s</span>survive<span className="-ml-2 text-[#718b68]">30</span>
        </a>
        <div className="flex items-center gap-3 text-xs text-[#777b74]"><span className="hidden sm:inline">30-day money workspace</span><span className="rounded-md border border-[#e4e5df] px-2.5 py-1.5 font-medium text-[#4f554c]">{budget.isComplete ? "Challenge complete" : `Day ${budget.displayDay} / ${CHALLENGE_DAYS}`}</span></div>
      </header>

      <div className="mx-auto grid max-w-[1480px] lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="border-b border-[#e8e9e5] bg-[#fafaf8] p-3 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:border-b-0 lg:border-r lg:p-4">
          <div className="mb-3 hidden px-2 pt-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#a0a39d] lg:block">Workspace</div>
          <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {navItems.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveSection(id)} aria-current={activeSection === id ? "page" : undefined} className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-left text-[0.8rem] transition ${activeSection === id ? "bg-[#eeefeb] font-semibold text-[#30352e]" : "text-[#70756e] hover:bg-[#f0f1ed] hover:text-[#30352e]"}`}><Icon size={16} strokeWidth={1.8} aria-hidden="true"/><span>{label}</span></button>)}
          </nav>
          <div className="mt-6 hidden border-t border-[#e8e9e5] px-2 pt-4 lg:block"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#a0a39d]">Challenge</p><div className="mt-3 flex items-center justify-between text-xs"><span className="text-[#70756e]">Starting funds</span><span className="font-medium">{money(STARTING_FUNDS)}</span></div><div className="mt-2 flex items-center justify-between text-xs"><span className="text-[#70756e]">Timeline</span><span className="font-medium">30 days</span></div></div>
        </aside>

        <main className="min-w-0 px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
          <section id="overview" className={activeSection === "overview" ? "scroll-mt-20" : "hidden"}>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e7e8e3] pb-5">
              <div><div className="mb-2 flex items-center gap-2 text-xs text-[#858981]"><span>Survive30</span><ChevronRight size={13}/><span>Overview</span></div><h1 className="text-[1.65rem] font-semibold tracking-[-0.04em] sm:text-2xl">Your money, in one place</h1><p className="mt-1.5 text-sm text-[#777c74]">A simple view of your 30-day challenge and the choices ahead.</p></div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${riskClass}`}><ShieldCheck size={14} aria-hidden="true"/>{budget.risk} risk</span>
            </div>
            <div className="mt-5 grid grid-cols-2 border-y border-[#e7e8e3] md:grid-cols-4">
              <WorkspaceMetric label="Available to spend" value={money(budget.availableToSpend)} note="After savings & planned bills" strong/>
              <WorkspaceMetric label="Daily allowance" value={money(budget.dailyAllowance)} note={`${budget.daysRemaining} days remaining`}/>
              <WorkspaceMetric label="Projected month-end" value={budget.projectedAvailable === null ? "—" : money(budget.projectedAvailable)} note="Estimate, not guaranteed"/>
              <WorkspaceMetric label="Financial risk" value={`${budget.risk} risk`} note={budget.risk === "High" ? "Forecast is below zero" : budget.risk === "Medium" ? "Forecast buffer is under 20%" : "Forecast buffer is at least 20%"}/>
            </div>
            <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)]">
              <section className="min-w-0" aria-labelledby="health-title">
                <div className="flex items-center justify-between border-b border-[#e7e8e3] pb-3"><div><h2 id="health-title" className="text-sm font-semibold">{budget.health}</h2><p className="mt-1 text-xs text-[#838880]">{budget.projectedAvailable === null ? "A spending pace will appear after one day is complete." : budget.projectedAvailable < 0 ? `At the observed pace, spending may exceed the plan by ${money(Math.abs(budget.projectedAvailable))}.` : budget.projectedAvailable < STARTING_FUNDS * 0.1 ? "Your forecast leaves a small buffer. Review upcoming costs before spending." : "Your current plan leaves a positive forecast buffer."}</p></div><span className={`rounded px-2 py-1 text-xs font-medium ${riskClass}`}>{budget.risk} risk</span></div>
                <p className="flex gap-2 pt-3 text-xs leading-5 text-[#858981]"><CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true"/>Forecast uses paid spending from completed days, excludes today’s spending from the average, then projects that pace across full future days. It is an estimate, not a guarantee.</p>
                <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setActiveSection("activity")} className={primaryButton}>Record spending <ArrowRight size={14}/></button><button type="button" onClick={() => setActiveSection("simulator")} className={secondaryButton}>Simulate a decision</button></div>
              </section>
              <section className="border-t border-[#e7e8e3] pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0" aria-labelledby="progress-title">
                <div className="flex items-center justify-between"><h2 id="progress-title" className="text-sm font-semibold">Challenge progress</h2><span className="text-xs text-[#838880]">{budget.completedDays} / {CHALLENGE_DAYS} days</span></div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e9ebe6]" role="progressbar" aria-label="Challenge days completed" aria-valuenow={budget.completedDays} aria-valuemin={0} aria-valuemax={CHALLENGE_DAYS}><div className="h-full rounded-full bg-[#81977a]" style={{ width: `${budget.progressPercent}%` }}/></div>
                <p className="mt-3 text-xs leading-5 text-[#7c817a]">{budget.isComplete ? "All 30 days are complete." : `Day ${budget.displayDay} is in progress · ${budget.completedDays} completed · ${budget.daysRemaining} remaining, including today.`}</p>
                {!budget.isComplete && <button onClick={() => dispatch({ type: "advance-day" })} className={`${secondaryButton} mt-3`}>{budget.displayDay === CHALLENGE_DAYS ? "Finish day 30" : `Advance to day ${budget.displayDay + 1}`}<ArrowRight size={14}/></button>}
                <div className="mt-5 border-t border-[#e7e8e3] pt-4"><h3 className="text-sm font-semibold">Recent activity</h3>{transactions.length === 0 ? <p className="mt-2 text-xs leading-5 text-[#858981]">No activity yet. Add income or record a paid expense in Activity.</p> : <ul className="mt-2 divide-y divide-[#eff0ed]">{transactions.slice(0, 3).map((item) => <li key={`recent-${item.kind}-${item.id}`} className="flex items-center justify-between gap-3 py-2 text-xs"><span className="min-w-0 truncate font-medium">{item.name}<span className="ml-2 font-normal text-[#92968f]">Day {item.day}</span></span><span className={item.kind === "Income" ? "shrink-0 text-[#426843]" : "shrink-0 text-[#555b53]"}>{item.kind === "Income" ? "+" : "−"}{money(item.amount)}</span></li>)}</ul>}</div>
              </section>
            </div>
          </section>

          <section id="transactions" className={activeSection === "activity" ? "scroll-mt-20" : "hidden"} aria-labelledby="transactions-title">
            <SectionHeading eyebrow="Activity" title="Transactions" description="Money received and paid spending are recorded separately."/>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <EntryForm title="Add income received" name={incomeName} onName={setIncomeName} amount={incomeAmount} onAmount={setIncomeAmount} nameLabel="Income source" namePlaceholder="e.g. Part-time work" buttonLabel="Add income" icon={<ArrowDownLeft size={15}/>} onSubmit={() => addEntry("income")} disabled={state.day > CHALLENGE_DAYS}/>
              <EntryForm title="Record paid expense" name={expenseName} onName={setExpenseName} amount={expenseAmount} onAmount={setExpenseAmount} nameLabel="Expense description" namePlaceholder="e.g. Lunch" buttonLabel="Add expense" icon={<Plus size={15}/>} onSubmit={() => addEntry("expense")} disabled={state.day > CHALLENGE_DAYS}/>
            </div>
            {transactionError && <p role="alert" className="mt-2 text-xs font-medium text-[#985447]">{transactionError}</p>}
            <div className="mt-5 overflow-x-auto rounded-md border border-[#e7e8e3] bg-white">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm"><thead><tr className="border-b border-[#e7e8e3] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#8a8f87]"><th className="px-4 py-3">Description</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Day</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody>{transactions.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-[#898e86]">No transactions yet. Add income or a paid expense above.</td></tr> : transactions.map((item) => <tr key={`${item.kind}-${item.id}`} className="border-b border-[#f0f1ee] last:border-b-0"><td className="px-4 py-3 font-medium">{item.name}</td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-xs ${item.kind === "Income" ? "bg-[#edf3eb] text-[#426843]" : "bg-[#f2f2ef] text-[#696e67]"}`}>{item.kind === "Income" ? "Income received" : item.category}</span></td><td className="px-4 py-3 text-[#777c74]">Day {item.day}</td><td className={`px-4 py-3 text-right font-medium ${item.kind === "Income" ? "text-[#426843]" : "text-[#414640]"}`}>{item.kind === "Income" ? "+" : "−"}{money(item.amount)}</td></tr>)}</tbody></table>
            </div>
          </section>

          {activeSection === "money-plan" && <div className="mb-5 flex flex-wrap gap-1 border-b border-[#e7e8e3] pb-2" role="tablist" aria-label="Money Plan sections">{[{id:"budget-goals",label:"Budget & Goals"},{id:"commitments",label:"Upcoming commitments"},{id:"subscriptions",label:"Subscriptions"}].map((tab)=><button key={tab.id} type="button" role="tab" aria-selected={moneyPlanTab===tab.id} onClick={()=>setMoneyPlanTab(tab.id)} className={`rounded-md px-3 py-2 text-sm ${moneyPlanTab===tab.id?"bg-[#eeefeb] font-semibold text-[#30352e]":"text-[#70756e] hover:bg-[#f0f1ed]"}`}>{tab.label}</button>)}</div>}
          <section id="budget-goals" className={activeSection === "money-plan" && moneyPlanTab === "budget-goals" ? "scroll-mt-20" : "hidden"} aria-labelledby="budget-title">
            <SectionHeading eyebrow="Plan" title="Budget & goals" description="Cash, commitments, and set-aside savings stay distinct."/>
            <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(270px,0.8fr)]">
              <div className="divide-y divide-[#e7e8e3] border-y border-[#e7e8e3]">
                <BreakdownRow label="Starting funds" amount={money(STARTING_FUNDS)} note="Challenge starting amount"/>
                <BreakdownRow label="Income received" amount={`+ ${money(budget.incomeReceived)}`} note="Funds recorded as received"/>
                <BreakdownRow label="Paid expenses" amount={`− ${money(budget.paidExpenses)}`} note="Only confirmed/paid transactions"/>
                <BreakdownRow label="Cash balance" amount={money(budget.cashBalance)} note="Starting funds + income − paid expenses" bold/>
                <BreakdownRow label="Reserved savings" amount={`− ${money(budget.reservedSavings)}`} note="Still yours, but set aside for your goal"/>
                <BreakdownRow label="Unpaid commitments & subscriptions" amount={`− ${money(budget.reservedCharges)}`} note="Planned charges during this challenge"/>
                <BreakdownRow label="Available to spend" amount={money(budget.availableToSpend)} note="Cash after reservations" bold/>
              </div>
              <div className="border-y border-[#e7e8e3] py-4">
                <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Savings goal</h3><p className="mt-1 text-xs text-[#858981]">Set aside cash without counting it as spending.</p></div><Sparkles size={17} className="text-[#748a6d]" aria-hidden="true"/></div>
                <label htmlFor="goal-name" className="sr-only">Savings goal name</label><input id="goal-name" value={goalName} onChange={(event) => setGoalName(event.target.value)} placeholder="Goal name" className={`${fieldClass} mt-3`}/>
                <label htmlFor="goal-target" className="mb-1 mt-3 block text-xs font-medium text-[#737970]">Goal target (₹)</label><input id="goal-target" type="number" min="0.01" step="0.01" value={goalTarget} onChange={(event) => setGoalTarget(event.target.value)} className={fieldClass}/>
                <div className="mt-3 flex justify-between text-xs text-[#747a72]"><span>Set aside {money(budget.reservedSavings)}</span><span>Target {money(targetValue)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded bg-[#e9ebe6]" role="progressbar" aria-label="Savings goal progress" aria-valuenow={targetValue > 0 ? Math.min(100, Math.round(budget.reservedSavings / targetValue * 100)) : 0} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-[#81977a]" style={{ width: `${targetValue > 0 ? Math.min(100, budget.reservedSavings / targetValue * 100) : 0}%` }}/></div>
                <div className="mt-3 flex gap-2"><label htmlFor="savings-amount" className="sr-only">Amount to reserve or release</label><input id="savings-amount" type="number" min="0.01" step="0.01" value={savingsInput} onChange={(event) => {setSavingsInput(event.target.value); setGoalError("");}} placeholder="Amount ₹" className={fieldClass}/><button onClick={contributeSavings} className={primaryButton}>Reserve</button></div>
                <button onClick={() => { const amount = parsePositiveAmount(savingsInput); if (amount === null || amount > budget.reservedSavings) { setGoalError("Enter a positive amount no greater than savings already set aside."); return; } dispatch({ type: "release-savings", amount }); setSavingsInput(""); setGoalError(""); }} disabled={budget.reservedSavings <= 0} className={`${secondaryButton} mt-2 w-full`}>Release set-aside funds</button>
                {goalError && <p role="alert" className="mt-2 text-xs font-medium text-[#985447]">{goalError}</p>}
              </div>
            </div>
          </section>

          <section id="commitments" className={activeSection === "money-plan" && moneyPlanTab === "commitments" ? "scroll-mt-20" : "hidden"} aria-labelledby="commitments-title">
            <SectionHeading eyebrow="Plan ahead" title="Commitments" description="Unpaid planned bills are reserved; marking one paid moves it into transactions."/>
            {state.commitments.length === 0 ? <p className="mt-4 border-y border-[#e7e8e3] py-5 text-sm text-[#838880]">No commitments added. Add bills or planned payments to reserve them in your budget.</p> : <div className="mt-4 divide-y divide-[#e7e8e3] border-y border-[#e7e8e3]">{state.commitments.slice().sort((a,b) => a.dueDay-b.dueDay).map((item) => <PlannedRow key={item.id} item={item} dueLabel={`Due day ${item.dueDay}`} onPay={() => payCommitment(item)} onRemove={() => dispatch({ type: "remove-commitment", id: item.id })} canPay={item.amount <= budget.cashBalance - budget.reservedSavings}/>)}</div>}
            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(150px,1fr)_150px_115px_auto]">
              <label className="sr-only" htmlFor="commitment-name">Commitment name</label><input id="commitment-name" value={commitmentName} onChange={(event) => setCommitmentName(event.target.value)} placeholder="e.g. Electricity bill" className={fieldClass}/>
              <label className="sr-only" htmlFor="commitment-amount">Commitment amount</label><input id="commitment-amount" type="number" min="0.01" step="0.01" value={commitmentAmount} onChange={(event) => setCommitmentAmount(event.target.value)} placeholder="Amount ₹" className={fieldClass}/>
              <label className="sr-only" htmlFor="commitment-day">Due day</label><input id="commitment-day" type="number" min={state.day} max={CHALLENGE_DAYS} value={commitmentDay} onChange={(event) => setCommitmentDay(event.target.value)} aria-label="Due day" className={fieldClass}/>
              <button onClick={addCommitment} disabled={state.day > CHALLENGE_DAYS} className={primaryButton}><Plus size={15}/>Add commitment</button>
            </div>
            {commitmentError && <p role="alert" className="mt-2 text-xs font-medium text-[#985447]">{commitmentError}</p>}
          </section>

          <section id="subscriptions" className={activeSection === "money-plan" && moneyPlanTab === "subscriptions" ? "scroll-mt-20" : "hidden"} aria-labelledby="subscriptions-title">
            <SectionHeading eyebrow="Recurring costs" title="Subscriptions" description="Add a recurring charge. Each occurrence is reserved until you mark it paid."/>
            {listedSubscriptions.length === 0 ? <p className="mt-4 border-y border-[#e7e8e3] py-5 text-sm text-[#838880]">No subscriptions yet. Recurring costs you add will appear here and in your reserved charges.</p> : <div className="mt-4 divide-y divide-[#e7e8e3] border-y border-[#e7e8e3]">{listedSubscriptions.map((item) => <PlannedRow key={item.id} item={item} dueLabel={item.dueDay <= CHALLENGE_DAYS ? `Next charge day ${item.dueDay} · repeats every ${item.intervalDays} days` : `Next cycle after day 30 · repeats every ${item.intervalDays} days`} onPay={() => paySubscription(item)} onRemove={() => dispatch({ type: "remove-subscription", id: item.id })} canPay={item.dueDay <= state.day && item.amount <= budget.cashBalance - budget.reservedSavings}/>)}</div>}
            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(130px,1fr)_125px_105px_110px_auto]">
              <label className="sr-only" htmlFor="subscription-name">Subscription name</label><input id="subscription-name" value={subscriptionName} onChange={(event) => setSubscriptionName(event.target.value)} placeholder="e.g. Music plan" className={fieldClass}/>
              <label className="sr-only" htmlFor="subscription-amount">Subscription amount</label><input id="subscription-amount" type="number" min="0.01" step="0.01" value={subscriptionAmount} onChange={(event) => setSubscriptionAmount(event.target.value)} placeholder="Amount ₹" className={fieldClass}/>
              <label className="sr-only" htmlFor="subscription-day">First due day</label><input id="subscription-day" type="number" min={state.day} max={CHALLENGE_DAYS} value={subscriptionDay} onChange={(event) => setSubscriptionDay(event.target.value)} aria-label="First due day" className={fieldClass}/>
              <label className="sr-only" htmlFor="subscription-interval">Repeat every days</label><select id="subscription-interval" value={subscriptionInterval} onChange={(event) => setSubscriptionInterval(event.target.value)} className={fieldClass}><option value="7">Weekly</option><option value="14">Every 2 weeks</option><option value="30">Monthly</option></select>
              <button onClick={addSubscription} disabled={state.day > CHALLENGE_DAYS} className={primaryButton}><Plus size={15}/>Add subscription</button>
            </div>
            {subscriptionError && <p role="alert" className="mt-2 text-xs font-medium text-[#985447]">{subscriptionError}</p>}
          </section>

          <section id="simulator" className={activeSection === "simulator" ? "scroll-mt-20" : "hidden"} aria-labelledby="simulator-title">
            <SectionHeading eyebrow="Decision planning" title="Should this wait, or fit the plan?" description="Compare the same live budget under three choices. Nothing is recorded until you confirm a purchase."/>
            <div className="mt-5 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
              <form className="space-y-3 border-y border-[#e7e8e3] py-4" onSubmit={(event) => { event.preventDefault(); previewDecision(); }}>
                <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setSimKind("purchase"); setSimName(""); setSimAmount(""); setAlternativeAmount(""); cancelSimulation(); }} aria-pressed={simKind === "purchase"} className={`${secondaryButton} ${simKind === "purchase" ? "border-[#81977a] bg-[#eff3ed] text-[#435e42]" : ""}`}>Compare a purchase</button><button type="button" onClick={() => { setSimKind("unexpected"); setSimName("Urgent repair"); setSimAmount("1200"); setAlternativeAmount(""); cancelSimulation(); }} aria-pressed={simKind === "unexpected"} className={`${secondaryButton} ${simKind === "unexpected" ? "border-[#81977a] bg-[#eff3ed] text-[#435e42]" : ""}`}>Unexpected cost</button></div>
                <div><label htmlFor="sim-name" className="mb-1 block text-xs font-medium text-[#71766f]">Decision name</label><input id="sim-name" value={simName} onChange={(event) => setSimName(event.target.value)} placeholder={simKind === "purchase" ? "e.g. Headphones" : "e.g. Urgent repair"} className={fieldClass} required/></div>
                {simKind === "purchase" && <div><label htmlFor="sim-category" className="mb-1 block text-xs font-medium text-[#71766f]">Category</label><select id="sim-category" value={simCategory} onChange={(event) => setSimCategory(event.target.value)} className={fieldClass}><option>Personal</option><option>Food</option><option>Travel</option><option>Education</option><option>Health</option><option>Other</option></select></div>}
                <div className="grid grid-cols-2 gap-2"><div><label htmlFor="sim-amount" className="mb-1 block text-xs font-medium text-[#71766f]">{simKind === "purchase" ? "Full price (\u20B9)" : "Expense amount (\u20B9)"}</label><input id="sim-amount" type="number" min="0.01" step="0.01" value={simAmount} onChange={(event) => setSimAmount(event.target.value)} placeholder="0.00" className={fieldClass} required/></div>{simKind === "purchase" && <div><label htmlFor="alternative-amount" className="mb-1 block text-xs font-medium text-[#71766f]">Alternative price (\u20B9)</label><input id="alternative-amount" type="number" min="0.01" step="0.01" value={alternativeAmount} onChange={(event) => setAlternativeAmount(event.target.value)} placeholder="Lower price" className={fieldClass} required/></div>}</div>
                <div><label htmlFor="sim-day" className="mb-1 block text-xs font-medium text-[#71766f]">Optional simulation day</label><input id="sim-day" type="number" min={budget.displayDay} max={CHALLENGE_DAYS} value={simDay} onChange={(event) => setSimDay(event.target.value)} placeholder={`Today \u00b7 day ${budget.displayDay}`} className={fieldClass}/><p className="mt-1 text-[0.68rem] text-[#858981]">A planned day is for preview only. A confirmed payment must be dated today.</p></div>
                <button type="submit" className={primaryButton}><Sparkles size={14}/>Simulate decision</button>
                {simulationError && <p role="alert" className="text-xs font-medium text-[#985447]">{simulationError}</p>}
              </form>
              <div className="min-w-0">
                <div className="overflow-x-auto border-y border-[#e7e8e3]"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="border-b border-[#e7e8e3] text-[0.65rem] uppercase tracking-wide text-[#858981]"><th className="py-3 pr-3">Scenario</th><th className="px-2 py-3">Available after decision</th><th className="px-2 py-3">Daily allowance</th><th className="px-2 py-3">Day-30 estimate</th><th className="px-2 py-3">Risk / health</th><th className="py-3 pl-2">Plan coverage</th></tr></thead><tbody>{(simKind === "unexpected" ? [simulations.unexpected] : [simulations.buy, simulations.skip, simulations.alternative]).map((scenario) => scenario && <tr key={scenario.id} className="border-b border-[#f0f1ee] last:border-0"><th scope="row" className="py-3 pr-3 font-semibold">{scenario.label}</th><td className="px-2 py-3 tabular-nums">{money(scenario.budget.availableToSpend)}</td><td className="px-2 py-3 tabular-nums">{money(scenario.budget.dailyAllowance)}</td><td className="px-2 py-3 tabular-nums">{scenario.budget.projectedAvailable === null ? "Needs 1 completed day" : money(scenario.budget.projectedAvailable)}</td><td className="px-2 py-3"><span>{scenario.budget.risk} / {scenario.budget.health}</span><span className="mt-1 block text-[0.65rem] text-[#858981]">{scenario.budget.risk === budget.risk && scenario.budget.health === budget.health ? "Same as current" : `Changed from ${budget.risk} / ${budget.health}`}</span></td><td className="py-3 pl-2">{scenario.commitmentsCovered ? "Bills covered" : "Bill shortfall"}; {scenario.savingsTargetReachable ? "goal reachable" : "goal shortfall"}</td></tr>)}</tbody></table></div>
                {simKind === "purchase" && simulationValue !== null && alternativeValue !== null && <p className="mt-3 text-xs text-[#686e66]">{money(simulationValue)} preserved by skipping &middot; {money(simulationValue - alternativeValue)} saved with the cheaper option.{alternativeValue > simulationValue ? " The alternative costs more than the full price." : ""}</p>}
                {previewOpen && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#e2e4de] bg-white p-3" aria-live="polite"><p className="text-xs text-[#62685f]">Preview only &middot; {simKind === "unexpected" ? "No expense has been recorded." : "Choose whether to buy, skip, or use the alternative."}</p><div className="flex flex-wrap gap-2">{simKind === "purchase" && <><button type="button" onClick={() => confirmSimulation("buy")} disabled={!simulations.buy || simulationValue === null || simulationValue > budget.availableToSpend || plannedDay !== state.day} className={primaryButton}>Confirm buy</button><button type="button" onClick={() => confirmSimulation("alternative")} disabled={!simulations.alternative || alternativeValue === null || alternativeValue > budget.availableToSpend || plannedDay !== state.day} className={secondaryButton}>Confirm alternative</button><button type="button" onClick={cancelSimulation} className={secondaryButton}>Skip / cancel</button></>}{simKind === "unexpected" && <><button type="button" onClick={() => confirmSimulation("unexpected")} disabled={!simulations.unexpected || simulationValue === null || simulationValue > budget.availableToSpend || plannedDay !== state.day} className={primaryButton}>Confirm expense</button><button type="button" onClick={cancelSimulation} className={secondaryButton}>Cancel preview</button></>}</div></div>}
                <div className="mt-5"><h3 className="text-sm font-semibold">Remaining-day cash-flow forecast</h3><p className="mt-1 text-xs text-[#858981]">Current spendable balance to estimated day-30 balance. Only completed-day spending is carried forward.</p><ScenarioChart scenarios={(simKind === "unexpected" ? [simulations.skip, simulations.unexpected] : [simulations.skip, simulations.buy, simulations.alternative]).filter((item): item is NonNullable<typeof item> => item !== null)}/></div>
                <div className="mt-4 grid gap-2 border-t border-[#e7e8e3] pt-3 sm:grid-cols-2"><p className="text-xs leading-5 text-[#777c74]">Commitments: {money(budget.reservedCharges)} stays reserved in every option; a scenario flags a shortfall if cash after that choice cannot cover savings plus unpaid bills.</p><p className="text-xs leading-5 text-[#777c74]">Savings: {money(budget.reservedSavings)} remains set aside. A choice can make the remaining goal target harder to reach, but simulation never moves savings.</p></div>
              </div>
            </div>
          </section>

          {budget.isComplete && <section id="summary" className={activeSection === "overview" ? "mt-6 border-t border-[#e7e8e3] pt-5" : "hidden"} aria-labelledby="summary-title"><SectionHeading eyebrow="Challenge complete" title="Your day-30 summary" description="A closing snapshot from the entries recorded in this workspace."/><div className="mt-4 grid gap-x-6 border-y border-[#e7e8e3] sm:grid-cols-2 xl:grid-cols-4"><WorkspaceMetric label="Ending cash balance" value={money(budget.cashBalance)} note="Funds plus received income less paid expenses"/><WorkspaceMetric label="Income received" value={money(budget.incomeReceived)} note="Recorded during the challenge"/><WorkspaceMetric label="Total paid spending" value={money(summaryExpenses)} note="Recorded transactions"/><WorkspaceMetric label="Still reserved" value={money(budget.reservedSavings + budget.reservedCharges)} note="Savings and unpaid planned charges"/></div><p className="mt-4 text-sm text-[#757a73]">Your cash balance is {money(budget.cashBalance)} and available-to-spend is {money(budget.availableToSpend)} after remaining reserves.</p></section>}
          <footer className="mt-10 border-t border-[#e7e8e3] py-5 text-center text-xs text-[#92968f]">SURVIVE30 · ₹10,000 over 30 days · Estimates are informational, not financial advice.</footer>
        </main>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#949991]">{eyebrow}</p><h2 className="mt-1 text-lg font-semibold tracking-[-0.025em]">{title}</h2><p className="mt-1 text-sm text-[#7d827a]">{description}</p></div>;
}

function WorkspaceMetric({ label, value, note, strong = false }: { label: string; value: string; note: string; strong?: boolean }) {
  return <div className="min-w-0 border-b border-[#e7e8e3] px-3 py-4 first:pl-0 md:border-b-0 md:border-r md:px-4 md:first:pl-0 xl:border-b-0 xl:py-4 xl:last:border-r-0"><p className="text-[0.68rem] font-medium text-[#838880]">{label}</p><p className={`mt-1.5 truncate text-lg tracking-[-0.025em] ${strong ? "font-semibold text-[#405b40]" : "font-semibold"}`}>{value}</p><p className="mt-1 text-[0.65rem] leading-4 text-[#92968f]">{note}</p></div>;
}

function ScenarioChart({ scenarios }: { scenarios: DecisionScenario[] }) {
  const forecasted = scenarios.filter((scenario) => scenario.budget.projectedAvailable !== null);
  if (forecasted.length === 0) return <p className="mt-3 border-y border-[#e7e8e3] py-4 text-xs leading-5 text-[#858981]">The model needs one completed day to estimate future spending. Scenario balances above are still calculated from the current ledger.</p>;
  const values = forecasted.flatMap((scenario) => [scenario.budget.availableToSpend, scenario.budget.projectedAvailable ?? scenario.budget.availableToSpend]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = Math.max(300, (rawMax - rawMin) * 0.12);
  const min = rawMin - padding;
  const max = rawMax + padding || 1;
  const y = (value: number) => 18 + (142 * (max - value)) / (max - min);
  const colors = { skip: "#778574", buy: "#435e42", alternative: "#b28646", unexpected: "#985447" };
  return <figure className="mt-3 overflow-hidden border-y border-[#e7e8e3] py-3" aria-label="Forecast comparison">
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem] text-[#656b63]">{forecasted.map((scenario) => <span key={scenario.id} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[scenario.id] }}/>{scenario.label}</span>)}</div>
    <div className="mt-2 overflow-x-auto"><svg viewBox="0 0 640 190" role="img" aria-labelledby="scenario-chart-title scenario-chart-desc" className="h-44 min-w-[520px] w-full">
      <title id="scenario-chart-title">Projected spendable balance by scenario</title><desc id="scenario-chart-desc">Lines connect each scenario&apos;s available balance after the decision to its estimated balance on day 30. Estimates use the completed-day spending pace.</desc>
      {[0, 1, 2].map((step) => { const value = max - (max - min) * step / 2; const lineY = y(value); return <g key={step}><line x1="58" x2="620" y1={lineY} y2={lineY} stroke="#e8eae5" strokeDasharray="3 4"/><text x="4" y={lineY + 4} fill="#858981" fontSize="10">{money(value)}</text></g>; })}
      <text x="58" y="181" fill="#858981" fontSize="10">After decision</text><text x="570" y="181" fill="#858981" fontSize="10">Day 30</text>
      {forecasted.map((scenario) => { const color = colors[scenario.id]; const start = scenario.budget.availableToSpend; const end = scenario.budget.projectedAvailable ?? start; return <g key={scenario.id}><line x1="70" x2="600" y1={y(start)} y2={y(end)} stroke={color} strokeWidth="2.5"/><circle cx="70" cy={y(start)} r="4" fill={color}/><circle cx="600" cy={y(end)} r="4" fill={color}/></g>; })}
    </svg></div>
    <figcaption className="mt-1 text-[0.68rem] text-[#858981]">Forecast, not a guarantee; no unrecorded future purchases or random spending included.</figcaption>
  </figure>;
}

function EntryForm({ title, name, onName, amount, onAmount, nameLabel, namePlaceholder, buttonLabel, icon, onSubmit, disabled }: { title: string; name: string; onName: (value: string) => void; amount: string; onAmount: (value: string) => void; nameLabel: string; namePlaceholder: string; buttonLabel: string; icon: React.ReactNode; onSubmit: () => void; disabled: boolean }) {
  const idPrefix = buttonLabel.toLowerCase().replaceAll(" ", "-");
  return <div className="border-y border-[#e7e8e3] py-3"><h3 className="mb-2 text-xs font-semibold">{title}</h3><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_130px_auto]"><label className="sr-only" htmlFor={`${idPrefix}-name`}>{nameLabel}</label><input id={`${idPrefix}-name`} value={name} onChange={(event) => onName(event.target.value)} placeholder={namePlaceholder} className={fieldClass}/><label className="sr-only" htmlFor={`${idPrefix}-amount`}>Amount in rupees</label><input id={`${idPrefix}-amount`} type="number" min="0.01" step="0.01" value={amount} onChange={(event) => onAmount(event.target.value)} placeholder="Amount ₹" className={fieldClass}/><button onClick={onSubmit} disabled={disabled} className={primaryButton}>{icon}{buttonLabel}</button></div></div>;
}

function BreakdownRow({ label, amount, note, bold = false }: { label: string; amount: string; note: string; bold?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-3"><div><p className={`text-sm ${bold ? "font-semibold" : "font-medium"}`}>{label}</p><p className="mt-0.5 text-xs text-[#878c84]">{note}</p></div><p className={`shrink-0 text-sm tabular-nums ${bold ? "font-semibold" : "font-medium"}`}>{amount}</p></div>;
}

function PlannedRow({ item, dueLabel, onPay, onRemove, canPay }: { item: PlannedCharge; dueLabel: string; onPay: () => void; onRemove: () => void; canPay: boolean }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-[170px]"><p className="text-sm font-medium">{item.name}</p><p className="mt-1 text-xs text-[#838880]">{dueLabel} · {money(item.amount)} per charge</p></div><div className="flex items-center gap-2"><span className="rounded bg-[#f2f2ef] px-2 py-1 text-[0.68rem] text-[#686e66]">Unpaid</span><button onClick={onPay} disabled={!canPay} title={canPay ? "Record the payment" : "Not enough cash after other reservations"} className={secondaryButton}><Check size={13}/>Mark paid</button><button onClick={onRemove} aria-label={`Remove ${item.name}`} className="rounded p-1.5 text-[#858981] hover:bg-[#f0f1ed] hover:text-[#555a53]"><Trash2 size={14}/></button></div></div>;
}
