---
title: "rbac_permissions"
source: "005_rbac_standalone.sql"

---

# Table: rbac_permissions

Columns:

- id SERIAL PRIMARY KEY
- role_id INTEGER REFERENCES rbac_roles
