'use client';

import React, { useState } from 'react';
import { HelpCircle, Search, Book, Video, MessageCircle, FileText, ExternalLink } from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: 'getting-started' | 'features' | 'troubleshooting' | 'advanced';
  icon: React.ReactNode;
}

/**
 * Common Module - Help Center Page
 * Accessible to ALL authenticated users
 */
export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const helpArticles: HelpArticle[] = [
    {
      id: '1',
      title: 'Getting Started with BISMAN ERP',
      description: 'Learn the basics of navigating and using the ERP system',
      category: 'getting-started',
      icon: <Book className="w-5 h-5" />,
    },
    {
      id: '2',
      title: 'Managing Your Profile',
      description: 'Update your personal information and preferences',
      category: 'getting-started',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: '3',
      title: 'Understanding Permissions',
      description: 'Learn about role-based access control and permissions',
      category: 'features',
      icon: <Book className="w-5 h-5" />,
    },
    {
      id: '4',
      title: 'Using the Dashboard',
      description: 'Navigate your dashboard and understand key metrics',
      category: 'features',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: '5',
      title: 'Troubleshooting Login Issues',
      description: 'Solutions for common login and authentication problems',
      category: 'troubleshooting',
      icon: <MessageCircle className="w-5 h-5" />,
    },
    {
      id: '6',
      title: 'Advanced Reporting',
      description: 'Create custom reports and export data',
      category: 'advanced',
      icon: <Book className="w-5 h-5" />,
    },
  ];

  const categories = [
    { id: 'all', name: 'All Topics', color: 'gray' },
    { id: 'getting-started', name: 'Getting Started', color: 'blue' },
    { id: 'features', name: 'Features', color: 'green' },
    { id: 'troubleshooting', name: 'Troubleshooting', color: 'orange' },
    { id: 'advanced', name: 'Advanced', color: 'purple' },
  ];

  const filteredArticles = helpArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
              <HelpCircle className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            How can we help you?
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Search for answers or browse our help topics
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
            <input
              type="text"
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 text-lg border-2 border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-blue-300 focus:border-blue-500 shadow-lg"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <a
            href="/common/documentation"
            className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform">
                <Book className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Documentation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Browse full documentation</p>
              </div>
            </div>
          </a>

          <button className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-all group">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Video Tutorials</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Watch guided videos</p>
              </div>
            </div>
          </button>

          <a
            href="/common/messages"
            className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Contact Support</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Get help from our team</p>
              </div>
            </div>
          </a>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:shadow-md'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Help Articles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-12 text-center">
              <HelpCircle className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No articles found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try searching with different keywords
              </p>
            </div>
          ) : (
            filteredArticles.map((article) => (
              <div
                key={article.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                    {article.icon}
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {article.description}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Still need help?</h2>
          <p className="text-blue-100 mb-6">
            Our support team is here to help you with any questions
          </p>
          <a
            href="/common/messages"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            <MessageCircle size={20} />
            <span>Contact Support</span>
          </a>
        </div>
      </div>
    </div>
  );
}
