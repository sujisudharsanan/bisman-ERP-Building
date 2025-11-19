// usePaymentRequests.js
import { useState, useCallback, useEffect } from "react";
import { useAuthConfig } from "../context/AuthConfigContext";
import * as svc from "../services/paymentRequests";

export function usePaymentRequests({ initialParams } = {}) {
  const { client, apiConfig } = useAuthConfig();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const paths = apiConfig.paths || null;

  const fetchAll = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await svc.listRequests(client, { params: { ...initialParams, ...params }, paths });
      setRequests(Array.isArray(data) ? data : (data.items || []));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [client, initialParams, paths]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const create = useCallback(async (payload) => {
    setLoading(true);
    try {
      const created = await svc.createRequest(client, { payload, paths });
      // optimistic insert at top
      setRequests(prev => [created, ...prev]);
      return created;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, paths]);

  const approve = useCallback(async (id, opts = {}) => {
    setLoading(true);
    try {
      const res = await svc.approveRequest(client, id, { note: opts.note, paths });
      setRequests(prev => prev.map(r => r.id === id ? res : r));
      return res;
    } catch (err) { setError(err); throw err; } finally { setLoading(false); }
  }, [client, paths]);

  const returnRequest = useCallback(async (id, reason) => {
    setLoading(true);
    try {
      const res = await svc.returnRequest(client, id, { reason, paths });
      setRequests(prev => prev.map(r => r.id === id ? res : r));
      return res;
    } catch (err) { setError(err); throw err; } finally { setLoading(false); }
  }, [client, paths]);

  const markPaid = useCallback(async (id, transactionId) => {
    setLoading(true);
    try {
      const res = await svc.recordBankTransfer(client, id, { transactionId, paths });
      setRequests(prev => prev.map(r => r.id === id ? res : r));
      return res;
    } catch (err) { setError(err); throw err; } finally { setLoading(false); }
  }, [client, paths]);

  const refresh = useCallback(() => fetchAll(), [fetchAll]);

  return { requests, loading, error, create, approve, returnRequest, markPaid, refresh, fetchAll };
}
