


import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';


import './Login.css';
import CodeArenaLogo from '../assets/CodeArenaLogo.png';

const Register = () => {

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('PARTICIPANT');
    const [skills, setSkills] = useState('');
    const [yearsOfExperience, setYearsOfExperience] = useState('');
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const { login } = useAuth();


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const requestData = {
                name: name,
                email: email,
                password: password,
                role: role
            };


            if (role === 'PARTICIPANT') {
                requestData.skills = skills;
                requestData.yearsOfExperience = yearsOfExperience ? parseInt(yearsOfExperience) : 0;
            }

            const response = await api.post('/register', requestData);


            const userData = response.data;
            login(userData);


            if (userData.role === 'RESEARCHER') {
                navigate('/researcher-dashboard');
            } else if (userData.role === 'REVIEWER') {
                navigate('/reviewer-dashboard');
            } else if (userData.role === 'ADMIN') {
                navigate('/admin-dashboard');
            } else {
                navigate('/participant-dashboard');
            }

        } catch (err) {

            console.error('Registration failed:', err);
            if (err.response && err.response.status === 409) {

                setError(err.response.data.error || 'Username or email is already in use.');
            } else {
                setError('An error occurred during registration. Please try again.');
            }
        }
    };




    return (
        <div className="login-page-container">


            <div className="login-left-column">
                <img
                    src={CodeArenaLogo}
                    alt="CodeArena Logo"
                    className="login-logo"
                />
                <h1>Create your Account</h1>
                <p>Join the platform to evaluate artifacts side by side.</p>
            </div>


            <div className="login-right-column">
                <div className="login-form-container">
                    <h2>Register</h2>

                    <form onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="name">Username</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your username"
                                required
                            />
                        </div>


                        <div>
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email address"
                                required
                            />
                        </div>


                        <div>
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                        </div>


                        <div>
                            <label htmlFor="role">User Type</label>
                            <select
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                required
                            >
                                <option value="PARTICIPANT">Participant</option>
                                <option value="RESEARCHER">Researcher</option>
                                <option value="REVIEWER">Reviewer</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>


                        {role === 'PARTICIPANT' && (
                            <>
                                <div>
                                    <label htmlFor="skills">Skills (comma-separated)</label>
                                    <input
                                        type="text"
                                        id="skills"
                                        value={skills}
                                        onChange={(e) => setSkills(e.target.value)}
                                        placeholder="e.g., Java, Python, React, SQL"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="yearsOfExperience">Years of Experience</label>
                                    <input
                                        type="number"
                                        id="yearsOfExperience"
                                        value={yearsOfExperience}
                                        onChange={(e) => setYearsOfExperience(e.target.value)}
                                        placeholder="e.g., 5"
                                        min="0"
                                        max="50"
                                    />
                                </div>
                            </>
                        )}


                        {error && <p className="login-error-message">{error}</p>}

                        <button type="submit" className="login-button">
                            Create Account
                        </button>


                        <Link to="/login" className="login-forgot-password">
                            Already have an account? Log in
                        </Link>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;