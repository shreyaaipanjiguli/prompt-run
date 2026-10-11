# Survive30 — Personal Finance Simulator

**A smarter way to make every rupee count.**

**Live Demo:** https://prompt-run-sandy.vercel.app  
**GitHub Repository:** https://github.com/shreyaaipanjiguli/prompt-run

## Overview

Survive30 is a personal finance experience designed for Gen Z to manage a limited budget of **₹10,000 over 30 days**.

Instead of simply recording expenses, Survive30 helps users understand the consequences of financial decisions before making them. Users can explore spending scenarios, account for upcoming commitments, protect savings goals, and see how their choices affect their remaining balance, daily allowance, projected month-end balance, and financial health.

The goal is simple: make financial decisions more transparent, understandable, and intentional.

## The Problem

Managing a limited budget can be challenging when everyday purchases compete with bills, subscriptions, savings goals, and unexpected expenses.

Traditional expense trackers mainly show users where their money went. They may not help users understand whether a purchase is affordable or how it could affect the rest of the month.

Survive30 addresses this challenge through an interactive financial planning and decision-simulation experience.

## Key Features

### 1. Financial Overview
- View available funds and spending at a glance.
- Track daily allowance and budget progress.
- View projected Day-30 balance.
- Understand financial risk and the factors influencing it.

### 2. Money Plan
- Organize income and available funds.
- Account for savings allocations and goals.
- Track upcoming financial commitments.
- Include subscriptions and unpaid obligations in financial planning.

### 3. Activity Tracking
- Review recorded transactions.
- Understand how paid expenses affect available funds.
- Keep financial activity connected to the overall budget.

### 4. Decision Simulator
- Compare buying, skipping, and alternative purchase scenarios.
- Explore the effect of unexpected expenses.
- Compare available-to-spend amounts, daily allowance, and projected Day-30 balance.
- Understand how decisions affect savings goals, commitments, and financial risk.
- Preview hypothetical decisions before committing them.
- Prevent unaffordable purchases from being confirmed.

### 5. Financial Forecasting
- Estimate the projected balance at the end of the 30-day period.
- Use a baseline spending estimate when completed-day spending history is unavailable.
- Incorporate observed spending history when available.
- Make financial risk more understandable through explicit rules and explanations.

### 6. Connected Financial State
Financial information is shared across the app so that recorded expenses and confirmed decisions can affect the relevant financial views rather than remaining isolated in separate screens.

## How It Works

1. **Start with a ₹10,000 budget.** Understand your available funds and daily spending allowance.
2. **Plan your money.** Account for savings goals, commitments, and subscriptions.
3. **Explore a decision.** Compare buying, skipping, or choosing an alternative.
4. **Review the consequences.** Examine affordability, projected balance, daily allowance, and financial risk.
5. **Make an informed choice.** Confirm eligible purchases or keep the decision as a hypothetical scenario.

## Tech Stack

- **Framework:** Next.js
- **Language:** TypeScript
- **UI:** React
- **Charts:** Recharts
- **Styling:** CSS
- **Deployment:** Vercel
- **Version Control:** Git and GitHub

## Getting Started

### Prerequisites

- Node.js and npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/shreyaaipanjiguli/prompt-run.git
```

Navigate to the project directory:

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

### Available Commands

```bash
npm run dev
```

Starts the development server.

```bash
npm run lint
```

Runs lint checks.

```bash
npx tsc --noEmit
```

Checks TypeScript types.

```bash
npm test
```

Runs the project's tests.

```bash
npm run build
```

Builds the application for production.

## Design Principles

Survive30 is designed around the following principles:

- **Clarity:** Present important financial information without unnecessary complexity.
- **Transparency:** Explain projected outcomes and financial risk.
- **Decision-first experience:** Help users evaluate a decision before committing to it.
- **Connected consequences:** Reflect financial decisions across relevant views.
- **Accessible interaction:** Keep navigation, labels, and important warnings understandable.
- **Responsive design:** Aim for a consistent experience across screen sizes.

## Project Structure

```text
prompt-run/
├── app/          # Next.js application pages and styles
├── lib/          # Financial calculations, decision logic, and ledger
├── tests/        # Automated tests
├── public/       # Static assets
├── package.json  # Dependencies and scripts
└── README.md
```

## Future Improvements

Potential areas for further development include:

- Persistent user accounts and financial data.
- Customizable budget periods and financial goals.
- More advanced scenario comparisons.
- Improved financial insights and personalized recommendations.
- Additional accessibility and usability testing.

## Live Application

**Try Survive30:** https://prompt-run-sandy.vercel.app

## Built For

**PROMPT RUN 2026** — a web development hackathon focused on building useful, interactive digital experiences.

---

*Survive30 is an educational budgeting and financial simulation project, not professional financial advice.*