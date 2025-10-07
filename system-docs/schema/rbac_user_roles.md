---
title: "rbac_user_roles"
source: "005_rbac_standalone.sql"

---

# Table: rbac_user_roles

Columns:

- id SERIAL PRIMARY KEY
- user_id INTEGER NOT NULL
- role_id INTEGER REFERENCES rbac_roles
