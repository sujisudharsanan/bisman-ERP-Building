// Theme archive stub - safely export a minimal theme to avoid module not found errors
export function ThemeRegistry(props: { children?: React.ReactNode }) {
	return props.children || null;
}

export const theme: Record<string, unknown> = {};
