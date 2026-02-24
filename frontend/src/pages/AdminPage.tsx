import React, { useEffect, useState } from 'react';
import { useAuthContext } from '../hooks/useAuth';

const AdminPage: React.FC = () => {
    const { user } = useAuthContext();
    const [users, setUsers] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/admin/users', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setUsers(data);
                } else {
                    setError('Failed to fetch users.');
                }
            } catch (err) {
                setError('An error occurred while fetching users.');
            }
        };

        if (user?.role === 'Admin') {
            fetchUsers();
        }
    }, [user]);

    if (user?.role !== 'Admin') {
        return <div>You are not authorized to view this page.</div>;
    }

    return (
        <div>
            <h1>Admin Panel</h1>
            {error && <p>{error}</p>}
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>{u.username}</td>
                            <td>{u.email}</td>
                            <td>{u.role}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminPage;
