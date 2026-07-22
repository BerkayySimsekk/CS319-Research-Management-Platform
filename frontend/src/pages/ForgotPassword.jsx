import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';
import './Login.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        try {
            await api.post('/forgot-password', { email });


            setMessage('A reset link has been sent. You will be redirected to the login page in 3 seconds...');


            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err) {
            setError(err.response?.data?.error || 'Bir hata oluştu.');
        }
    };

    return (
        <div className="login-page-container" style={{minHeight: '100vh',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <div className="login-form-container" style={{maxWidth: "400px", margin: "auto", padding: "20px"}}>

                <h2>Forgot Password</h2>

                <p>Enter the email address registered to your account.</p>

                <form onSubmit={handleSubmit}>
                    <div>

                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {message && <p style={{color: 'green'}}>{message}</p>}
                    {error && <p className="login-error-message">{error}</p>}


                    <button type="submit" className="login-button" style={{outline:'none'}}>Send</button>


                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        style={{marginTop: '10px', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', outline: 'none', display: 'inline', padding: 0}}>
                        Back to login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;