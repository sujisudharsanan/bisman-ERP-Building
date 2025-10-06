// Minimal RBAC hooks stubbed for compile-time safety.
// Replace these with real implementations when integrating RBAC backend.

import { useState, useEffect } from 'react';

export function useRoles() {
	const [roles, setRoles] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(false);
		setRoles([]);
	}, []);

	const createRole = async (payload: any) => Promise.resolve(null);
	const deleteRole = async (id: number) => Promise.resolve(true);

	return { roles, loading, error, createRole, deleteRole };
}

export function useRoutes() {
	const [routes, setRoutes] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(false);
		setRoutes([]);
	}, []);

	const refetch = async () => Promise.resolve(true);

	return { routes, loading, error, refetch };
}

export function useActions() {
	const [actions, setActions] = useState<any[]>([]);
	useEffect(() => {
		setActions([]);
	}, []);
	return { actions };
}

export function usePermissions(selectedRole?: number) {
	const [permissions, setPermissions] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(false);
		setPermissions([]);
	}, [selectedRole === null ? undefined : selectedRole]);

	const updatePermission = async (
		roleId: number,
		routeId: number,
		actionId: number,
		granted: boolean
	) => {
		// stubbed
		return Promise.resolve(true);
	};

	return { permissions, loading, error, updatePermission };
}

export function useUsers() {
	const [users, setUsers] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(false);
		setUsers([]);
	}, []);

	const assignRole = async (userId: number, roleId: number) => Promise.resolve(true);

	return { users, loading, error, assignRole };
}

export default {};
