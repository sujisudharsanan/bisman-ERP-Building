/**
 * ============================================================================
 * CLIENT DATABASE PROVISIONING SCRIPT
 * ============================================================================
 * 
 * Purpose:
 * - Automatically provision new PostgreSQL databases for tenants
 * - Run Prisma migrations to initialize client schema
 * - Store encrypted connection URI in enterprise database
 * - Set up initial data (default roles, permissions, admin user)
 * 
 * Usage:
 * ```bash
 * # Provision new client DB
 * npm run provision-client -- --client-id=<uuid>
 * 
 * # Or call from code
 * import { provisionClientDatabase } from './scripts/provisionClientDb';
 * await provisionClientDatabase(clientId);
 * ```
 * 
 * Requirements:
 * - PostgreSQL admin connection with CREATE DATABASE privileges
 * - Prisma CLI installed
 * - ADMIN_DATABASE_URL environment variable set
 * ============================================================================
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Client } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getEnterprisePrisma } from '../lib/tenantManager';
import logger from '../lib/logger';

const execAsync = promisify(exec);

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ProvisionConfig {
  dbHost: string;
  dbPort: number;
  dbUsername: string;
  dbPassword: string;
  adminConnectionUrl: string;
  clientDbUserPrefix: string;
  encryptConnectionUri: boolean;
  setupDefaultData: boolean;
}

const DEFAULT_CONFIG: ProvisionConfig = {
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: parseInt(process.env.DB_PORT || '5432'),
  dbUsername: process.env.DB_USERNAME || 'postgres',
  dbPassword: process.env.DB_PASSWORD || '',
  adminConnectionUrl: process.env.ADMIN_DATABASE_URL || '',
  clientDbUserPrefix: 'client_user_',
  encryptConnectionUri: process.env.DB_ENCRYPTION_ENABLED === 'true',
  setupDefaultData: true,
};

// ============================================================================
// ENCRYPTION
// ============================================================================

/**
 * Encrypt database connection URI
 * TODO: Use AWS KMS, HashiCorp Vault, or similar in production
 */
function encryptConnectionUri(uri: string): string {
  if (!DEFAULT_CONFIG.encryptConnectionUri) {
    return uri;
  }

  // TODO: Implement proper encryption
  // Example with crypto:
  // const algorithm = 'aes-256-gcm';
  // const key = Buffer.from(process.env.DB_ENCRYPTION_KEY!, 'hex');
  // const iv = crypto.randomBytes(16);
  // const cipher = crypto.createCipheriv(algorithm, key, iv);
  // let encrypted = cipher.update(uri, 'utf8', 'hex');
  // encrypted += cipher.final('hex');
  // const tag = cipher.getAuthTag();
  // return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;

  logger.warn('⚠️  Connection URI encryption not implemented - storing plain text');
  return uri;
}

// ============================================================================
// DATABASE PROVISIONING
// ============================================================================

/**
 * Generate unique database name for client
 */
function generateDbName(clientId: string): string {
  // Remove hyphens from UUID for cleaner DB name
  const sanitized = clientId.replace(/-/g, '');
  return `client_db_${sanitized}`;
}

/**
 * Generate database user name for client
 */
function generateDbUser(clientId: string): string {
  const sanitized = clientId.replace(/-/g, '').substring(0, 16);
  return `${DEFAULT_CONFIG.clientDbUserPrefix}${sanitized}`;
}

/**
 * Generate secure database password
 */
