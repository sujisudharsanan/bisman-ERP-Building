# ERP Module Structure

This document outlines the high-level module structure for the BISMAN ERP.

- Core: Auth, RBAC, Users, Orgs, Settings
- Inventory: Items, Stock, Warehouses, Movements
- Sales: Customers, Sales Orders, Invoices
- Purchase: Vendors, Purchase Orders, GRN
- Finance: Accounts, Ledgers, Payments, Reports
- HR: Employees, Attendance, Payroll

Both backend and frontend have mirrored module folders to keep concerns isolated and scalable.
