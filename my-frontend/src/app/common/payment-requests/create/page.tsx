/**
 * Payment Requests Page
 * Main page for creating and managing payment requests
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import PaymentRequestForm from '@/components/payment-approval/PaymentRequestForm';
import { ArrowLeft } from 'lucide-react';

export default function CreatePaymentRequestPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: any, isDraft: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Create payment request
      const createResponse = await fetch('http://localhost:8000/api/common/payment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create payment request');
      }

      const result = await createResponse.json();
      const paymentRequestId = result.data.id;

      // If not draft, submit for approval
      if (!isDraft) {
        const submitResponse = await fetch(
          `http://localhost:8000/api/common/payment-requests/${paymentRequestId}/submit`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!submitResponse.ok) {
          const errorData = await submitResponse.json();
          throw new Error(errorData.error || 'Failed to submit for approval');
        }
      }

      // Success - redirect to tasks/approvals page
      alert(
        isDraft
          ? 'Payment request saved as draft'
          : 'Payment request submitted for approval successfully!'
      );
      router.push('/common/task-approvals');
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <PaymentRequestForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
