import type { User } from "../types/types";

const API_BASE_URL = "/api/admin";

function getAuthHeader() {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error("No auth token found");
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

export async function getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'GET',
        headers: getAuthHeader()
    });
    if (!response.ok) {
        throw new Error('Failed to fetch users');
    }
    return response.json();
}

export async function blockUser(userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/block`, {
        method: 'POST',
        headers: getAuthHeader()
    });
    if (!response.ok) {
        throw new Error('Failed to block user');
    }
}

export async function unblockUser(userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/unblock`, {
        method: 'POST',
        headers: getAuthHeader()
    });
    if (!response.ok) {
        throw new Error('Failed to unblock user');
    }
}

export async function changeUserRole(userId: number, newRole: 'Admin' | 'Base' | 'VIP'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(newRole) // Spring expects the raw string for the enum
    });
    if (!response.ok) {
        throw new Error('Failed to change user role');
    }
}
