#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const seq = 'rbac_actions_id_seq';
  const exists = await prisma.$queryRawUnsafe(`SELECT 1 FROM pg_class WHERE relname='${seq}'`);
  if (exists.length === 0) {
    await prisma.$executeRawUnsafe(`CREATE SEQUENCE ${seq} START 1 OWNED BY rbac_actions.id`);
    console.log('Created sequence', seq);
  }
  const col = await prisma.$queryRawUnsafe(`SELECT column_default FROM information_schema.columns WHERE table_name='rbac_actions' AND column_name='id'`);
  const def = col[0]?.column_default || '';
  if (!/nextval\(/i.test(def)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE rbac_actions ALTER COLUMN id SET DEFAULT nextval('${seq}')`);
    console.log('Set DEFAULT nextval for rbac_actions.id');
  }
  const maxRow = await prisma.$queryRawUnsafe(`SELECT COALESCE(MAX(id),0) AS max_id FROM rbac_actions`);
  const maxId = maxRow[0].max_id;
  await prisma.$executeRawUnsafe(`SELECT setval('${seq}', ${maxId}+1, false)`);
  console.log('Aligned sequence to', maxId + 1);
  const verify = await prisma.$queryRawUnsafe(`SELECT column_default FROM information_schema.columns WHERE table_name='rbac_actions' AND column_name='id'`);
  console.log('Post-fix default:', verify[0].column_default);
}

main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e); prisma.$disconnect().then(()=>process.exit(1));});
