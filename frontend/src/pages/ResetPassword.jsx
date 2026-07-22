import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../context/AuthContext';
import './Login.css';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {

            setError('Passwords do not match.');
            return;
        }

        try {
            await api.post('/reset-password', {
                token: token,
                newPassword: password
            });

            setMessage('Your password has been successfully changed. Redirecting to login page...');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {

            setError(err.response?.data?.error || 'Reset failed. Token may be invalid or expired.');
        }
    };


    if (!token) return <p>Invalid request. Token not found.</p>;

    return (
        <div className="login-page-container">
            <div className="login-form-container" style={{maxWidth: "400px", margin: "auto", padding: "20px"}}>

                <h2>Set New Password</h2>

                <form onSubmit={handleSubmit}>
                    <div>

                        <label>New Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <div>

                        <label>Confirm Password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </div>

                    {message && <p style={{color: 'green'}}>{message}</p>}
                    {error && <p className="login-error-message">{error}</p>}


                    <button type="submit" className="login-button" style={{outline:'none'}}>Update Password</button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;