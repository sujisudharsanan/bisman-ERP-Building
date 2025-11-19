// PaymentRequestPage.integration.example.jsx
// Minimal wiring example: replace local localStorage usage and inline fetches
// with AuthConfigProvider and usePaymentRequests hook.

import React, { useState } from "react";
import { AuthConfigProvider } from "../context/AuthConfigContext";
import { usePaymentRequests } from "../hooks/usePaymentRequests";

function PaymentRequestPageInner() {
  const { requests, loading, error, create, approve, returnRequest, markPaid, refresh } = usePaymentRequests();
  const [form, setForm] = useState({
    expenseDate: "",
    categoryId: "",
    amount: "",
    attachments: [],
    isGst: false,
    gstNumber: "",
    gstName: "",
    invoiceNumber: "",
    invoiceDate: "",
    message: "",
  });

  async function onCreate() {
    if (!form.expenseDate || !form.categoryId || !form.amount) return alert("Missing required fields");
    const payload = {
      expenseDate: form.expenseDate,
      categoryId: form.categoryId,
      amount: parseFloat(form.amount),
      attachments: form.attachments.map(a => ({ name: a.name, url: a.url })),
      isGst: form.isGst,
      gstNumber: form.gstNumber,
      gstName: form.gstName,
      invoiceNumber: form.invoiceNumber,
      invoiceDate: form.invoiceDate,
      message: form.message,
    };
    await create(payload);
    setForm({ expenseDate: "", categoryId: "", amount: "", attachments: [], isGst: false, gstNumber: "", gstName: "", invoiceNumber: "", invoiceDate: "", message: "" });
  }

  return (
    <div>
      <h2>Payment Requests</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'red' }}>{String(error?.message || error)}</p>}

      <button onClick={refresh}>Refresh</button>

      <ul>
        {requests.map(r => (
          <li key={r.id}>
            {r.id} — {r.status} — {r.amount}
            <button onClick={() => approve(r.id)}>Approve</button>
            <button onClick={() => returnRequest(r.id, "Need more info")}>Return</button>
            <button onClick={() => markPaid(r.id, "TXN-123")} disabled={r.status === 'paid'}>Mark Paid</button>
          </li>
        ))}
      </ul>

      <div>
        <h3>Create</h3>
        {/* form controls omitted for brevity */}
        <button onClick={onCreate}>Create</button>
      </div>
    </div>
  );
}

export default function PaymentRequestPageExample() {
  const apiConfig = {
    // override paths if your backend differs
    // paths: { list: "/v1/expenses", create: "/v1/expenses" }
  };

  // Provide a token getter that reads from secure storage or cookie
  const getAuthToken = async () => {
    // Example: read from cookie via server-set HTTP-only cookie flow
    // If using localStorage, inject the key via env: process.env.AUTH_TOKEN_STORAGE_KEY
    // return localStorage.getItem(process.env.AUTH_TOKEN_STORAGE_KEY);
    return null; // no token by default
  };

  return (
    <AuthConfigProvider apiConfig={apiConfig} getAuthToken={getAuthToken}>
      <PaymentRequestPageInner />
    </AuthConfigProvider>
  );
}
