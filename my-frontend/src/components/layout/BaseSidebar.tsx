"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { X, Loader2, AlertCircle } from "lucide-react";
import { getIcon } from '../../utils/iconMap';
import { safeComponent } from '@/lib/safeComponent';
import { useMenu } from '../../hooks/useMenu';

// Export getIcon for external use
export { getIcon };


interface User {
	roleName?: string;
}

interface BaseSidebarProps {
	user: User | null;
	collapsed: boolean;
	onCollapse: (collapsed: boolean) => void;
	isMobile: boolean;
}

const BaseSidebar: React.FC<BaseSidebarProps> = ({ user, collapsed, onCollapse, isMobile }) => {
	const pathname = usePathname();
	
	// Use DB-driven menu instead of hardcoded roleLayoutConfig
	const { menu, isLoading, error} = useMenu();
	
	// Flatten pages from all modules for sidebar display
	const menuItems = menu.flatMap(module => 
		module.pages.map(page => ({
			id: page.code,
			label: page.name,
			href: page.route,
			icon: page.icon,
			moduleCode: module.code,
			moduleName: module.name,
			moduleColor: module.colorCode,
		}))
	);

	useEffect(() => {
		if (isMobile) {
			onCollapse(true);
		}
	}, [pathname, isMobile, onCollapse]);

	// Keyboard accessibility: close sidebar with Escape on mobile
	useEffect(() => {
		if (!isMobile || collapsed) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onCollapse(true);
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isMobile, collapsed, onCollapse]);

	return (
		<>
			{/* Mobile Overlay */}
			{isMobile && !collapsed && (
				<div
					className="fixed inset-0 bg-black/50 z-40"
					onClick={() => onCollapse(true)}
					aria-hidden="true"
					tabIndex={-1}
				/>
			)}
			{/* Sidebar */}
			<aside
				className={`
					fixed md:sticky top-0 left-0 h-screen z-50
					bg-gray-900/95 backdrop-blur-sm border-r border-gray-800
					transition-all duration-300 ease-in-out
					${collapsed && !isMobile ? 'w-16' : 'w-52'}
					${isMobile && collapsed ? '-translate-x-full' : 'translate-x-0'}
					flex flex-col
				`}
				data-component="base-sidebar"
				aria-label="Main navigation"
				role="navigation"
			>
				{/* Mobile Close Button Only - Logo is in TopNavbar */}
				{isMobile && (
					<div className="p-4 border-b border-gray-800 flex items-center justify-end">
						<button
							onClick={() => onCollapse(true)}
							className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
							aria-label="Close sidebar"
						>
							<X size={20} className="text-white" />
						</button>
					</div>
				)}
				{/* Sidebar Navigation */}
								<nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Sidebar menu">
									{/* Loading State */}
									{isLoading && (
										<div className="flex flex-col items-center justify-center py-8 text-gray-400">
											<Loader2 size={24} className="animate-spin mb-2" />
											{(!collapsed || isMobile) && <span className="text-xs">Loading menu...</span>}
										</div>
									)}
									
									{/* Error State */}
									{error && !isLoading && (
										<div className="flex flex-col items-center justify-center py-8 text-red-400">
											<AlertCircle size={24} className="mb-2" />
											{(!collapsed || isMobile) && (
												<span className="text-xs text-center px-2">Unable to load menu</span>
											)}
										</div>
									)}
									
									{/* Menu Items */}
									{!isLoading && !error && menuItems.map((item) => {
										const IconComp = safeComponent(getIcon(item.icon), item.icon, 'BaseSidebar');
										const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
										return (
											<Link
												key={item.id}
												href={item.href}
												className={`
													flex items-center gap-3 px-3 py-3 rounded-lg
													transition-all duration-200
													${isActive
														? 'bg-indigo-500/20 border border-indigo-500/50 text-white shadow-lg shadow-indigo-500/30'
														: 'text-gray-400 hover:text-white hover:bg-gray-800/50'
													}
													${collapsed && !isMobile ? 'justify-center' : ''}
												`}
												title={item.label}
												aria-current={isActive ? 'page' : undefined}
												tabIndex={0}
											>
												<IconComp size={20} className={isActive ? 'text-indigo-400' : ''} aria-hidden="true" />
												{(!collapsed || isMobile) && (
													<span className="text-sm font-medium">{item.label}</span>
												)}
											</Link>
										);
									})}
								</nav>
				{/* Sidebar Footer */}
								<div className="p-4 border-t border-gray-800">
									{(!collapsed || isMobile) && user && (
										<div className="text-xs text-gray-500 space-y-1">
											<p>Role: <span className="text-gray-400">{user.roleName || 'Unknown'}</span></p>
											<p>Version: <span className="text-gray-400">{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}</span></p>
										</div>
									)}
								</div>
			</aside>
		</>
	);
};

export default BaseSidebar;
