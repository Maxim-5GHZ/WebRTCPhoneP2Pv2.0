import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuth';

const TwoFactorAuthPage: React.FC = () => {
    const [code, setCode] = useState('');
    const { verify2FA, loginFor2FA } = useAuthContext();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await verify2FA(loginFor2FA, code);
            navigate('/');
        } catch (error) {
            console.error('Failed to verify 2FA code', error);
            // Handle error (e.g., show an error message)
        }
    };

    return (
        <div>
            <h2>Enter 2FA Code</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="code">Verification Code:</label>
                    <input
                        type="text"
                        id="code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Verify</button>
            </form>
        </div>
    );
};

export default TwoFactorAuthPage;
