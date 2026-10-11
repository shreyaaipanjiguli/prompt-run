# Survive30 — AI Development Rules

## Project Context
Survive30 is a planned 30-day personal finance simulation. Users will compare the consequences of making a purchase versus skipping it, using a ₹10,000 starting budget.

The official PROMPT RUN challenge statement takes priority over this initial concept. Adapt the project to the actual challenge once it is released.

## Development Principles
- Inspect the existing project structure before making changes.
- Preserve the existing Next.js, TypeScript, and styling setup.
- Use the installed Recharts library when charts are needed.
- Build incrementally and keep the application runnable.
- Prefer simple, maintainable, reusable components.
- Do not introduce unnecessary dependencies.
- Never replace working code without understanding its purpose.
- Do not claim a feature works without testing it.

## UI/UX
- Create a polished, modern, responsive interface.
- Support desktop and mobile screen sizes.
- Maintain consistent spacing, typography, colors, and components.
- Provide clear loading, empty, success, and error states where appropriate.
- Use accessible labels, keyboard navigation, and sufficient contrast.

## Code Quality
- Use TypeScript types appropriately; avoid unnecessary `any`.
- Keep components focused and avoid duplicated logic.
- Handle invalid inputs and edge cases.
- Use meaningful variable and function names.
- Keep secrets and credentials out of source code.
- Never expose private environment variables in client-side code.

## Workflow
1. Read and understand the challenge requirements.
2. Identify the minimum viable product and evaluation criteria.
3. Plan the implementation before editing.
4. Implement the highest-priority functionality first.
5. Run the development server and test the main user flows.
6. Check responsive layouts, accessibility, and console errors.
7. Review the final changes before committing.
8. Deploy and verify the public URL.

## Hackathon Constraints
- Follow the official challenge statement and all event rules.
- Build and submit within the permitted event window.
- Use AI-assisted development tools only as allowed by the organizers.
- Keep the application functional and accessible for evaluation.
- There are three submission chances; the latest valid submission counts.
- Never submit a replacement merely to experiment. Test improvements before the final submission.

## Final Quality Checklist
- The application starts successfully.
- The main user journey works end to end.
- Inputs, calculations, and charts behave correctly.
- No obvious layout overflow on mobile.
- No broken links or buttons.
- No secrets committed to GitHub.
- The production deployment reflects the latest intended code.
- The public URL opens without authentication.