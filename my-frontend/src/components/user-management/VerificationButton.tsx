'use client';

import React, { useState } from 'react';
import { Check, AlertCircle, Loader2, Send } from 'lucide-react';

interface VerificationButtonProps {
  type: 'email' | 'phone';
  value: string;
  isVerified: boolean;
  onSendVerification: () => Promise<void>;
  onVerifyCode?: (code: string) => Promise<boolean>;
}

export function VerificationButton({ 
  type, 
  value, 
  isVerified, 
  onSendVerification,
  onVerifyCode 
}: VerificationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendCode = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await onSendVerification();
      setShowCodeInput(true);
      setSuccess(`Verification code sent to ${value}`);
    } catch (err) {
      setError(`Failed to send verification code`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim() || !onVerifyCode) return;
    
    setLoading(true);
    setError('');
    
    try {
      const verified = await onVerifyCode(code);
      if (verified) {
        setSuccess('Successfully verified!');
        setShowCodeInput(false);
        setCode('');
      } else {
        setError('Invalid verification code');
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <Check className="w-4 h-4" />
        <span className="text-sm font-medium">Verified</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        {!showCodeInput ? (
          <button
            onClick={handleSendCode}
            disabled={loading || !value}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Verify {type === 'email' ? 'Email' : 'Phone'}</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`Enter ${type === 'email' ? '6-digit' : '4-digit'} code`}
              maxLength={type === 'email' ? 6 : 4}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
            />
            <button
              onClick={handleVerifyCode}
              disabled={loading || !code.trim()}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Verify'
              )}
            </button>
            <button
              onClick={() => {
                setShowCodeInput(false);
                setCode('');
                setError('');
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 text-green-600 text-sm">
          <Check className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}

export default VerificationButton;
