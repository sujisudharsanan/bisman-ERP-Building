// paymentRequests.js
// All calls are parameterized and use an axios client passed in or coming from context.

export function defaultPaths() {
  return {
    list: "/payment-requests",
    create: "/payment-requests",
    get: (id) => `/payment-requests/${id}`,
    approve: (id) => `/payment-requests/${id}/approve`,
    returnToCreator: (id) => `/payment-requests/${id}/return`,
    sendToAccounts: (id) => `/payment-requests/${id}/send-to-accounts`,
    accountsApprove: (id) => `/payment-requests/${id}/accounts-approve`,
    adminApprove: (id) => `/payment-requests/${id}/admin-approve`,
    sendToBank: (id) => `/payment-requests/${id}/send-to-bank`,
    recordBankTransfer: (id) => `/payment-requests/${id}/bank-transfer`,
    categories: "/categories",
  };
}

export async function listRequests(client, { params, paths = null } = {}) {
  paths = paths || defaultPaths();
  const res = await client.get(paths.list, { params });
  return res.data;
}

export async function createRequest(client, { payload, paths = null } = {}) {
  paths = paths || defaultPaths();
  const res = await client.post(paths.create, payload);
  return res.data;
}

export async function getRequest(client, id, { paths = null } = {}) {
  paths = paths || defaultPaths();
  const res = await client.get(paths.get(id));
  return res.data;
}

export async function approveRequest(client, id, { note = "" , paths = null } = {}) {
  paths = paths || defaultPaths();
  const res = await client.post(paths.approve(id), { note });
  return res.data;
}

export async function returnRequest(client, id, { reason, paths = null } = {}) {
  paths = paths || defaultPaths();
  const res = await client.post(paths.returnToCreator(id), { reason });
  return res.data;
}

export async function sendToAccounts(client, id, { note = "" , paths = null } = {}) {
  paths = paths || defaultPaths();
  const res = await client.post(paths.sendToAccounts(id), { note });
  return res.data;
}

export async function accountsApprove(client, id, opts = {}) {
  const paths = opts.paths || defaultPaths();
  const res = await client.post(paths.accountsApprove(id), opts.payload || {});
  return res.data;
}

export async function adminApprove(client, id, opts = {}) {
  const paths = opts.paths || defaultPaths();
  const res = await client.post(paths.adminApprove(id), opts.payload || {});
  return res.data;
}

export async function sendToBank(client, id, opts = {}) {
  const paths = opts.paths || defaultPaths();
  const res = await client.post(paths.sendToBank(id), opts.payload || {});
  return res.data;
}

export async function recordBankTransfer(client, id, { transactionId, paths = null } = {}) {
  paths = paths || defaultPaths();
  const res = await client.post(paths.recordBankTransfer(id), { transactionId });
  return res.data;
}

// categories
export async function listCategories(client, { paths = null } = {}) {
  paths = paths || defaultPaths();
  const res = await client.get(paths.categories);
  return res.data;
}