function generateDbPassword(): string {
  return crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Create PostgreSQL database
 */
async function createDatabase(dbName: string): Promise<void> {
  logger.info(`Creating database: ${dbName}...`);

  if (!DEFAULT_CONFIG.adminConnectionUrl) {
    throw new Error('ADMIN_DATABASE_URL not configured');
  }

  const adminClient = new Client({
    connectionString: DEFAULT_CONFIG.adminConnectionUrl,
  });

  try {
    await adminClient.connect();

    // Check if database already exists
    const checkResult = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (checkResult.rows.length > 0) {
      logger.warn(`Database ${dbName} already exists`);
      return;
    }

    // Create database
    await adminClient.query(`CREATE DATABASE ${dbName}`);
    logger.info(`✅ Database created: ${dbName}`);

  } catch (error) {
    logger.error(`Failed to create database: ${dbName}`, error);
    throw error;
  } finally {
    await adminClient.end();
  }
}

/**
 * Create database user with limited privileges
 */
async function createDatabaseUser(
  dbName: string,
  username: string,
  password: string
): Promise<void> {
  logger.info(`Creating database user: ${username}...`);

  const adminClient = new Client({
    connectionString: DEFAULT_CONFIG.adminConnectionUrl,
  });

  try {
    await adminClient.connect();

    // Check if user exists
    const checkResult = await adminClient.query(
      'SELECT 1 FROM pg_roles WHERE rolname = $1',
      [username]
    );

    if (checkResult.rows.length === 0) {
      // Create user
      await adminClient.query(
        `CREATE USER ${username} WITH PASSWORD '${password}'`
      );
      logger.info(`✅ User created: ${username}`);
    } else {
      logger.warn(`User ${username} already exists`);
    }

    // Grant privileges on database
    await adminClient.query(`GRANT CONNECT ON DATABASE ${dbName} TO ${username}`);
    
    // Connect to the new database to grant schema privileges
    await adminClient.end();
    
    const dbClient = new Client({
      connectionString: `postgresql://${DEFAULT_CONFIG.dbUsername}:${DEFAULT_CONFIG.dbPassword}@${DEFAULT_CONFIG.dbHost}:${DEFAULT_CONFIG.dbPort}/${dbName}`,
    });
    
    await dbClient.connect();
    await dbClient.query(`GRANT ALL PRIVILEGES ON SCHEMA public TO ${username}`);
    await dbClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${username}`);
    await dbClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${username}`);
    
    // Grant default privileges for future tables
    await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${username}`);
    await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${username}`);
    
    await dbClient.end();
    
    logger.info(`✅ Privileges granted to ${username}`);

  } catch (error) {
    logger.error(`Failed to create database user: ${username}`, error);
    throw error;
  } finally {
    if (!adminClient.connection.destroyed) {
      await adminClient.end();
    }
  }
}

/**
 * Run Prisma migrations on new database
 */
async function runPrismaMigrations(connectionUri: string): Promise<void> {
  logger.info('Running Prisma migrations...');

  try {
    // Set DATABASE_URL for Prisma
    process.env.CLIENT_DATABASE_URL = connectionUri;

    // Run migrations
    const { stdout, stderr } = await execAsync(
      'npx prisma migrate deploy --schema=prisma/schema.client.prisma',
      {
        env: {
          ...process.env,
          DATABASE_URL: connectionUri,
        },
      }
    );

    logger.info('Migration output:', stdout);
    if (stderr) logger.warn('Migration warnings:', stderr);

    logger.info('✅ Prisma migrations completed');

  } catch (error) {
    logger.error('Failed to run Prisma migrations:', error);
    throw error;
  }
}

/**
 * Generate Prisma client for new database
 */
async function generatePrismaClient(): Promise<void> {
  logger.info('Generating Prisma client...');

  try {
    await execAsync('npx prisma generate --schema=prisma/schema.client.prisma');
    logger.info('✅ Prisma client generated');
  } catch (error) {
    logger.error('Failed to generate Prisma client:', error);
    throw error;
  }
}

// ============================================================================
// DEFAULT DATA SETUP
// ============================================================================

/**
 * Set up default roles and permissions
 */
