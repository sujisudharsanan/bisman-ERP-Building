'use client';

import { Shield, Briefcase, Fuel, Users, ArrowRight } from 'lucide-react';

export default function LoginPortalPage() {
  const portals = [
    {
      title: 'Admin Portal',
      description: 'System administration and configuration',
      icon: Shield,
      href: '/auth/admin-login',
      color: 'blue',
      features: [
        'User Management',
        'System Settings',
        'Security Controls',
        'Reports',
      ],
    },
    {
      title: 'Manager Portal',
      description: 'Management dashboard and oversight',
      icon: Briefcase,
      href: '/auth/manager-login',
      color: 'green',
      features: [
        'Staff Management',
        'Sales Reports',
        'Inventory Oversight',
        'Analytics',
      ],
    },
    {
      title: 'Hub Incharge Portal',
      description: 'Petrol station operations management',
      icon: Fuel,
      href: '/auth/hub-incharge-login',
      color: 'orange',
      features: [
        'Fuel Tank Monitoring',
        'Pump Operations',
        'Daily Reports',
        'Stock Alerts',
      ],
    },
    {
      title: 'General Login',
      description: 'Standard user access portal',
      icon: Users,
      href: '/auth/login',
      color: 'gray',
      features: [
        'Basic Access',
        'Role-based Dashboard',
        'Standard Features',
        'User Functions',
      ],
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50 hover:bg-blue-100',
        border: 'border-blue-200 hover:border-blue-300',
        text: 'text-blue-700',
        icon: 'text-blue-600',
      },
      green: {
        bg: 'bg-green-50 hover:bg-green-100',
        border: 'border-green-200 hover:border-green-300',
        text: 'text-green-700',
        icon: 'text-green-600',
      },
      orange: {
        bg: 'bg-orange-50 hover:bg-orange-100',
        border: 'border-orange-200 hover:border-orange-300',
        text: 'text-orange-700',
        icon: 'text-orange-600',
      },
      gray: {
        bg: 'bg-gray-50 hover:bg-gray-100',
        border: 'border-gray-200 hover:border-gray-300',
        text: 'text-gray-700',
        icon: 'text-gray-600',
      },
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-white/10 rounded-full mx-auto mb-6 flex items-center justify-center backdrop-blur-sm">
            <div className="w-12 h-12 bg-orange-400 rounded-full"></div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">BISMAN ERP</h1>
          <p className="text-xl text-blue-200 mb-2">
            Enterprise Resource Planning System
          </p>
          <p className="text-blue-300">Select your access portal to continue</p>
        </div>

        {/* Portal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {portals.map(portal => {
            const colors = getColorClasses(portal.color);
            const IconComponent = portal.icon;

            return (
              <a
                key={portal.title}
                href={portal.href}
                className={`${colors.bg} ${colors.border} border-2 rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:scale-105 group`}
              >
                <div className="text-center">
                  <div
                    className={`w-16 h-16 ${colors.bg} rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <IconComponent className={`w-8 h-8 ${colors.icon}`} />
                  </div>

                  <h3 className={`text-xl font-semibold ${colors.text} mb-2`}>
                    {portal.title}
                  </h3>

                  <p className="text-gray-600 text-sm mb-4">
                    {portal.description}
                  </p>

                  <ul className="text-xs text-gray-500 space-y-1 mb-4">
                    {portal.features.map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
                  </ul>

                  <div
                    className={`inline-flex items-center ${colors.text} font-medium group-hover:gap-3 gap-2 transition-all`}
                  >
                    Access Portal
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Quick Access */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
          <h3 className="text-white font-medium mb-3">Quick Access</h3>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
              Demo Available
            </span>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
              Multi-tenant Support
            </span>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
              Role-based Access
            </span>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
              Real-time Monitoring
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-blue-300 text-sm">
            Need help? Contact support or view documentation
          </p>
        </div>
      </div>
    </div>
  );
}
