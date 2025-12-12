# Knex Migration Guide - BISMAN ERP

## Quick Reference

### NPM Scripts

```bash
# Check migration status
npm run knex:status         # Custom detailed status
npm run knex:migrate:status # Built-in status

# Run migrations
npm run knex:migrate        # Run all pending migrations
npm run knex:migrate:up     # Run next pending migration

# Rollback
npm run knex:migrate:rollback   # Rollback last batch
npm run knex:migrate:down       # Rollback single migration

# Create new migration
npm run knex:migrate:make -- <migration_name>
# Example: npm run knex:migrate:make -- add_notifications_table

# Seeds
npm run knex:seed           # Run all seeds
npm run knex:seed:make -- <seed_name>
```

### File Structure

```
my-backend/
├── knexfile.js                          # Knex configuration
├── database/
│   ├── knex.js                          # Connection module
│   ├── helpers/
│   │   └── migration-helpers.js         # Safe migration utilities
│   ├── knex-migrations/                 # Migration files
│   │   └── 20251211000000_baseline_schema.js
│   └── knex-seeds/                      # Seed files
└── scripts/
    └── knex-status.js                   # Status script
```

## Creating Migrations

### Basic Template

```javascript
/**
 * Migration: YYYYMMDDHHMMSS_description
 * Purpose: Brief description of what this migration does
 */

const helpers = require('../helpers/migration-helpers');

exports.up = async function(knex) {
  // Create table
  await helpers.createTableIfNotExists(knex, 'my_table', (table) => {
    table.bigIncrements('id').primary();
    table.string('name', 255).notNullable();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  
  // Create index
  await helpers.createIndexIfNotExists(knex, 'my_table', 'idx_my_table_user_id', 'user_id');
};

exports.down = async function(knex) {
  await helpers.dropIndexIfExists(knex, 'idx_my_table_user_id');
  await helpers.dropTableIfExists(knex, 'my_table');
};
```

### Adding Columns

```javascript
exports.up = async function(knex) {
  await helpers.addColumnIfNotExists(knex, 'users', 'phone', (table) => {
    table.string('phone', 20);
  });
};

exports.down = async function(knex) {
  await helpers.dropColumnIfExists(knex, 'users', 'phone');
};
```

### Adding Constraints

```javascript
exports.up = async function(knex) {
  // Foreign Key
  await helpers.addForeignKeyIfNotExists(
    knex, 
    'orders', 
    'fk_orders_user_id', 
    'user_id', 
    'users', 
    'id', 
    'CASCADE'
  );
  
  // CHECK constraint
  await helpers.addCheckConstraintIfNotExists(
    knex,
    'products',
    'chk_products_price_positive',
    'price >= 0'
  );
};

exports.down = async function(knex) {
  await helpers.dropConstraintIfExists(knex, 'orders', 'fk_orders_user_id');
  await helpers.dropConstraintIfExists(knex, 'products', 'chk_products_price_positive');
};
```

## Available Helper Functions

| Function | Description |
|----------|-------------|
| `createTableIfNotExists(knex, name, builder)` | Create table only if it doesn't exist |
| `dropTableIfExists(knex, name)` | Drop table only if it exists |
| `addColumnIfNotExists(knex, table, column, builder)` | Add column if it doesn't exist |
| `dropColumnIfExists(knex, table, column)` | Drop column if it exists |
| `createIndexIfNotExists(knex, table, name, columns)` | Create index if it doesn't exist |
| `dropIndexIfExists(knex, name)` | Drop index if it exists |
| `addForeignKeyIfNotExists(knex, table, name, col, ref, refCol, onDelete)` | Add FK if it doesn't exist |
| `addCheckConstraintIfNotExists(knex, table, name, expression)` | Add CHECK if it doesn't exist |
| `dropConstraintIfExists(knex, table, name)` | Drop any constraint if it exists |
| `renameTableIfExists(knex, oldName, newName)` | Rename table safely |
| `getColumnType(knex, table, column)` | Get column data type |
| `constraintExists(knex, name)` | Check if constraint exists |
| `indexExists(knex, name)` | Check if index exists |
| `safeRaw(knex, sql, errorMsg)` | Execute raw SQL with error handling |

## Environment Configuration

Knex reads from `.env.local`:

```env
# Option 1: Connection URL
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# Option 2: Individual variables
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_NAME=BISMAN
DB_SSL=false
```

## Production Deployment

```bash
# Run migrations in production
NODE_ENV=production npm run knex:migrate

# Check status in production
NODE_ENV=production npm run knex:migrate:status
```

## Best Practices

1. **Always include `down`** - Every migration must be reversible
2. **Use helpers** - Import from `../helpers/migration-helpers` for safety
3. **Idempotent** - Running twice should not break anything
4. **Test locally first** - Run `npm run knex:migrate` locally before deploying
5. **Naming convention** - Use `YYYYMMDDHHMMSS_descriptive_name.js`
6. **One concern per migration** - Keep migrations focused

## Migration Tracking Tables

Knex creates these tables automatically:
- `knex_migrations` - Tracks which migrations have run
- `knex_migrations_lock` - Prevents concurrent migrations

We also created:
- `_schema_info` - Custom metadata about the schema baseline