async function setupDefaultRoles(prisma: any): Promise<void> {
  logger.info('Setting up default roles...');

  const defaultRoles = [
    {
      name: 'Admin',
      slug: 'admin',
      description: 'Full system access',
      type: 'SYSTEM',
      level: 100,
    },
    {
      name: 'Manager',
      slug: 'manager',
      description: 'Manage users and resources',
      type: 'SYSTEM',
      level: 50,
    },
    {
      name: 'User',
      slug: 'user',
      description: 'Standard user access',
      type: 'SYSTEM',
      level: 10,
    },
    {
      name: 'Viewer',
      slug: 'viewer',
      description: 'Read-only access',
      type: 'SYSTEM',
      level: 1,
    },
  ];

  for (const role of defaultRoles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: {},
      create: role,
    });
  }

  logger.info('✅ Default roles created');
}

/**
 * Set up default permissions
 */
async function setupDefaultPermissions(prisma: any): Promise<void> {
  logger.info('Setting up default permissions...');

  const resources = ['users', 'roles', 'permissions', 'settings', 'reports'];
  const actions = ['create', 'read', 'update', 'delete'];

  for (const resource of resources) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: {
          resource_action: {
            resource,
            action,
          },
        },
        update: {},
        create: {
          name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
          slug: `${resource}:${action}`,
          resource,
          action,
          description: `Allows ${action} operations on ${resource}`,
        },
      });
    }
  }

  logger.info('✅ Default permissions created');
}

/**
 * Assign permissions to admin role
 */
async function assignAdminPermissions(prisma: any): Promise<void> {
  logger.info('Assigning permissions to admin role...');

  const adminRole = await prisma.role.findUnique({
    where: { slug: 'admin' },
  });

  if (!adminRole) {
    throw new Error('Admin role not found');
  }

  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  logger.info('✅ Admin permissions assigned');
}

/**
 * Create initial admin user
 */
async function createInitialAdmin(
  prisma: any,
  adminEmail: string,
  adminName: string
): Promise<void> {
  logger.info('Creating initial admin user...');

  const defaultPassword = generateDbPassword().substring(0, 16);
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const user = await prisma.user.create({
    data: {
      email: adminEmail,
      name: adminName,
      password: hashedPassword,
      isActive: true,
      isVerified: true,
      status: 'ACTIVE',
    },
  });

  // Assign admin role
  const adminRole = await prisma.role.findUnique({
    where: { slug: 'admin' },
  });

  if (adminRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
      },
    });
  }

  logger.info('✅ Initial admin user created');
  logger.info(`📧 Email: ${adminEmail}`);
  logger.info(`🔑 Temporary Password: ${defaultPassword}`);
  logger.warn('⚠️  Please share this password securely and ask user to change it!');
}

// ============================================================================
// MAIN PROVISIONING FUNCTION
// ============================================================================

/**
 * Provision complete client database
 */
export async function provisionClientDatabase(
  clientId: string,
  options?: {
    adminEmail?: string;
    adminName?: string;
    skipDefaultData?: boolean;
  }
): Promise<{
  dbName: string;
  dbConnectionUri: string;
  success: boolean;
}> {
  logger.info(`🚀 Starting client database provisioning for: ${clientId}`);

  try {
    // Get client details from enterprise DB
    const enterprise = await getEnterprisePrisma();
    const client = await enterprise.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        adminEmail: true,
        adminName: true,
        dbConnectionUri: true,
      },
    });

    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    // Check if already provisioned
    if (client.dbConnectionUri && client.dbConnectionUri !== '') {
      logger.warn(`Client ${client.name} already has a database provisioned`);
      return {
        dbName: '',
        dbConnectionUri: client.dbConnectionUri,
        success: true,
      };
    }

    // Generate database credentials
    const dbName = generateDbName(clientId);
    const dbUser = generateDbUser(clientId);
    const dbPassword = generateDbPassword();
    const dbConnectionUri = `postgresql://${dbUser}:${dbPassword}@${DEFAULT_CONFIG.dbHost}:${DEFAULT_CONFIG.dbPort}/${dbName}`;

    // Step 1: Create database
    await createDatabase(dbName);

    // Step 2: Create database user
    await createDatabaseUser(dbName, dbUser, dbPassword);

    // Step 3: Run Prisma migrations
    await runPrismaMigrations(dbConnectionUri);

    // Step 4: Generate Prisma client
    await generatePrismaClient();

    // Step 5: Setup default data
    if (DEFAULT_CONFIG.setupDefaultData && !options?.skipDefaultData) {
      // Import dynamically to get fresh Prisma client
      const { getTenantPrisma } = await import('../lib/tenantManager');
      const tenantPrisma = await getTenantPrisma(dbConnectionUri);

      await setupDefaultRoles(tenantPrisma);
      await setupDefaultPermissions(tenantPrisma);
      await assignAdminPermissions(tenantPrisma);
      await createInitialAdmin(
        tenantPrisma,
        options?.adminEmail || client.adminEmail,
        options?.adminName || client.adminName || 'Admin'
      );

      await tenantPrisma.$disconnect();
    }

    // Step 6: Encrypt and store connection URI
    const encryptedUri = encryptConnectionUri(dbConnectionUri);
    await enterprise.client.update({
      where: { id: clientId },
      data: {
        dbConnectionUri: encryptedUri,
        dbName,
        dbHost: DEFAULT_CONFIG.dbHost,
        dbPort: DEFAULT_CONFIG.dbPort,
      },
    });

    logger.info(`✅ Client database provisioned successfully: ${client.name}`);
    logger.info(`📊 Database: ${dbName}`);
    logger.info(`👤 DB User: ${dbUser}`);

    return {
      dbName,
      dbConnectionUri: encryptedUri,
      success: true,
    };

  } catch (error) {
    logger.error('❌ Client database provisioning failed:', error);
    throw error;
  }
}

