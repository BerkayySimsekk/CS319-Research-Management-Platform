import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResearcherDashboard.css';
import './AdminDashboard.css';
import '../Forms.css';
import StudyCard from '../../components/StudyCard';
import { api } from '../../context/AuthContext';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [allStudies, setAllStudies] = useState([]);
    const [users, setUsers] = useState([]);
    const [originalRoles, setOriginalRoles] = useState(new Map());
    const [unsavedChanges, setUnsavedChanges] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deadlineFilter, setDeadlineFilter] = useState('');
    const [sortBy, setSortBy] = useState('name');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const [studiesResponse, usersResponse] = await Promise.all([
                    api.get('/api/studies/my-studies'),
                    api.get('/api/users')
                ]);

                const studiesData = studiesResponse.data || [];
                const usersData = usersResponse.data || [];


                const sanitizedUsers = usersData.map(user => ({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }));
                setUsers(sanitizedUsers);


                const originalRolesMap = new Map();
                sanitizedUsers.forEach(user => {
                    originalRolesMap.set(user.id, user.role);
                });
                setOriginalRoles(originalRolesMap);
                setUnsavedChanges(new Set());


                const studiesWithStats = await Promise.all(
                    studiesData.map(async (study) => {
                        try {
                            const tasksResponse = await api.get(`/api/studies/${study.id}/tasks`).catch(() => ({ data: [] }));

                            const tasks = tasksResponse.data || [];


                            const researcherName = study.creatorName || 'Unknown';


                            const participantIds = new Set(tasks.map(t => t.participantId));
                            const participantCount = participantIds.size;


                            const taskCount = tasks.length;


                            const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
                            const completionPercentage = taskCount > 0
                                ? Math.round((completedTasks / taskCount) * 100)
                                : 0;


                            const deadline = study.accessWindowEnd
                                ? new Date(study.accessWindowEnd).toISOString().split('T')[0]
                                : null;

                            return {
                                id: study.id,
                                title: study.title,
                                participantCount,
                                taskCount,
                                completionPercentage,
                                researcherName,
                                deadline: deadline
                            };
                        } catch (err) {
                            console.error(`Error fetching data for study ${study.id}:`, err);
                            return {
                                id: study.id,
                                title: study.title,
                                participantCount: 0,
                                taskCount: 0,
                                completionPercentage: 0,
                                researcherName: study.creatorName || 'Unknown',
                                deadline: null
                            };
                        }
                    })
                );

                setAllStudies(studiesWithStats);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load dashboard data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);


    const filteredAndSortedStudies = useMemo(() => {
        let filtered = [...allStudies];


        if (searchQuery.trim()) {
            filtered = filtered.filter(study =>
                study.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }


        if (deadlineFilter) {
            filtered = filtered.filter(study => {
                if (!study.deadline) return false;
                return study.deadline === deadlineFilter;
            });
        }


        filtered.sort((a, b) => {
            if (sortBy === 'name') {
                return a.title.localeCompare(b.title);
            } else if (sortBy === 'progress') {
                return b.completionPercentage - a.completionPercentage;
            }
            return 0;
        });

        return filtered;
    }, [allStudies, searchQuery, deadlineFilter, sortBy]);

    const handleStudyClick = (studyId) => {
        navigate(`/admin-dashboard/study/${studyId}`);
    };

    const handleDeleteStudy = (studyId) => {
        const study = allStudies.find((item) => item.id === studyId);
        const studyTitle = study ? study.title : `Study ${studyId}`;
        alert(`Delete ${studyTitle} (Mock functionality)`);
    };

    const handleRoleChange = (userId, newRole) => {

        setUsers(users.map(user =>
            user.id === userId ? { ...user, role: newRole } : user
        ));


        const originalRole = originalRoles.get(userId);
        if (newRole !== originalRole) {

            setUnsavedChanges(prev => new Set(prev).add(userId));
        } else {

            setUnsavedChanges(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        }
    };

    const handleSaveRole = async (userId) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        try {

            await api.put(`/api/users/${userId}/role`, { role: user.role });


            setOriginalRoles(prev => {
                const newMap = new Map(prev);
                newMap.set(userId, user.role);
                return newMap;
            });


            setUnsavedChanges(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });

            alert(`Role updated to ${user.role} for ${user.name}`);
        } catch (err) {

            console.error('Error updating user role:', err);
            alert(`Role update functionality may require backend endpoint. Current role: ${user.role}`);
        }
    };

    return (
        <div className="researcher-dashboard">
            <div className="dashboard-header">
                <h1>Admin Dashboard</h1>
                <p className="dashboard-subtitle">System-wide overview and management</p>
            </div>

            {loading ? (
                <div className="admin-section">
                    <div className="admin-section-content">
                        <p style={{textAlign: 'center', color: '#999', padding: '2rem'}}>
                            Loading dashboard data...
                        </p>
                    </div>
                </div>
            ) : error ? (
                <div className="admin-section">
                    <div className="admin-section-content">
                        <p style={{textAlign: 'center', color: '#f44336', padding: '2rem'}}>
                            {error}
                        </p>
                    </div>
                </div>
            ) : (
                <>

                    <div className="admin-section">
                        <div className="admin-section-header">
                            <h2>All Studies ({allStudies.length})</h2>
                        </div>
                        <div className="admin-section-content">

                            {allStudies.length > 0 && (
                                <div style={{marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #444'}}>
                                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', alignItems: 'end'}}>

                                        <div className="form-group" style={{marginBottom: 0}}>
                                            <label className="form-label">Search Studies</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Search by study name..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>


                                        <div className="form-group" style={{marginBottom: 0}}>
                                            <label className="form-label">Filter by Deadline</label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                value={deadlineFilter}
                                                onChange={(e) => setDeadlineFilter(e.target.value)}
                                            />
                                        </div>


                                        <div className="form-group" style={{marginBottom: 0}}>
                                            <label className="form-label">Sort By</label>
                                            <select
                                                className="form-select"
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                            >
                                                <option value="name">Name</option>
                                                <option value="progress">Progress</option>
                                            </select>
                                        </div>


                                        {(searchQuery || deadlineFilter) && (
                                            <div className="form-group" style={{marginBottom: 0}}>
                                                <button
                                                    className="form-button form-button-secondary"
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setDeadlineFilter('');
                                                    }}
                                                    style={{width: '100%'}}
                                                >
                                                    Clear Filters
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {filteredAndSortedStudies.length !== allStudies.length && (
                                        <p style={{marginTop: '1rem', color: '#aaa', fontSize: '0.9rem'}}>
                                            Showing {filteredAndSortedStudies.length} of {allStudies.length} studies
                                        </p>
                                    )}
                                </div>
                            )}
                            <div className="studies-grid">
                                {allStudies.length === 0 ? (
                                    <p style={{textAlign: 'center', color: '#999', padding: '2rem'}}>
                                        No studies found.
                                    </p>
                                ) : filteredAndSortedStudies.length === 0 ? (
                                    <p style={{textAlign: 'center', color: '#999', padding: '2rem'}}>
                                        No studies match your filters. Try adjusting your search criteria.
                                    </p>
                                ) : (
                                    filteredAndSortedStudies.map(study => (
                                        <StudyCard
                                            key={study.id}
                                            study={study}
                                            onClick={() => handleStudyClick(study.id)}
                                            showSettingsMenu
                                            onDelete={handleDeleteStudy}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>


            <div className="admin-section">
                <div className="admin-section-header">
                    <h2>User Management ({users.length} users)</h2>
                </div>
                <div className="admin-section-content">
                    <div className="users-table">
                        <div className="users-header-row">
                            <div className="user-col-name">Name</div>
                            <div className="user-col-email">Email</div>
                            <div className="user-col-role">Role</div>
                            <div className="user-col-actions">Actions</div>
                        </div>
                        {users.map(user => {
                            const hasUnsavedChanges = unsavedChanges.has(user.id);
                            return (
                            <div
                                key={user.id}
                                className={`user-row ${hasUnsavedChanges ? 'user-row-unsaved' : ''}`}
                            >
                                <div className="user-col-name">
                                    <span className="user-name">{user.name}</span>
                                </div>
                                <div className="user-col-email">
                                    <span className="user-email">{user.email}</span>
                                </div>
                                <div className="user-col-role">
                                    <select
                                        className="role-select"
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    >
                                        <option value="PARTICIPANT">Participant</option>
                                        <option value="RESEARCHER">Researcher</option>
                                        <option value="REVIEWER">Reviewer</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                                <div className="user-col-actions">
                                    <button
                                        className="save-role-button"
                                        onClick={() => handleSaveRole(user.id)}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            </div>
                </>
            )}
        </div>
    );
};

export default AdminDashboard;
