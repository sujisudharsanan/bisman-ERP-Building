// Minimal RBAC hooks stubbed for compile-time safety.
// Replace these with real implementations when integrating RBAC backend.

import { useState, useEffect } from 'react';

export function useRoles() {
	const [roles, setRoles] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchRoles = async () => {
		setLoading(true);
		setError(null);
		try {
			const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
			const response = await fetch('/api/roles', {
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				credentials: 'include',
			});
			
			if (!response.ok) {
				throw new Error('Failed to fetch roles');
			}
			
			const data = await response.json();
			const roleList = data?.roles || data?.data || data || [];
			setRoles(Array.isArray(roleList) ? roleList : []);
		} catch (err) {
			console.error('Error fetching roles:', err);
			setError(err instanceof Error ? err.message : 'Failed to fetch roles');
			setRoles([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRoles();
	}, []);

	const createRole = async (payload: any) => {
		try {
			const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
			const response = await fetch('/api/roles', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				credentials: 'include',
				body: JSON.stringify(payload),
			});
			
			if (!response.ok) {
				throw new Error('Failed to create role');
			}
			
			await fetchRoles();
			return await response.json();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create role');
			return null;
		}
	};

	const deleteRole = async (id: number) => {
		try {
			const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
			const response = await fetch(`/api/roles/${id}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				credentials: 'include',
			});
			
			if (!response.ok) {
				throw new Error('Failed to delete role');
			}
			
			await fetchRoles();
			return true;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete role');
			return false;
		}
	};

	const refetch = fetchRoles;

	return { roles, loading, error, createRole, deleteRole, refetch };
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
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchUsers = async () => {
		setLoading(true);
		setError(null);
		try {
			const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
			const response = await fetch('/api/users?limit=500', {
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				credentials: 'include',
			});
			
			if (!response.ok) {
				throw new Error('Failed to fetch users');
			}
			
			const data = await response.json();
			// Handle different response formats
			const userList = data?.users || data?.data || data || [];
			setUsers(Array.isArray(userList) ? userList : []);
		} catch (err) {
			console.error('Error fetching users:', err);
			setError(err instanceof Error ? err.message : 'Failed to fetch users');
			setUsers([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUsers();
	}, []);

	const assignRole = async (userId: number, roleId: number) => {
		try {
			const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
			const response = await fetch(`/api/users/${userId}/role`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				credentials: 'include',
				body: JSON.stringify({ roleId }),
			});
			
			if (!response.ok) {
				throw new Error('Failed to assign role');
			}
			
			// Refresh users list after role assignment
			await fetchUsers();
			return true;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to assign role');
			return false;
		}
	};

	const refetch = fetchUsers;

	return { users, loading, error, assignRole, refetch };
}

export default {};
