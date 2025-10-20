Super Admin layout scaffolding

Use the reusable shell to give any new/undeveloped page the exact Super Admin layout (top bar, dark theme, dynamic sidebar).

Files
- src/components/layouts/SuperAdminShell.tsx — layout shell component
- src/app/_templates/blank-sadmin-page.tsx — ready-made blank page using the shell

How to create a new page quickly
1) Copy the template file:
   - src/app/_templates/blank-sadmin-page.tsx -> src/app/<your-route>/page.tsx
2) Open the new file and change the title and content inside SuperAdminShell.
3) Add your module content inside the children area. The top bar and sidebar will remain consistent.

Example
- Create src/app/system/feature-x/page.tsx using the template, set title="Feature X", and start building inside the card.

Notes
- The shell already matches the Super Admin Control Panel styling (dark slate theme, header/controls, dynamic sidebar).
- Works with mobile: collapsible sidebar toggler is built in.