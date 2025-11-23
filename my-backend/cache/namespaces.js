// Key namespaces & helpers for structured cache keys
module.exports.NS = {
  DASHBOARD: 'dash',
  REPORT: 'report',
  PARTY: 'party',
  META: 'meta'
};

module.exports.key = (...parts) => parts.join(':');
