import React from 'react';
import type { User } from '../types/types';
import * as adminApi from '../services/adminApi';

interface UserTableProps {
    users: User[];
    onDataChange: () => void; // Callback to refresh data
}

const UserTable: React.FC<UserTableProps> = ({ users, onDataChange }) => {

    const handleBlock = async (id: number) => {
        if (window.confirm('Are you sure you want to block this user?')) {
            await adminApi.blockUser(id);
            onDataChange();
        }
    };

    const handleUnblock = async (id: number) => {
        if (window.confirm('Are you sure you want to unblock this user?')) {
            await adminApi.unblockUser(id);
            onDataChange();
        }
    };

    const handleChangeRole = async (id: number, currentRole: string) => {
        const newRole = prompt('Enter new role (Admin, VIP, Base):', currentRole);
        if (newRole && ['Admin', 'VIP', 'Base'].includes(newRole)) {
            await adminApi.changeUserRole(id, newRole as 'Admin' | 'VIP' | 'Base');
            onDataChange();
        } else if (newRole) {
            alert('Invalid role specified.');
        }
    };

    return (
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Login</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {users.map((user) => (
                    <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.username}</td>
                        <td>{user.login}</td>
                        <td>{user.role}</td>
                        <td>{user.activation}</td>
                        <td>
                            {user.activation === 'Enable' ? (
                                <button onClick={() => handleBlock(user.id)}>Block</button>
                            ) : (
                                <button onClick={() => handleUnblock(user.id)}>Unblock</button>
                            )}
                            <button onClick={() => handleChangeRole(user.id, user.role)}>Change Role</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default UserTable;
