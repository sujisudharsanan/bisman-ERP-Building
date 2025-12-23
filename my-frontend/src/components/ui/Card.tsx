import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <div className={`bg-white dark:bg-gray-800 rounded-md shadow-sm ${className}`}>{children}</div>;
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <div className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <h3 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <div className={`p-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <div className={`px-4 py-3 border-t border-gray-200 dark:border-gray-700 ${className}`}>{children}</div>;
}

export default Card;
