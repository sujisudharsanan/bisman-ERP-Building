"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, 
  CheckCircle, 
  Shield, 
  Zap, 
  Globe, 
  Users, 
  BarChart3, 
  Package, 
  FileText,
  PlayCircle,
  ChevronRight,
  Star,
  Menu,
  X
} from 'lucide-react';

// Module data for the marquee
const modules = [
  { title: 'Core Operations', desc: 'Sales, Purchasing, Inventory, Logistics' },
  { title: 'Finance & Compliance', desc: 'Accounting, GST Filing, Assets' },
  { title: 'Growth & Support', desc: 'CRM, Helpdesk, HR, Payroll' },
  { title: 'Manufacturing', desc: 'BOM, Production Planning' },
  { title: 'Quality Assurance', desc: 'Testing, Bug Tracking, Releases' },
  { title: 'Analytics', desc: 'Dashboards, Reports, Insights' },
];

// Features data
const features = [
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'RBAC + ABAC, Row-Level Security, maker-checker, and full audit logs for corporate-grade governance.',
  },
  {
    icon: Zap,
    title: 'Workflow Automation',
    description: 'Trigger-based automation for postings, reminders, approvals, notifications, and background jobs.',
  },
  {
    icon: Users,
    title: 'Integrated QA Module',
    description: 'Built-in QA workspace for test tasks, issues, timelines, and change history directly inside the ERP.',
  },
  {
    icon: Globe,
    title: 'Multi-Tenant Architecture',
    description: 'Cost-effective scaling with isolated tenant data and shared infrastructure.',
  },
];

