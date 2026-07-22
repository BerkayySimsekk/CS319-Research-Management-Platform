import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResearcherDashboard.css';
import '../Forms.css';
import StudyCard from '../../components/StudyCard';
import { api } from '../../context/AuthContext';

const ResearcherDashboard = () => {
    const navigate = useNavigate();
    const [studies, setStudies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deadlineFilter, setDeadlineFilter] = useState('');
    const [sortBy, setSortBy] = useState('name');

    useEffect(() => {
        const fetchStudies = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/studies/my-studies');
                const studiesData = response.data;


                const studiesWithStats = await Promise.all(
                    studiesData.map(async (study) => {
                        try {

                            const [tasksResponse, taskDefinitionsResponse] = await Promise.all([
                                api.get(`/api/studies/${study.id}/tasks`).catch(() => ({ data: [] })),
                                api.get(`/api/studies/${study.id}/task-definitions`).catch(() => ({ data: [] }))
                            ]);

                            const tasks = tasksResponse.data || [];
                            const taskDefinitions = taskDefinitionsResponse.data || [];


                            const participantIds = new Set(tasks.map(t => t.participantId));
                            const participantCount = participantIds.size;



                            const taskCount = taskDefinitions.length;


                            const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
                            const totalAssignedTasks = tasks.length;
                            const completionPercentage = totalAssignedTasks > 0
                                ? Math.round((completedTasks / totalAssignedTasks) * 100)
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
                                deadline: deadline
                            };
                        } catch (err) {
                            console.error(`Error fetching tasks for study ${study.id}:`, err);
                            return {
                                id: study.id,
                                title: study.title,
                                participantCount: 0,
                                taskCount: 0,
                                completionPercentage: 0,
                                deadline: null
                            };
                        }
                    })
                );

                setStudies(studiesWithStats);
            } catch (err) {
                console.error('Error fetching studies:', err);
                setError('Failed to load studies. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchStudies();
    }, []);

    const handleCardClick = (studyId) => {
        navigate(`/researcher-dashboard/study/${studyId}`);
    };


    const filteredAndSortedStudies = useMemo(() => {
        let filtered = [...studies];


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
    }, [studies, searchQuery, deadlineFilter, sortBy]);

    return (
        <div className="researcher-dashboard">
            <div className="dashboard-header">
                <h1>Researcher Dashboard</h1>
                <p className="dashboard-subtitle">Manage your studies and track participant progress</p>
            </div>


            <div className="dashboard-actions" style={{marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                <button
                    className="form-button form-button-primary"
                    onClick={() => navigate('/researcher-dashboard/manage-studies')}
                    style={{width: 'auto'}}
                >
                    + Create New Study
                </button>
                <button
                    className="form-button form-button-secondary"
                    onClick={() => navigate('/researcher-dashboard/manage-quizzes')}
                    style={{width: 'auto'}}
                >
                    Manage Quizzes
                </button>
                <button
                    className="form-button form-button-secondary"
                    onClick={() => navigate('/researcher-dashboard/artifacts')}
                    style={{width: 'auto'}}
                >
                    Upload Artifacts
                </button>
            </div>


            {!loading && !error && studies.length > 0 && (
                <div className="dashboard-card full-width" style={{marginBottom: '2rem'}}>
                    <div className="card-content">
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
                        {filteredAndSortedStudies.length !== studies.length && (
                            <p style={{marginTop: '1rem', color: '#aaa', fontSize: '0.9rem'}}>
                                Showing {filteredAndSortedStudies.length} of {studies.length} studies
                            </p>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="dashboard-card full-width">
                    <div className="card-content">
                        <p style={{textAlign: 'center', color: '#999', padding: '2rem'}}>
                            Loading studies...
                        </p>
                    </div>
                </div>
            ) : error ? (
                <div className="dashboard-card full-width">
                    <div className="card-content">
                        <p style={{textAlign: 'center', color: '#f44336', padding: '2rem'}}>
                            {error}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="studies-grid">
                    {filteredAndSortedStudies.length === 0 ? (
                        <div className="dashboard-card full-width">
                            <div className="card-content">
                                <p style={{textAlign: 'center', color: '#999', padding: '2rem'}}>
                                    {studies.length === 0
                                        ? 'No studies yet. Create your first study to get started.'
                                        : 'No studies match your filters. Try adjusting your search criteria.'
                                    }
                                </p>
                            </div>
                        </div>
                    ) : (
                        filteredAndSortedStudies.map(study => (
                            <StudyCard
                                key={study.id}
                                study={study}
                                onClick={() => handleCardClick(study.id)}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ResearcherDashboard;
