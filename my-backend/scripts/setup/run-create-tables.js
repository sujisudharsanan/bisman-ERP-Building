const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function createTables() {
  try {
    console.log('📊 Creating new tables...\n');
    
    const sql = fs.readFileSync('./create-profile-tables.sql', 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await prisma.$executeRawUnsafe(statement + ';');
        } catch (e) {
          // Ignore duplicate errors, log others
          if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
            console.error('⚠️ ', e.message.split('\n')[0]);
          }
        }
      }
    }
    
    console.log('\n✅ All tables created successfully!\n');
    
    // Verify tables were created
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables 
      WHERE schemaname='public' AND tablename LIKE 'user_%' OR tablename = 'branches'
      ORDER BY tablename
    `;
    
    console.log('📋 Verified tables:');
    tables.forEach(t => console.log('  ✓', t.tablename));
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTables();
