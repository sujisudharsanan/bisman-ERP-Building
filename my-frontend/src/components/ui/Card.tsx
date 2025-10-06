import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <div className={`bg-white rounded-md shadow-sm ${className}`}>{children}</div>;
}

export default Card;
