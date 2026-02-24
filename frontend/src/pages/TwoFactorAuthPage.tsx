import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuth';

const TwoFactorAuthPage: React.FC = () => {
    const [code, setCode] = useState('');
    const { verify2FA, loading, error } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const login = location.state?.login;

    useEffect(() => {
        if (!login) {
            // Redirect or show an error if the login is not in the state
            console.error("Login information is missing for 2FA verification.");
            navigate('/login');
        }
    }, [login, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!login) {
            console.error("Cannot verify 2FA without login information.");
            return;
        }
        try {
            const result = await verify2FA(login, code);
            if (result) {
              navigate('/');
            }
        } catch (error) {
            console.error('Failed to verify 2FA code', error);
            // Error is already handled in the context
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
                {error && <p style={{ color: "red" }}>{error}</p>}
                <button type="submit" disabled={loading || !login}>
                    {loading ? 'Verifying...' : 'Verify'}
                </button>
            </form>
        </div>
    );
};

export default TwoFactorAuthPage;