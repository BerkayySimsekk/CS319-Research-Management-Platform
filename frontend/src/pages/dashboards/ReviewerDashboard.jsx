import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './ReviewerDashboard.css';
import '../Forms.css';
import { api } from '../../context/AuthContext';

const ReviewerDashboard = () => {
    const navigate = useNavigate();
    const [studies, setStudies] = useState([]);
    const [selectedStudy, setSelectedStudy] = useState(null);
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingEvaluations, setLoadingEvaluations] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [qualityFilter, setQualityFilter] = useState('all');
    const [sortBy, setSortBy] = useState('recent');
    const [comment, setComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [commentMessage, setCommentMessage] = useState(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const fetchStudies = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await api.get('/api/studies/my-studies');
                const studiesData = response.data || [];


                if (studiesData.length === 0) {
                    setStudies([]);
                    setLoading(false);
                    return;
                }


                const studiesWithStats = await Promise.all(
                    studiesData.map(async (study) => {
                        try {
                            const [tasksResponse, qualityScoreResponse] = await Promise.all([
                                api.get(`/api/studies/${study.id}/tasks`).catch(() => ({ data: [] })),
                                api.get(`/api/studies/${study.id}/quality-score`).catch(() => ({ data: { qualityScore: null, totalEvaluations: 0 } }))
                            ]);

                            const tasks = tasksResponse.data || [];
                            const qualityData = qualityScoreResponse.data || {};


                            const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
                            const totalEvaluations = qualityData.totalEvaluations || completedTasks.length;
                            const pendingReview = completedTasks.filter(t => !t.reviewed).length;


                            const qualityScore = qualityData.qualityScore;

                            return {
                                id: study.id,
                                title: study.title,
                                description: study.description || 'No description provided',
                                totalEvaluations,
                                pendingReview,
                                qualityScore,
                                participantCount: new Set(tasks.map(t => t.participantId)).size,
                                lastActivity: study.updatedAt || study.createdAt,
                                status: study.status || 'ACTIVE'
                            };
                        } catch (err) {
                            console.error(`Error fetching stats for study ${study.id}:`, err);
                            return {
                                id: study.id,
                                title: study.title,
                                description: study.description || 'No description provided',
                                totalEvaluations: 0,
                                pendingReview: 0,
                                qualityScore: null,
                                participantCount: 0,
                                lastActivity: null,
                                status: 'UNKNOWN'
                            };
                        }
                    })
                );

                setStudies(studiesWithStats);
            } catch (err) {
                console.error('Error fetching studies:', err);

                if (err.response?.status === 403 || err.response?.status === 401) {
                    setError('Access denied. Please check your permissions.');
                } else {

                    setStudies([]);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchStudies();
    }, []);

    const fetchStudyEvaluations = async (studyId) => {
        try {
            setLoadingEvaluations(true);

            const response = await api.get(`/api/studies/${studyId}/reviewer-evaluations`);
            const evaluationsData = response.data || [];


            const evaluationItems = evaluationsData.map(evaluation => ({
                id: evaluation.taskId,
                participantName: evaluation.participantName || `Participant ${evaluation.participantId}`,
                taskTitle: evaluation.taskTitle || 'Evaluation Task',
                completedAt: evaluation.completedAt,
                timeSpent: evaluation.timeSpentMinutes || 0,
                consistencyScore: evaluation.consistencyScore || 0,
                detailLevel: evaluation.detailLevel || 'Low',
                flagged: evaluation.flagged || false
            }));

            setEvaluations(evaluationItems);
        } catch (err) {
            console.error('Error fetching evaluations:', err);
            setEvaluations([]);
        } finally {
            setLoadingEvaluations(false);
        }
    };

    const handleStudySelect = (study) => {
        setSelectedStudy(study);
        fetchStudyEvaluations(study.id);
    };

    const handleBackToStudies = () => {
        setSelectedStudy(null);
        setEvaluations([]);
        setComment('');
        setCommentMessage(null);
    };

    const handleSubmitComment = async () => {
        if (!comment.trim()) {
            setCommentMessage({ type: 'error', text: 'Please enter a comment.' });
            return;
        }

        setSubmittingComment(true);
        setCommentMessage(null);
        try {
            await api.post(`/api/studies/${selectedStudy.id}/reviewer-notes`, {
                comment: comment.trim()
            });
            setCommentMessage({ type: 'success', text: 'Comment added successfully!' });
            setComment('');
            setTimeout(() => setCommentMessage(null), 3000);
        } catch (err) {
            setCommentMessage({
                type: 'error',
                text: err.response?.data?.message || 'Failed to add comment. Please try again.'
            });
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleExportStatistics = async (format = 'json') => {
        setExporting(true);
        try {
            const response = await api.get(`/api/studies/${selectedStudy.id}/export-statistics`, {
                params: { format },
                responseType: 'blob'
            });

            let mimeType = 'application/json';
            let extension = 'json';
            if (format === 'csv') {
                mimeType = 'text/csv';
                extension = 'csv';
            } else if (format === 'zip') {
                mimeType = 'application/zip';
                extension = 'zip';
            }

            const blob = new Blob([response.data], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `study_${selectedStudy.id}_statistics_${new Date().toISOString().slice(0, 10)}.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Failed to export statistics: ' + (err.response?.data?.message || err.message));
        } finally {
            setExporting(false);
        }
    };


    const filteredAndSortedStudies = useMemo(() => {
        let filtered = [...studies];


        if (searchQuery.trim()) {
            filtered = filtered.filter(study =>
                study.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }


        if (qualityFilter !== 'all') {
            filtered = filtered.filter(study => {
                if (!study.qualityScore) return false;
                if (qualityFilter === 'high') return study.qualityScore >= 85;
                if (qualityFilter === 'medium') return study.qualityScore >= 70 && study.qualityScore < 85;
                if (qualityFilter === 'low') return study.qualityScore < 70;
                return true;
            });
        }


        filtered.sort((a, b) => {
            if (sortBy === 'name') {
                return a.title.localeCompare(b.title);
            } else if (sortBy === 'evaluations') {
                return b.totalEvaluations - a.totalEvaluations;
            } else if (sortBy === 'recent') {
                return new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0);
            }
            return 0;
        });

        return filtered;
    }, [studies, searchQuery, qualityFilter, sortBy]);


    const overallStats = useMemo(() => {
        const totalEvaluations = studies.reduce((sum, s) => sum + s.totalEvaluations, 0);
        const pendingReview = studies.reduce((sum, s) => sum + s.pendingReview, 0);
        const avgQuality = studies.filter(s => s.qualityScore).length > 0
            ? Math.round(studies.filter(s => s.qualityScore).reduce((sum, s) => sum + s.qualityScore, 0) / studies.filter(s => s.qualityScore).length)
            : 0;
        const activeStudies = studies.filter(s => s.totalEvaluations > 0).length;

        return { totalEvaluations, pendingReview, avgQuality, activeStudies };
    }, [studies]);

    const getQualityColor = (score) => {
        if (!score) return '#666';
        if (score >= 85) return '#4caf50';
        if (score >= 70) return '#ffc107';
        return '#f44336';
    };

    const getQualityLabel = (score) => {
        if (!score) return 'N/A';
        if (score >= 85) return 'High';
        if (score >= 70) return 'Medium';
        return 'Low';
    };

    if (loading) {
        return (
            <div className="reviewer-dashboard">
                <div className="reviewer-header">
                    <div className="header-content">
                        <h1>Evaluation Quality Center</h1>
                        <p className="header-subtitle">Analyze and review evaluation quality across studies</p>
                    </div>
                </div>
                <div className="reviewer-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading evaluation data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="reviewer-dashboard">
                <div className="reviewer-header">
                    <div className="header-content">
                        <h1>Evaluation Quality Center</h1>
                        <p className="header-subtitle">Analyze and review evaluation quality across studies</p>
                    </div>
                </div>
                <div className="reviewer-error">
                    <span className="error-icon">⚠️</span>
                    <p>{error}</p>
                </div>
            </div>
        );
    }


    if (selectedStudy) {
        return (
            <div className="reviewer-dashboard">
                <div className="reviewer-header">
                    <div className="header-content">
                        <button className="back-button" onClick={handleBackToStudies}>
                            ← Back to Studies
                        </button>
                        <h1>{selectedStudy.title}</h1>
                        <p className="header-subtitle">Reviewing evaluation quality for this study</p>
                    </div>
                </div>


                <div className="quality-overview-card">
                    <div className="quality-score-large">
                        <div
                            className="quality-ring"
                            style={{ '--quality-color': getQualityColor(selectedStudy.qualityScore) }}
                        >
                            <span className="quality-value">{selectedStudy.qualityScore || '--'}%</span>
                            <span className="quality-label">Quality Score</span>
                        </div>
                    </div>
                    <div className="quality-breakdown">
                        <div className="breakdown-item">
                            <span className="breakdown-value">{selectedStudy.totalEvaluations}</span>
                            <span className="breakdown-label">Total Evaluations</span>
                        </div>
                        <div className="breakdown-item">
                            <span className="breakdown-value">{selectedStudy.participantCount}</span>
                            <span className="breakdown-label">Participants</span>
                        </div>
                        <div className="breakdown-item">
                            <span className="breakdown-value">{selectedStudy.pendingReview}</span>
                            <span className="breakdown-label">Pending Review</span>
                        </div>
                    </div>
                </div>


                <div className="reviewer-actions-section" style={{ marginBottom: '2rem' }}>
                    <div className="dashboard-card" style={{ marginBottom: '1rem' }}>
                        <div className="card-header">
                            <h2>Add Comment</h2>
                        </div>
                        <div className="card-content">
                            {commentMessage && (
                                <div className={`form-message ${commentMessage.type}`} style={{ marginBottom: '1rem' }}>
                                    {commentMessage.text}
                                </div>
                            )}
                            <textarea
                                className="form-input"
                                rows="4"
                                placeholder="Enter your comment about this study..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                style={{ width: '100%', marginBottom: '1rem' }}
                            />
                            <button
                                className="form-button form-button-submit"
                                onClick={handleSubmitComment}
                                disabled={submittingComment || !comment.trim()}
                            >
                                {submittingComment ? 'Submitting...' : 'Submit Comment'}
                            </button>
                        </div>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h2>Export Statistics</h2>
                        </div>
                        <div className="card-content">
                            <p style={{ color: '#ccc', marginBottom: '1rem' }}>
                                Download study statistics and evaluation metrics in various formats.
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    className="form-button form-button-secondary"
                                    onClick={() => handleExportStatistics('json')}
                                    disabled={exporting}
                                >
                                    {exporting ? 'Exporting...' : '📄 JSON'}
                                </button>
                                <button
                                    className="form-button form-button-secondary"
                                    onClick={() => handleExportStatistics('csv')}
                                    disabled={exporting}
                                >
                                    {exporting ? 'Exporting...' : '📊 CSV'}
                                </button>
                                <button
                                    className="form-button form-button-secondary"
                                    onClick={() => handleExportStatistics('zip')}
                                    disabled={exporting}
                                >
                                    {exporting ? 'Exporting...' : '📦 ZIP'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="evaluations-section">
                    <h2>Individual Evaluations</h2>
                    {loadingEvaluations ? (
                        <div className="evaluations-loading">
                            <div className="loading-spinner small"></div>
                            <p>Loading evaluations...</p>
                        </div>
                    ) : evaluations.length === 0 ? (
                        <div className="evaluations-empty">
                            <p>No completed evaluations found for this study.</p>
                        </div>
                    ) : (
                        <div className="evaluations-table">
                            <div className="table-header">
                                <div className="col-participant">Participant</div>
                                <div className="col-task">Task</div>
                                <div className="col-time">Time Spent</div>
                                <div className="col-consistency">Consistency</div>
                                <div className="col-detail">Detail Level</div>
                                <div className="col-status">Status</div>
                            </div>
                            {evaluations.map(evaluation => (
                                <div
                                    key={evaluation.id}
                                    className={`table-row ${evaluation.flagged ? 'flagged' : ''}`}
                                >
                                    <div className="col-participant">
                                        <span className="participant-avatar">
                                            {evaluation.participantName.charAt(0).toUpperCase()}
                                        </span>
                                        {evaluation.participantName}
                                    </div>
                                    <div className="col-task">{evaluation.taskTitle}</div>
                                    <div className="col-time">{evaluation.timeSpent} min</div>
                                    <div className="col-consistency">
                                        <div className="consistency-bar">
                                            <div
                                                className="consistency-fill"
                                                style={{
                                                    width: `${evaluation.consistencyScore}%`,
                                                    backgroundColor: getQualityColor(evaluation.consistencyScore)
                                                }}
                                            ></div>
                                        </div>
                                        <span>{evaluation.consistencyScore}%</span>
                                    </div>
                                    <div className="col-detail">
                                        <span className={`detail-badge ${evaluation.detailLevel.toLowerCase()}`}>
                                            {evaluation.detailLevel}
                                        </span>
                                    </div>
                                    <div className="col-status">
                                        {evaluation.flagged ? (
                                            <span className="status-badge flagged">⚠️ Flagged</span>
                                        ) : (
                                            <span className="status-badge reviewed">✓ OK</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }


    return (
        <div className="reviewer-dashboard">
            <div className="reviewer-header">
                <div className="header-content">
                    <h1>Evaluation Quality Center</h1>
                    <p className="header-subtitle">Analyze and review evaluation quality across studies</p>
                </div>
            </div>


            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon evaluations">📊</div>
                    <div className="stat-content">
                        <span className="stat-value">{overallStats.totalEvaluations}</span>
                        <span className="stat-label">Total Evaluations</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon pending">⏳</div>
                    <div className="stat-content">
                        <span className="stat-value">{overallStats.pendingReview}</span>
                        <span className="stat-label">Pending Review</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon quality">✨</div>
                    <div className="stat-content">
                        <span className="stat-value" style={{ color: getQualityColor(overallStats.avgQuality) }}>
                            {overallStats.avgQuality}%
                        </span>
                        <span className="stat-label">Avg. Quality</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon studies">📚</div>
                    <div className="stat-content">
                        <span className="stat-value">{overallStats.activeStudies}</span>
                        <span className="stat-label">Active Studies</span>
                    </div>
                </div>
            </div>


            <div className="filter-section">
                <div className="filter-row">
                    <div className="filter-group">
                        <label>Search Studies</label>
                        <input
                            type="text"
                            placeholder="Search by study name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="filter-input"
                        />
                    </div>
                    <div className="filter-group">
                        <label>Quality Filter</label>
                        <select
                            value={qualityFilter}
                            onChange={(e) => setQualityFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Quality Levels</option>
                            <option value="high">High Quality (85%+)</option>
                            <option value="medium">Medium Quality (70-84%)</option>
                            <option value="low">Low Quality (&lt;70%)</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Sort By</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="filter-select"
                        >
                            <option value="recent">Most Recent</option>
                            <option value="name">Name</option>
                            <option value="evaluations">Most Evaluations</option>
                        </select>
                    </div>
                </div>
                {filteredAndSortedStudies.length !== studies.length && (
                    <p className="filter-info">
                        Showing {filteredAndSortedStudies.length} of {studies.length} studies
                    </p>
                )}
            </div>


            <div className="studies-section">
                <h2>Studies for Review</h2>
                {studies.length === 0 ? (
                    <div className="welcome-state">
                        <span className="welcome-icon">👋</span>
                        <h3>Welcome to the Evaluation Quality Center!</h3>
                        <p>As a Reviewer, you analyze the quality of evaluations submitted by participants.</p>
                        <div className="welcome-features">
                            <div className="welcome-feature">
                                <span>📊</span>
                                <span>Monitor evaluation consistency and quality scores</span>
                            </div>
                            <div className="welcome-feature">
                                <span>🔍</span>
                                <span>Review individual evaluations for accuracy</span>
                            </div>
                            <div className="welcome-feature">
                                <span>⚠️</span>
                                <span>Flag suspicious or low-quality evaluations</span>
                            </div>
                        </div>
                        <p className="welcome-note">Studies will appear here once researchers create them and participants submit evaluations.</p>
                    </div>
                ) : filteredAndSortedStudies.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🔍</span>
                        <p>No studies found matching your criteria.</p>
                    </div>
                ) : (
                    <div className="reviewer-studies-grid">
                        {filteredAndSortedStudies.map(study => (
                            <div
                                key={study.id}
                                className="reviewer-study-card"
                                onClick={() => handleStudySelect(study)}
                            >
                                <div className="study-card-header">
                                    <h3>{study.title}</h3>
                                    <div
                                        className="quality-badge"
                                        style={{ backgroundColor: getQualityColor(study.qualityScore) }}
                                    >
                                        {getQualityLabel(study.qualityScore)}
                                    </div>
                                </div>
                                <p className="study-description">{study.description}</p>
                                <div className="study-card-stats">
                                    <div className="mini-stat">
                                        <span className="mini-stat-value">{study.totalEvaluations}</span>
                                        <span className="mini-stat-label">Evaluations</span>
                                    </div>
                                    <div className="mini-stat">
                                        <span className="mini-stat-value">{study.participantCount}</span>
                                        <span className="mini-stat-label">Participants</span>
                                    </div>
                                    <div className="mini-stat">
                                        <span className="mini-stat-value">{study.pendingReview}</span>
                                        <span className="mini-stat-label">Pending</span>
                                    </div>
                                </div>
                                {study.qualityScore && (
                                    <div className="quality-bar-container">
                                        <div
                                            className="quality-bar"
                                            style={{
                                                width: `${study.qualityScore}%`,
                                                backgroundColor: getQualityColor(study.qualityScore)
                                            }}
                                        ></div>
                                    </div>
                                )}
                                <div className="study-card-footer">
                                    <span className="view-details">View Evaluations →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReviewerDashboard;

