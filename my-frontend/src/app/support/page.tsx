'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, MessageCircle, Mail, Phone, FileText, HelpCircle, 
  ChevronDown, ChevronUp, Search, Clock, CheckCircle, ExternalLink,
  BookOpen, Video, Users
} from 'lucide-react';

const faqs = [
  {
    question: 'How do I reset my password?',
    answer: 'Go to the login page and click "Forgot Password". Enter your email address and we\'ll send you a reset link. The link expires after 24 hours.'
  },
  {
    question: 'How do I add new users to my organization?',
    answer: 'Navigate to Admin → User Management → Create User. Fill in the required details, assign a role, and the user will receive an invitation email.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express), bank transfers, and UPI payments for Indian customers.'
  },
  {
    question: 'How do I export my data?',
    answer: 'Most tables have an "Export" button that allows you to download data as CSV or Excel. For complete data export, contact support.'
  },
  {
    question: 'What are the system requirements?',
    answer: 'BISMAN ERP works on any modern web browser (Chrome, Firefox, Safari, Edge). We recommend using the latest version for best performance.'
  },
  {
    question: 'How secure is my data?',
    answer: 'We use bank-grade security with TLS 1.3 encryption, AES-256 for data at rest, and regular security audits. All data is backed up daily.'
  },
];

export default function SupportPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold mb-4">How can we help you?</h1>
          <p className="text-blue-100 mb-8">Search our knowledge base or get in touch with our support team</p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg w-fit mb-4">
              <Video className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Video Tutorials</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Watch step-by-step tutorials for common tasks</p>
            <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm inline-flex items-center gap-1">
              Watch Now <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg w-fit mb-4">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Community Forum</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Connect with other users and share best practices</p>
            <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm inline-flex items-center gap-1">
              Join Community <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {filteredFaqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4 text-gray-600 dark:text-gray-300">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Live Chat</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Chat with our support team in real-time</p>
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 mb-4">
              <CheckCircle className="w-4 h-4" />
              Available Now
            </div>
            <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Start Chat
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full w-fit mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Email Support</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Send us an email and we'll respond within 24 hours</p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
              <Clock className="w-4 h-4" />
              Response: 24 hours
            </div>
            <a href="mailto:support@bisman.in" className="block w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              support@bisman.in
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full w-fit mx-auto mb-4">
              <Phone className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Phone Support</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Call us for urgent issues (Enterprise plans)</p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
              <Clock className="w-4 h-4" />
              Mon-Fri, 9AM-6PM IST
            </div>
            <a href="tel:+914412345678" className="block w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              +91 44 1234 5678
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
