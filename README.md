# Survive30 — Personal Finance Simulator

**Make informed financial decisions before spending your money.**

[**Live Demo**](https://prompt-run-sandy.vercel.app) · [**GitHub Repository**](https://github.com/shreyaaipanjiguli/prompt-run)

---

## Overview

Survive30 is an interactive personal finance experience built for Gen Z to manage a limited budget of **₹10,000 over 30 days**.

Rather than simply recording transactions, Survive30 helps users explore financial decisions before committing to them. It connects available funds, spending, savings goals, upcoming commitments, subscriptions, projected month-end balance, and financial risk in one workspace.

The goal is to make the consequences of everyday financial choices easier to understand.

## The Problem

Managing a limited budget requires balancing daily spending with savings goals, upcoming bills, subscriptions, and unexpected expenses.

A traditional expense tracker can show where money went, but it may not explain whether a planned purchase is affordable or how that decision could affect the rest of the month.

Survive30 addresses this challenge with a connected budgeting experience and an interactive decision simulator that makes potential financial consequences visible before a decision is confirmed.

## Features

### 1. Financial Overview
- View available-to-spend funds and daily allowance.
- Track progress through the 30-day challenge.
- Review the projected Day-30 balance.
- Understand financial risk through visible explanations.
- View baseline estimates when completed-day spending history is unavailable.

### 2. Money Plan
- Review starting funds, received income, and paid expenses.
- Distinguish cash balance from available-to-spend funds.
- Set a savings goal and track the amount actually reserved.
- See how much remains to reach a savings target.
- Account for upcoming commitments and subscriptions.

### 3. Activity Tracking
- Review recorded financial transactions.
- Keep paid expenses connected to the shared budget.
- Understand how confirmed transactions affect available funds.

### 4. Decision Simulator
- Compare buying, skipping, and choosing an alternative.
- Explore the effect of unexpected expenses.
- Review affordability before confirming a decision.
- Compare projected Day-30 outcomes against the Skip scenario.
- Understand potential effects on savings goals, upcoming bills, daily allowance, and financial risk.
- Keep hypothetical scenarios separate from actual financial activity.
- Prevent unaffordable purchases from being confirmed.

### 5. Financial Forecasting
- Estimate the projected balance at the end of the challenge.
- Use a baseline spending rate when completed-day history is unavailable.
- Use observed completed-day spending history when available.
- Explain forecast assumptions and financial risk to help users interpret estimates.

### 6. Accessibility and Usability
- Provide keyboard navigation for Money Plan tabs.
- Link tabs and panels with appropriate accessibility attributes.
- Keep the interface focused on clear financial information and understandable decisions.

## How It Works

1. **Start with ₹10,000.** Review the budget and daily allowance.
2. **Plan ahead.** Set savings goals and account for upcoming commitments.
3. **Explore a decision.** Compare a purchase with skipping it or selecting an alternative.
4. **Review the consequences.** Examine affordability, projected balance, and financial risk.
5. **Confirm carefully.** Eligible purchases can update the actual ledger; hypothetical scenarios remain separate.

## Technology Stack

- **Framework:** Next.js
- **UI library:** React
- **Language:** TypeScript
- **Styling:** Tailwind CSS and global CSS
- **Scenario visualization:** Inline SVG
- **Testing:** Node.js test runner
- **Version control:** Git and GitHub
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js
- npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/shreyaaipanjiguli/prompt-run.git
```

Move into the project directory:

```bash
cd prompt-run
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | Run lint checks |
| `npx tsc --noEmit` | Check TypeScript types |
| `npm test` | Run automated tests |
| `npm run build` | Build the production application |

## Project Structure

```text
prompt-run/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── budget.ts
│   ├── decision.ts
│   ├── ledger.ts
│   └── money-plan-tabs.ts
├── tests/
│   ├── budget.test.mjs
│   ├── decision.test.mjs
│   └── money-plan-tabs.test.mjs
├── public/
├── package.json
└── README.md
```

## Design Principles

- **Decision-first finance:** Help users evaluate choices before committing money.
- **Transparency:** Explain forecasts, affordability, and risk.
- **Connected budgeting:** Keep spending, savings, commitments, and projections consistent.
- **Clear financial boundaries:** Separate cash, reserved savings, unpaid obligations, and paid expenses.
- **Responsible simulation:** Keep hypothetical scenarios separate from confirmed transactions.
- **Accessible interaction:** Support keyboard navigation and meaningful relationships between tabs and panels.

## Future Improvements

Potential directions for future development include:

- Persistent financial data and optional user accounts.
- More customizable budgets and savings goals.
- Additional scenario comparisons and financial insights.
- Expanded browser-based accessibility and interaction testing.
- Performance measurement and optimization based on real-world results.

## Live Application

Try Survive30 here:

**https://prompt-run-sandy.vercel.app**

## Built For

**PROMPT RUN 2026** — a web development hackathon.

---

*Survive30 is an educational budgeting and financial simulation project. Its forecasts are estimates, not guarantees, and it does not provide professional financial advice.*