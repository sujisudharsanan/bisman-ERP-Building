/**
 * Payment Request Utility Functions
 * Helper functions for payment request ID generation, calculations, and transformations
 */

import { Prisma } from '@prisma/client';

/**
 * Generate unique payment request ID: PR-YYYY-MM-DD-XXXX
 * @param sequenceNumber - Sequential number for the day
 * @returns Formatted request ID
 */
export function generatePaymentRequestId(sequenceNumber: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(sequenceNumber).padStart(4, '0');
  
  return `PR-${year}-${month}-${day}-${seq}`;
}

/**
 * Generate secure payment token for public payment page
 * @returns Random secure token
 */
export function generatePaymentToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate line item total
 * @param quantity - Item quantity
 * @param rate - Unit rate
 * @param taxRate - Tax percentage (0-100)
 * @param discountRate - Discount percentage (0-100)
 * @returns Calculated line total
 */
export function calculateLineTotal(
  quantity: number,
  rate: number,
  taxRate: number = 0,
  discountRate: number = 0
): number {
  const subtotal = quantity * rate;
  const discount = (subtotal * discountRate) / 100;
  const afterDiscount = subtotal - discount;
  const tax = (afterDiscount * taxRate) / 100;
  return afterDiscount + tax;
}

/**
 * Calculate payment request totals from line items
 * @param lineItems - Array of line items
 * @returns Calculated totals
 */
export function calculateTotals(lineItems: Array<{
  quantity: number;
  rate: number;
  taxRate?: number;
  discountRate?: number;
  lineTotal: number;
}>) {
  const subtotal = lineItems.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.rate;
    return sum + itemSubtotal;
  }, 0);
  
  const totalDiscount = lineItems.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.rate;
    const discount = (itemSubtotal * (item.discountRate || 0)) / 100;
    return sum + discount;
  }, 0);
  
  const afterDiscount = subtotal - totalDiscount;
  
  const totalTax = lineItems.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.rate;
    const discount = (itemSubtotal * (item.discountRate || 0)) / 100;
    const afterDiscount = itemSubtotal - discount;
    const tax = (afterDiscount * (item.taxRate || 0)) / 100;
    return sum + tax;
  }, 0);
  
  const total = subtotal - totalDiscount + totalTax;
  
  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(totalTax.toFixed(2)),
    discountAmount: Number(totalDiscount.toFixed(2)),
    totalAmount: Number(total.toFixed(2)),
  };
}

/**
 * Get next approval level details
 * @param currentLevel - Current approval level
 * @returns Next level info or null if no more levels
 */
export async function getNextApprovalLevel(currentLevel: number, prisma: any) {
  const nextLevel = await prisma.approvalLevel.findUnique({
    where: { level: currentLevel + 1, isActive: true },
  });
  return nextLevel;
}

/**
 * Find users by role for approval assignment
 * @param roleName - Role name to find
 * @param prisma - Prisma client
 * @returns Array of users with that role
 */
export async function findUsersByRole(roleName: string, prisma: any) {
  return prisma.user.findMany({
    where: {
      role: roleName,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  });
}

/**
 * Create activity log entry
 * @param data - Activity log data
 * @param prisma - Prisma client
 */
export async function createActivityLog(
  data: {
    paymentRequestId: string;
    userId?: number;
    action: string;
    oldStatus?: string;
    newStatus?: string;
    comment?: string;
    metadata?: any;
  },
  prisma: any
) {
  return prisma.paymentActivityLog.create({
    data: {
      ...data,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    },
  });
}

/**
 * Warm approval message template
 * @param approverName - Current approver name
 * @param nextApproverName - Next approver name
 * @param requestId - Payment request ID
 * @param amount - Amount
 * @param currency - Currency code
 * @returns Formatted message
 */
export function warmApproveMessage({
  approverName,
  nextApproverName,
  requestId,
  amount,
  currency = 'INR',
  dueDate,
}: {
  approverName: string;
  nextApproverName: string;
  requestId: string;
  amount: number;
  currency?: string;
  dueDate?: Date;
}) {
  const dueDateStr = dueDate
    ? ` by ${dueDate.toLocaleDateString('en-IN', { dateStyle: 'medium' })}`
    : '';
  return `${approverName} has approved request ${requestId} for ${currency} ${amount.toFixed(
    2
  )}. @${nextApproverName}, please review and approve this request${dueDateStr}.`;
}

/**
 * Format currency for display
 * @param amount - Amount to format
 * @param currency - Currency code
 * @returns Formatted string
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Validate payment request status transition
 * @param currentStatus - Current status
 * @param newStatus - Desired new status
 * @returns Whether transition is valid
 */
export function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    DRAFT: ['SUBMITTED', 'CANCELLED'],
    SUBMITTED: ['L1_PENDING', 'CANCELLED'],
    L1_PENDING: ['L2_PENDING', 'REJECTED', 'RETURNED', 'CANCELLED'],
    L2_PENDING: ['FINANCE_PENDING', 'REJECTED', 'RETURNED', 'CANCELLED'],
    FINANCE_PENDING: ['SENT_TO_CLIENT', 'REJECTED', 'RETURNED', 'CANCELLED'],
    SENT_TO_CLIENT: ['PAID', 'CANCELLED'],
    PAID: ['CLOSED'],
    REJECTED: ['DRAFT'], // Can reopen rejected requests
    RETURNED: ['DRAFT'], // Can reopen returned requests
    CANCELLED: [],
    CLOSED: [],
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
}
