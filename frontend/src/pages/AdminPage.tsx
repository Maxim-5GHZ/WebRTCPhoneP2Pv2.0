import React, { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '../hooks/useAuth';
import * as adminApi from '../services/adminApi';
import type { User } from '../types/types';
import UserTable from '../components/UserTable';
import { Header } from "../components/Header.tsx";

const AdminPage: React.FC = () => {
    const { logout, user, toggle2FA } = useAuthContext();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await adminApi.getAllUsers();
            setUsers(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
        finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <>
            <Header user={user} onLogout={logout} onToggle2FA={toggle2FA} />
            <div style={{ padding: '20px' }}>
                <h1>Admin Panel</h1>
                <p>Welcome, administrator!</p>
                
                <hr style={{ margin: '20px 0' }} />

                <h2>User Management</h2>
                {loading && <p>Loading users...</p>}
                {error && <p style={{ color: 'red' }}>Error: {error}</p>}
                {!loading && !error && (
                    <UserTable users={users} onDataChange={fetchUsers} />
                )}
            </div>
        </>
    );
};

export default AdminPage;