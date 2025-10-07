---
title: "permissions"
source: "003_rbac_schema.sql"

---

# Table: permissions

Columns:

- id SERIAL PRIMARY KEY
- role_id INTEGER NOT NULL
- route_id INTEGER NOT NULL
- action_id INTEGER NOT NULL
- is_granted BOOLEAN DEFAULT true
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- FOREIGN KEY
