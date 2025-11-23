// Cached vendor/customer (party) data
const { redis } = require('../redisClient');
const { key, NS } = require('../namespaces');

async function fetchParty(id) {
  // Placeholder DB fetch
  return { id, name: 'ACME Supplies', creditLimit: 50000, updatedAt: Date.now() };
}

async function getParty(id) {
  if (!redis) return fetchParty(id);
  const k = key(NS.PARTY, id);
  const raw = await redis.get(k);
  if (raw) return JSON.parse(raw);
  const data = await fetchParty(id);
  await redis.set(k, JSON.stringify(data), 'EX', 300);
  await redis.sadd(key(NS.PARTY, 'index'), id);
  return data;
}

module.exports = { getParty };