// Pricing tiers
const pricingTiers = [
  {
    name: 'Starter',
    description: 'Perfect for SMEs establishing their foundation.',
    features: ['Sales & Purchasing', 'Inventory Management', 'Core Accounting', '5 Users included'],
    highlighted: false,
  },
  {
    name: 'Professional',
    description: 'Select specialized tools as you need them.',
    features: ['Everything in Starter', 'Integrated QA Module', 'Automation Engine', 'HR & Payroll', '25 Users included'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'For expanding enterprises scaling globally.',
    features: ['Everything in Professional', 'Unlimited Users', 'Multi-Branch Access', 'Advanced Reporting', 'Priority Support'],
    highlighted: false,
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 relative">
                <Image 
                  src="/brand/bisman-logo.svg" 
                  alt="BISMAN ERP" 
                  width={40} 
                  height={40}
                  className="object-contain"
                />
              </div>
              <span className="text-2xl font-bold text-[#102A4A]">
                BISMAN<span className="text-[#FBBF24]">.</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-[#102A4A] transition-colors font-medium">
                Features
              </a>
              <a href="#modules" className="text-gray-600 hover:text-[#102A4A] transition-colors font-medium">
                Modules
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-[#102A4A] transition-colors font-medium">
                Pricing
              </a>
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link 
                href="/auth/login"
                className="bg-[#102A4A] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#173B66] transition-all shadow-lg shadow-[#102A4A]/20 hover:shadow-xl hover:shadow-[#102A4A]/30 hover:-translate-y-0.5"
              >
                Go to Application
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-4 space-y-4">
              <a href="#features" className="block text-gray-600 font-medium">Features</a>
              <a href="#modules" className="block text-gray-600 font-medium">Modules</a>
              <a href="#pricing" className="block text-gray-600 font-medium">Pricing</a>
              <hr />
              <Link 
                href="/auth/login"
                className="block bg-[#102A4A] text-white px-5 py-2.5 rounded-lg font-semibold text-center"
              >
                Go to Application
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 md:pt-40 pb-20 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#FBBF24]/10 border border-[#FBBF24]/20 rounded-full px-4 py-1.5 mb-6">
              <Star className="w-4 h-4 text-[#FBBF24]" />
              <span className="text-sm font-medium text-[#102A4A]">Built for Ambitious Leaders</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="bg-gradient-to-r from-[#102A4A] via-[#1a3a5c] to-[#102A4A] bg-clip-text text-transparent">
                The Operating System
              </span>
              <br />
              <span className="text-gray-800">for the Next Global Leader</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              A unified, corporate-grade SaaS platform for ambitious business leaders. 
              Scale from startup to enterprise on one secure, cloud-native system.
            </p>

            {/* Tags */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              <span className="inline-flex items-center gap-2 bg-[#FBBF24]/10 text-[#102A4A] px-4 py-2 rounded-full text-sm font-medium border border-[#FBBF24]/20">
                <Zap className="w-4 h-4 text-[#FBBF24]" /> Speed
              </span>
              <span className="inline-flex items-center gap-2 bg-[#102A4A]/5 text-[#102A4A] px-4 py-2 rounded-full text-sm font-medium border border-[#102A4A]/10">
                <Shield className="w-4 h-4" /> Corporate Security
              </span>
              <span className="inline-flex items-center gap-2 bg-[#FBBF24]/10 text-[#102A4A] px-4 py-2 rounded-full text-sm font-medium border border-[#FBBF24]/20">
                <Globe className="w-4 h-4 text-[#FBBF24]" /> Scalability
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link 
                href="/auth/login"
                className="group bg-[#102A4A] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#173B66] transition-all shadow-xl shadow-[#102A4A]/25 hover:shadow-2xl hover:shadow-[#102A4A]/30 hover:-translate-y-1 flex items-center gap-2 animate-pulse hover:animate-none"
              >
                Start Your Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="flex items-center gap-2 text-[#102A4A] font-semibold px-6 py-4 rounded-xl border-2 border-[#102A4A]/20 hover:border-[#102A4A]/40 hover:bg-[#102A4A]/5 transition-all">
                <PlayCircle className="w-5 h-5" />
                Watch Demo
              </button>
            </div>

            {/* Trust Line */}
            <p className="text-sm text-gray-500">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 mx-4 md:mx-0">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-gray-400 text-sm">BISMAN ERP Dashboard</span>
              </div>
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Revenue', value: '₹12.5L', change: '+12%' },
                    { label: 'Orders', value: '1,234', change: '+8%' },
                    { label: 'Customers', value: '856', change: '+15%' },
                    { label: 'Growth', value: '24%', change: '+3%' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <p className="text-gray-400 text-sm">{stat.label}</p>
                      <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                      <span className="text-green-400 text-sm">{stat.change}</span>
                    </div>
                  ))}
                </div>
                <div className="h-32 md:h-48 bg-gray-800/30 rounded-lg border border-gray-700 flex items-center justify-center">
                  <BarChart3 className="w-16 h-16 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              SME Agility Meets Enterprise Power
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Most ERPs force you to choose between simplicity and capability. BISMAN gives you both.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '⚡',
                title: 'Speed & Simplicity',
                description: 'Experience the speed of a startup tool with the depth of an enterprise suite.',
                color: 'border-[#FBBF24]',
              },
              {
                icon: '🛡️',
                title: 'Reliability & Compliance',
                description: 'Fully GST compliant with deep logistics workflows built-in.',
                color: 'border-[#102A4A]',
              },
              {
                icon: '💰',
                title: 'Cost Advantage',
                description: 'Multi-tenant architecture drives costs down without compromising quality.',
                color: 'border-green-500',
              },
            ].map((item, i) => (
              <div 
                key={i} 
                className={`bg-white p-8 rounded-2xl shadow-sm border-l-4 ${item.color} hover:shadow-lg transition-shadow`}
              >
                <span className="text-4xl mb-4 block">{item.icon}</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Makes BISMAN Different
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Enterprise-grade features designed for growing businesses
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="group bg-white p-8 rounded-2xl border border-gray-200 hover:border-[#102A4A] hover:shadow-xl transition-all"
              >
                <div className="w-14 h-14 bg-[#102A4A]/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#102A4A] transition-colors">
                  <feature.icon className="w-7 h-7 text-[#102A4A] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Marquee */}
      <section id="modules" className="py-20 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-12">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Core Modules
            </h2>
            <p className="text-gray-600">
              Everything you need to run your business, unified.
            </p>
          </div>
        </div>

        {/* Marquee */}
        <div className="relative">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...modules, ...modules].map((module, i) => (
              <div 
                key={i}
                className="inline-flex flex-col items-center justify-center min-w-[280px] mx-3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
              >
                <h4 className="font-bold text-[#102A4A] mb-1">{module.title}</h4>
                <p className="text-gray-600 text-sm text-center">{module.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <style jsx>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 25s linear infinite;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
        `}</style>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Flexible Pricing Designed for Growth
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Start small, scale big. Only pay for what you need.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier, i) => (
              <div 
                key={i}
                className={`relative bg-white p-8 rounded-2xl border-2 transition-all ${
                  tier.highlighted 
                    ? 'border-[#102A4A] shadow-xl scale-105' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FBBF24] text-[#102A4A] px-4 py-1 rounded-full text-sm font-bold">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <p className="text-gray-600 text-sm mb-6">{tier.description}</p>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#FBBF24] flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/login"
                  className={`block w-full text-center py-3 px-6 rounded-xl font-semibold transition-all ${
                    tier.highlighted
                      ? 'bg-[#102A4A] text-white hover:bg-[#173B66]'
                      : 'bg-gray-100 text-[#102A4A] hover:bg-gray-200'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-[#102A4A] to-[#1a3a5c]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Your ERP is ready. Are you?
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
            Join the ambitious leaders using BISMAN to unify their operations and scale globally.
          </p>
          <Link 
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-[#FBBF24] text-[#102A4A] px-10 py-5 rounded-xl font-bold text-lg hover:bg-[#fcd34d] transition-all shadow-2xl hover:shadow-[#FBBF24]/30 hover:-translate-y-1"
          >
            Start Your Free Trial
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold text-white">
                  BISMAN<span className="text-[#FBBF24]">.</span>
                </span>
              </div>
              <p className="text-sm">
                The operating system for the next global leader. Simple, Fast, Secure.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#modules" className="hover:text-white transition-colors">Modules</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} BISMAN ERP. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
