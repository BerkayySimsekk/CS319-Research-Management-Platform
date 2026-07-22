import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
    const { user, updateUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);


    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        email: '',
        skills: '',
        yearsOfExperience: 0
    });

    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordError, setPasswordError] = useState(null);
    const [passwordSuccess, setPasswordSuccess] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/profile');
            setProfile(response.data);
            setEditForm({
                email: response.data.email || '',
                skills: response.data.skills || '',
                yearsOfExperience: response.data.yearsOfExperience || 0
            });
        } catch (err) {
            setError('Failed to load profile');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            const response = await api.put('/api/profile', editForm);
            setProfile(response.data);
            setIsEditing(false);
            setSuccess('Profile updated successfully');


            if (updateUser && response.data.email !== user.email) {
                updateUser({ ...user, email: response.data.email });
            }
        } catch (err) {
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError('Failed to update profile');
            }
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(null);

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (passwordForm.newPassword.length < 4) {
            setPasswordError('New password must be at least 4 characters');
            return;
        }

        try {
            await api.put('/api/profile/password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            setPasswordSuccess('Password changed successfully');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswordForm(false);
        } catch (err) {
            if (err.response?.data?.error) {
                setPasswordError(err.response.data.error);
            } else {
                setPasswordError('Failed to change password');
            }
        }
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditForm({
            email: profile.email || '',
            skills: profile.skills || '',
            yearsOfExperience: profile.yearsOfExperience || 0
        });
        setError(null);
    };

    if (loading) {
        return <div className="profile-page"><p>Loading profile...</p></div>;
    }

    return (
        <div className="profile-page">
            <h1>My Profile</h1>

            {error && <div className="profile-message error">{error}</div>}
            {success && <div className="profile-message success">{success}</div>}

            <div className="profile-card">
                <div className="profile-header">
                    <div className="profile-avatar">
                        {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="profile-title">
                        <h2>{profile?.name}</h2>
                        <span className="profile-role">{profile?.role}</span>
                    </div>
                </div>

                {!isEditing ? (
                    <div className="profile-info">
                        <div className="profile-field">
                            <label>Email</label>
                            <p>{profile?.email || 'Not set'}</p>
                        </div>
                        <div className="profile-field">
                            <label>Skills</label>
                            <p>{profile?.skills || 'Not specified'}</p>
                        </div>
                        <div className="profile-field">
                            <label>Years of Experience</label>
                            <p>{profile?.yearsOfExperience ?? 0} years</p>
                        </div>
                        <div className="profile-actions">
                            <button onClick={() => setIsEditing(true)} className="btn-primary">
                                Edit Profile
                            </button>
                            <button onClick={() => setShowPasswordForm(!showPasswordForm)} className="btn-secondary">
                                Change Password
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleEditSubmit} className="profile-form">
                        <div className="profile-field">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                placeholder="Enter your email"
                            />
                        </div>
                        <div className="profile-field">
                            <label htmlFor="skills">Skills</label>
                            <input
                                type="text"
                                id="skills"
                                value={editForm.skills}
                                onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                                placeholder="e.g., JavaScript, Python, React"
                            />
                        </div>
                        <div className="profile-field">
                            <label htmlFor="yearsOfExperience">Years of Experience</label>
                            <input
                                type="number"
                                id="yearsOfExperience"
                                min="0"
                                value={editForm.yearsOfExperience}
                                onChange={(e) => setEditForm({ ...editForm, yearsOfExperience: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="profile-actions">
                            <button type="submit" className="btn-primary">Save Changes</button>
                            <button type="button" onClick={cancelEdit} className="btn-secondary">Cancel</button>
                        </div>
                    </form>
                )}
            </div>

            {showPasswordForm && (
                <div className="profile-card password-card">
                    <h3>Change Password</h3>

                    {passwordError && <div className="profile-message error">{passwordError}</div>}
                    {passwordSuccess && <div className="profile-message success">{passwordSuccess}</div>}

                    <form onSubmit={handlePasswordSubmit} className="profile-form">
                        <div className="profile-field">
                            <label htmlFor="currentPassword">Current Password</label>
                            <input
                                type="password"
                                id="currentPassword"
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                required
                            />
                        </div>
                        <div className="profile-field">
                            <label htmlFor="newPassword">New Password</label>
                            <input
                                type="password"
                                id="newPassword"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                required
                            />
                        </div>
                        <div className="profile-field">
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                required
                            />
                        </div>
                        <div className="profile-actions">
                            <button type="submit" className="btn-primary">Update Password</button>
                            <button type="button" onClick={() => {
                                setShowPasswordForm(false);
                                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                setPasswordError(null);
                            }} className="btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Profile;

