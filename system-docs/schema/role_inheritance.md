---
title: "role_inheritance"
source: "003_rbac_schema.sql"

---

# Table: role_inheritance

Columns:

- id SERIAL PRIMARY KEY
- parent_role_id INTEGER NOT NULL
- child_role_id INTEGER NOT NULL
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- FOREIGN KEY