/**
 * Cleanup/delete client database
 * WARNING: This permanently deletes all tenant data!
 */
export async function deleteClientDatabase(clientId: string): Promise<void> {
  logger.warn(`⚠️  DELETING client database for: ${clientId}`);

  try {
    const enterprise = await getEnterprisePrisma();
    const client = await enterprise.client.findUnique({
      where: { id: clientId },
      select: { dbName: true, name: true },
    });

    if (!client || !client.dbName) {
      logger.warn(`Client ${clientId} has no database to delete`);
      return;
    }

    const adminClient = new Client({
      connectionString: DEFAULT_CONFIG.adminConnectionUrl,
    });

    await adminClient.connect();

    // Terminate all connections to the database
    await adminClient.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [client.dbName]);

    // Drop database
    await adminClient.query(`DROP DATABASE IF EXISTS ${client.dbName}`);

    await adminClient.end();

    // Clear connection URI in enterprise DB
    await enterprise.client.update({
      where: { id: clientId },
      data: {
        dbConnectionUri: '',
        status: 'DELETED',
      },
    });

    logger.info(`✅ Client database deleted: ${client.name}`);

  } catch (error) {
    logger.error('Failed to delete client database:', error);
    throw error;
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

/**
 * Command-line interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === '--help' || !command) {
    console.log(`
Client Database Provisioning Tool

Usage:
  npm run provision-client -- --client-id=<uuid> [--admin-email=<email>] [--admin-name=<name>]
  npm run delete-client-db -- --client-id=<uuid>

Options:
  --client-id     Client UUID (required)
  --admin-email   Initial admin email (optional)
  --admin-name    Initial admin name (optional)
  --help          Show this help message
    `);
    process.exit(0);
  }

  try {
    // Parse arguments
    const clientId = args.find(arg => arg.startsWith('--client-id='))?.split('=')[1];
    const adminEmail = args.find(arg => arg.startsWith('--admin-email='))?.split('=')[1];
    const adminName = args.find(arg => arg.startsWith('--admin-name='))?.split('=')[1];

    if (!clientId) {
      throw new Error('--client-id is required');
    }

    if (command === '--delete') {
      await deleteClientDatabase(clientId);
    } else {
      await provisionClientDatabase(clientId, { adminEmail, adminName });
    }

    logger.info('✅ Operation completed successfully');
    process.exit(0);

  } catch (error) {
    logger.error('❌ Operation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  provisionClientDatabase,
  deleteClientDatabase,
  createDatabase,
  runPrismaMigrations,
};
