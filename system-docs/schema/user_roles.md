---
title: "user_roles"
source: "003_rbac_schema.sql"

---

# Table: user_roles

Columns:

- id SERIAL PRIMARY KEY
- user_id INTEGER NOT NULL
- role_id INTEGER NOT NULL
- assigned_by INTEGER
- assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- is_active BOOLEAN DEFAULT true
- FOREIGN KEY
