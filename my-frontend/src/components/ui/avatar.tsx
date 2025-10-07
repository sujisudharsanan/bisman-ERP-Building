"use client";

import React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: React.ReactNode;
	className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ children, className = "", ...props }) => {
	return (
		<div
			{...props}
			className={
				"inline-flex items-center justify-center overflow-hidden rounded-full bg-gray-100 " +
				(className || "")
			}
		>
			{children}
		</div>
	);
};

export const AvatarImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({ className = "", ...props }) => (
	// eslint-disable-next-line jsx-a11y/alt-text
	<img {...props} className={("block w-full h-full object-cover " + className).trim()} />
);

export const AvatarFallback: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ children, className = "", ...props }) => (
	<span {...props} className={("inline-flex items-center justify-center w-full h-full " + className).trim()}>
		{children}
	</span>
);

export default Avatar;
