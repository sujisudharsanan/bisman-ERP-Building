// Basic in-process cache hit/miss metrics
let hits = 0, misses = 0;

function record(hit) { hit ? hits++ : misses++; }
function snapshot() {
  return { timestamp: Date.now(), hits, misses, hitRate: hits + misses ? hits / (hits + misses) : 0 };
}
function reset() { hits = 0; misses = 0; }

module.exports = { record, snapshot, reset };
