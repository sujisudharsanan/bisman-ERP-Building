/**
 * Unified Payment Request Page
 * - Merges the older simple page (tabs + history) with the new create form with line items
 * - Single canonical route: /common/payment-request
 * - Old route /common/payment-requests/create will redirect here
 */

'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import PaymentRequestForm from '@/components/payment-approval/PaymentRequestForm';
import { safeFetch } from '@/lib/safeFetch';
import { DollarSign, Calendar, User, Building2, FileText, CheckCircle, AlertCircle, Clock, Send } from '@/lib/ssr-safe-icons';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type HistoryItem = {
	id: string;
	requestDate: string;
	amount: number;
	currency: string;
	category: string;
	priority: 'low' | 'medium' | 'high' | 'urgent';
	description: string;
	beneficiary: string;
	accountNumber: string;
	bankName: string;
	status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paid';
};

export default function UnifiedPaymentRequestPage() {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
		const [isLoading, setIsLoading] = useState(false);
		const [error, setError] = useState<string | null>(null);

		const [beneficiary, setBeneficiary] = useState('');
		const [accountNumber, setAccountNumber] = useState('');
		const [bankName, setBankName] = useState('');

	// Mock history for now (can be wired to backend later)
	const paymentHistory: HistoryItem[] = useMemo(
		() => [
			{
				id: 'PR-2024-001',
				requestDate: '2024-10-20',
				amount: 5000,
				currency: 'USD',
				category: 'Travel',
				priority: 'medium',
				description: 'Business travel expenses',
				beneficiary: 'John Doe',
				accountNumber: '****1234',
				bankName: 'Bank of America',
				status: 'approved',
			},
			{
				id: 'PR-2024-002',
				requestDate: '2024-10-18',
				amount: 12000,
				currency: 'USD',
				category: 'Vendor Payment',
				priority: 'high',
				description: 'Invoice payment for services',
				beneficiary: 'ABC Corp',
				accountNumber: '****5678',
				bankName: 'Chase Bank',
				status: 'paid',
			},
		],
		[]
	);

	const getStatusColor = (status: HistoryItem['status']) => {
		switch (status) {
			case 'draft':
				return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
			case 'pending':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
			case 'approved':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
			case 'rejected':
				return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
			case 'paid':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
		}
	};

	const getPriorityColor = (priority: HistoryItem['priority']) => {
		switch (priority) {
			case 'urgent':
				return 'text-red-600 dark:text-red-400';
			case 'high':
				return 'text-orange-600 dark:text-orange-400';
			case 'medium':
				return 'text-yellow-600 dark:text-yellow-400';
			case 'low':
				return 'text-green-600 dark:text-green-400';
			default:
				return 'text-gray-600 dark:text-gray-400';
		}
	};

	const getStatusIcon = (status: HistoryItem['status']) => {
		switch (status) {
			case 'approved':
				return <CheckCircle className="w-4 h-4" />;
			case 'rejected':
				return <AlertCircle className="w-4 h-4" />;
			case 'pending':
				return <Clock className="w-4 h-4" />;
			case 'paid':
				return <DollarSign className="w-4 h-4" />;
			default:
				return <FileText className="w-4 h-4" />;
		}
	};

	const handleSubmit = async (data: any, isDraft: boolean) => {
		setIsLoading(true);
		setError(null);
		try {
			// Merge in optional additional details under a namespaced key to avoid backend conflicts
			const payload = {
				...data,
				additionalDetails: {
					beneficiary,
					accountNumber,
					bankName,
				},
			};

			const createRes = await safeFetch(`${BACKEND_URL}/api/common/payment-requests`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload),
			});
			if (!createRes.ok) {
				const err = await createRes.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to create payment request');
			}
			const created = await createRes.json();
			const paymentRequestId = created?.data?.id;

			if (!isDraft && paymentRequestId) {
				const submitRes = await safeFetch(
					`${BACKEND_URL}/api/common/payment-requests/${paymentRequestId}/submit`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						credentials: 'include',
					}
				);
				if (!submitRes.ok) {
					const err = await submitRes.json().catch(() => ({}));
					throw new Error(err.error || 'Failed to submit for approval');
				}
			}

			alert(isDraft ? 'Payment request saved as draft' : 'Payment request submitted for approval successfully!');
			router.push('/common/task-approvals');
		} catch (e: any) {
			console.error('Submit error:', e);
			setError(e?.message || 'An error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = () => router.back();

	return (
		<SuperAdminLayout title="Payment Request" description="Create and track your payment requests">
			<div className="p-4 sm:p-5 lg:p-6 max-w-7xl mx-auto">

				{/* Tabs */}
			  <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
					<div className="flex gap-4">
						<button
							onClick={() => setActiveTab('create')}
				  className={`px-3 py-2 font-medium border-b-2 transition-colors ${
								activeTab === 'create'
									? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
									: 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
							}`}
						>
							Create Request
						</button>
						<button
							onClick={() => setActiveTab('history')}
				  className={`px-3 py-2 font-medium border-b-2 transition-colors ${
								activeTab === 'history'
									? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
									: 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
							}`}
						>
							Request History ({paymentHistory.length})
						</button>
					</div>
				</div>

				{/* Create Tab */}
				{activeTab === 'create' && (
					<div className="space-y-6">
						{error && (
							<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
								<p className="text-red-800">{error}</p>
							</div>
						)}

						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
							<PaymentRequestForm onSubmit={handleSubmit} onCancel={handleCancel} isLoading={isLoading} />

							{/* Additional optional details */}
							  <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-5">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
									<User className="w-5 h-5" />
									Beneficiary Information (optional)
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Beneficiary Name</label>
										<input
											type="text"
											value={beneficiary}
											onChange={(e) => setBeneficiary(e.target.value)}
											className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
											placeholder="Enter beneficiary name"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Number</label>
										<input
											type="text"
											value={accountNumber}
											onChange={(e) => setAccountNumber(e.target.value)}
											className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
											placeholder="Enter account number"
										/>
									</div>
									<div className="md:col-span-2">
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bank Name</label>
										<div className="relative">
											<Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
											<input
												type="text"
												value={bankName}
												onChange={(e) => setBankName(e.target.value)}
												className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
												placeholder="Enter bank name"
											/>
										</div>
									</div>
								</div>

								<p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
									<Send className="w-4 h-4" /> These details are included as metadata alongside your payment request.
								</p>
							</div>
						</div>
					</div>
				)}

				{/* History Tab */}
				{activeTab === 'history' && (
					<div className="space-y-4">
						{paymentHistory.length === 0 ? (
							  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-10 text-center">
								<FileText className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
								<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Payment Requests Yet</h3>
								<p className="text-gray-600 dark:text-gray-400 mb-4">You haven't submitted any payment requests yet.</p>
								<button onClick={() => setActiveTab('create')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
									Create New Request
								</button>
							</div>
						) : (
							paymentHistory.map((request) => (
								<div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
									<div className="flex items-start justify-between mb-4">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-2">
												<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{request.id}</h3>
												<span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(request.status)}`}>
													{getStatusIcon(request.status)}
													{request.status.charAt(0).toUpperCase() + request.status.slice(1)}
												</span>
												<span className={`text-xs font-medium ${getPriorityColor(request.priority)}`}>
													{request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
												</span>
											</div>
											<p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{request.description}</p>
											<div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
												<span className="flex items-center gap-1">
													<Calendar className="w-3 h-3" />
													{request.requestDate}
												</span>
												<span className="flex items-center gap-1">
													<User className="w-3 h-3" />
													{request.beneficiary}
												</span>
												<span className="flex items-center gap-1">
													<Building2 className="w-3 h-3" />
													{request.bankName}
												</span>
											</div>
										</div>
										<div className="text-right">
											<div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
												{request.currency} {request.amount.toLocaleString()}
											</div>
											<div className="text-xs text-gray-500 dark:text-gray-400">{request.category}</div>
										</div>
									</div>
									<div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
										<button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">View Details</button>
										{request.status === 'draft' && (
											<button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">Edit</button>
										)}
									</div>
								</div>
							))
						)}
					</div>
				)}
			</div>
		</SuperAdminLayout>
	);
}
 
