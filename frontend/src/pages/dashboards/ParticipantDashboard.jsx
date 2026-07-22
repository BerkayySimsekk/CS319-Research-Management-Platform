import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ResearcherDashboard.css';
import './ParticipantDashboard.css';
import '../Forms.css';
import ParticipantStudyCard from '../../components/ParticipantStudyCard';
import { api } from '../../context/AuthContext';

const ParticipantDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [assignedStudies, setAssignedStudies] = useState([]);
    const [completedStudies, setCompletedStudies] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [pendingQuizzes, setPendingQuizzes] = useState([]);
    const [pendingQuestionnaires, setPendingQuestionnaires] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deadlineFilter, setDeadlineFilter] = useState('');
    const [sortBy, setSortBy] = useState('name');

    const fetchTasks = useCallback(async () => {
            try {
                setLoading(true);

                const [invitesRes, quizzesRes, questionnairesRes, enrollmentsRes] = await Promise.all([
                    api.get('/api/studies/invites/my-invites'),
                    api.get('/api/studies/pending-quizzes'),
                    api.get('/api/studies/pending-questionnaires'),
                    api.get('/api/studies/my-enrollments')
                ]);
                setPendingInvites(invitesRes.data || []);
                setPendingQuizzes(quizzesRes.data || []);
                setPendingQuestionnaires(questionnairesRes.data || []);
                const currentEnrollments = enrollmentsRes.data || [];

                const response = await api.get('/api/tasks/my-tasks');
                const tasks = response.data || [];


                const studyMap = new Map();

                tasks.forEach(task => {
                    const studyId = task.studyId;
                    if (!studyMap.has(studyId)) {
                        studyMap.set(studyId, {
                            id: studyId,
                            title: task.studyTitle,
                            tasks: [],
                            completedTasks: 0,
                            totalTasks: 0
                        });
                    }
                    const study = studyMap.get(studyId);
                    study.tasks.push(task);
                    study.totalTasks++;
                    if (task.status === 'COMPLETED') {
                        study.completedTasks++;
                    }
                });


                const allStudies = Array.from(studyMap.values());
                const active = allStudies.filter(s => s.completedTasks < s.totalTasks);
                const completed = allStudies.filter(s => s.completedTasks === s.totalTasks && s.totalTasks > 0);


                const studyDetailsPromises = active.map(study =>
                    api.get(`/api/studies/${study.id}/permissions`).then(() =>
                        Promise.all([
                            api.get('/api/studies/my-studies').then(res =>
                                res.data.find(s => s.id === study.id)
                            ).catch(() => null),
                            api.get(`/api/studies/${study.id}/task-definitions`).then(res =>
                                res.data || []
                            ).catch(() => [])
                        ]).then(([studyDetail, taskDefinitions]) => ({
                            studyDetail,
                            taskDefinitions
                        }))
                    ).catch(() => ({ studyDetail: null, taskDefinitions: [] }))
                );
                const studyDetailsResults = await Promise.all(studyDetailsPromises);


                const studiesWithTasks = new Set(active.map(s => s.id));


                const enrollmentsWithoutTasks = currentEnrollments.filter(e =>
                    !studiesWithTasks.has(e.studyId) &&
                    (e.status === 'PENDING_QUIZ' || e.status === 'QUIZ_FAILED' ||
                     e.status === 'PENDING_QUESTIONNAIRE' || e.status === 'PENDING_QUIZ_AND_QUESTIONNAIRE')
                );


                const enrolledWithoutTasksPromises = enrollmentsWithoutTasks.map(enrollment =>
                    api.get(`/api/studies/${enrollment.studyId}/permissions`).then(() =>
                        Promise.all([
                            api.get('/api/studies/my-studies').then(res =>
                                res.data.find(s => s.id === enrollment.studyId)
                            ).catch(() => null),
                            api.get(`/api/studies/${enrollment.studyId}/task-definitions`).then(res =>
                                res.data || []
                            ).catch(() => [])
                        ]).then(([studyDetail, taskDefinitions]) => ({
                            studyDetail,
                            taskDefinitions
                        }))
                    ).catch(() => ({ studyDetail: null, taskDefinitions: [] }))
                );

                const studyDetailsForEnrolled = await Promise.all(enrolledWithoutTasksPromises);

                const enrolledWithoutTasks = enrollmentsWithoutTasks.map((enrollment, idx) => {
                    const result = studyDetailsForEnrolled[idx];
                    const studyDetail = result?.studyDetail;
                    const taskDefinitions = result?.taskDefinitions || [];

                    const deadline = enrollment.accessWindowEnd
                        ? new Date(enrollment.accessWindowEnd).toISOString().split('T')[0]
                        : (studyDetail?.accessWindowEnd
                            ? new Date(studyDetail.accessWindowEnd).toISOString().split('T')[0]
                            : null);


                    let displayStatus = 'Pending';
                    if (enrollment.status === 'PENDING_QUIZ' || enrollment.status === 'QUIZ_FAILED') {
                        displayStatus = 'Pending Quiz';
                    } else if (enrollment.status === 'PENDING_QUESTIONNAIRE') {
                        displayStatus = 'Pending Questionnaire';
                    } else if (enrollment.status === 'PENDING_QUIZ_AND_QUESTIONNAIRE') {
                        displayStatus = 'Pending Quiz & Questionnaire';
                    }

                    const needsQuiz = enrollment.status === 'PENDING_QUIZ' ||
                                     enrollment.status === 'QUIZ_FAILED' ||
                                     enrollment.status === 'PENDING_QUIZ_AND_QUESTIONNAIRE';
                    const needsQuestionnaire = enrollment.status === 'PENDING_QUESTIONNAIRE' ||
                                              enrollment.status === 'PENDING_QUIZ_AND_QUESTIONNAIRE';

                    return {
                        id: enrollment.studyId,
                        title: enrollment.studyTitle,
                        status: displayStatus,
                        enrolledDate: enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        deadline: deadline || 'N/A',
                        totalTasks: taskDefinitions.length,
                        completedTasks: 0,
                        pendingTasks: taskDefinitions.length,
                        progress: 0,
                        enrollmentStatus: enrollment.status,
                        isPendingQuiz: needsQuiz,
                        isPendingQuestionnaire: needsQuestionnaire
                    };
                });


                const formattedActive = active.map((study, idx) => {
                    const result = studyDetailsResults[idx];
                    const studyDetail = result?.studyDetail;
                    const taskDefinitions = result?.taskDefinitions || [];


                    const enrollment = currentEnrollments.find(e => e.studyId === study.id);
                    const enrollmentStatus = enrollment?.status || 'ENROLLED';

                    const deadline = enrollment?.accessWindowEnd
                        ? new Date(enrollment.accessWindowEnd).toISOString().split('T')[0]
                        : (studyDetail?.accessWindowEnd
                            ? new Date(studyDetail.accessWindowEnd).toISOString().split('T')[0]
                            : null);

                    const needsQuiz = enrollmentStatus === 'PENDING_QUIZ' ||
                                     enrollmentStatus === 'QUIZ_FAILED' ||
                                     enrollmentStatus === 'PENDING_QUIZ_AND_QUESTIONNAIRE';
                    const needsQuestionnaire = enrollmentStatus === 'PENDING_QUESTIONNAIRE' ||
                                              enrollmentStatus === 'PENDING_QUIZ_AND_QUESTIONNAIRE';


                    const totalTaskCount = taskDefinitions.length > 0 ? taskDefinitions.length : study.totalTasks;

                    return {
                        id: study.id,
                        title: study.title,
                        status: study.completedTasks > 0 ? 'In Progress' : 'Upcoming',
                        enrolledDate: study.tasks[0]?.createdAt ? new Date(study.tasks[0].createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        deadline: deadline || 'N/A',
                        totalTasks: totalTaskCount,
                        completedTasks: study.completedTasks,
                        pendingTasks: totalTaskCount - study.completedTasks,
                        progress: totalTaskCount > 0 ? Math.round((study.completedTasks / totalTaskCount) * 100) : 0,
                        enrollmentStatus: enrollmentStatus,
                        isPendingQuiz: needsQuiz,
                        isPendingQuestionnaire: needsQuestionnaire
                    };
                });


                const allActiveStudies = [...formattedActive, ...enrolledWithoutTasks];


                const formattedCompleted = completed.map(study => ({
                    id: study.id,
                    title: study.title,
                    completedDate: study.tasks[0]?.completedAt ? new Date(study.tasks[0].completedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    totalTasks: study.totalTasks,
                    completedTasks: study.completedTasks,
                    evaluationsContributed: study.completedTasks * 2
                }));

                setAssignedStudies(allActiveStudies);
                setCompletedStudies(formattedCompleted);


                const studyDeadlines = new Map();

                studyDetailsResults.forEach((result, idx) => {
                    if (result?.studyDetail && active[idx]) {
                        studyDeadlines.set(active[idx].id, result.studyDetail.accessWindowEnd);
                    }
                });

                currentEnrollments.forEach(enrollment => {
                    if (enrollment.accessWindowEnd && !studyDeadlines.has(enrollment.studyId)) {
                        studyDeadlines.set(enrollment.studyId, enrollment.accessWindowEnd);
                    }
                });

                allActiveStudies.forEach(study => {
                    if (study.deadline && study.deadline !== 'N/A') {
                        const deadlineDate = new Date(study.deadline);
                        if (!isNaN(deadlineDate.getTime()) && !studyDeadlines.has(study.id)) {
                            studyDeadlines.set(study.id, deadlineDate.toISOString());
                        }
                    }
                });


                const currentInvites = invitesRes.data || [];
                const inviteNotifications = currentInvites.map(invite => ({
                    id: `invite-${invite.inviteId}`,
                    message: `You have been invited to join "${invite.studyTitle}"`,
                    type: 'info',
                    studyId: invite.studyId,
                    inviteId: invite.inviteId,
                    token: invite.token,
                    quizId: invite.quizId,
                    quizCompleted: invite.quizCompleted,
                    isInvite: true
                }));


                const studyDeadlineNotifications = allActiveStudies
                    .filter(study => {
                        const deadline = studyDeadlines.get(study.id);
                        if (!deadline) return false;
                        const deadlineDate = new Date(deadline);
                        if (isNaN(deadlineDate.getTime())) return false;
                        const daysUntilDeadline = Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24));

                        return daysUntilDeadline <= 7;
                    })
                    .map(study => {
                        const deadline = studyDeadlines.get(study.id);
                        const deadlineDate = new Date(deadline);
                        const daysUntilDeadline = Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24));

                        let message = '';
                        let type = 'info';

                        if (daysUntilDeadline < 0) {
                            message = `New task assigned for study "${study.title}", deadline passed (${Math.abs(daysUntilDeadline)} day${Math.abs(daysUntilDeadline) !== 1 ? 's' : ''} ago)`;
                            type = 'error';
                        } else if (daysUntilDeadline === 0) {
                            message = `New task assigned for study "${study.title}", deadline is today!`;
                            type = 'error';
                        } else if (daysUntilDeadline <= 3) {
                            message = `New task assigned for study "${study.title}", deadline approaching (${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''} remaining)`;
                            type = 'warning';
                        } else if (daysUntilDeadline <= 7) {
                            message = `New task assigned for study "${study.title}", deadline in ${daysUntilDeadline} days`;
                            type = 'info';
                        }

                        return {
                            id: `study-deadline-${study.id}`,
                            message: message,
                            type: type,
                            studyId: study.id,
                            daysUntilDeadline: daysUntilDeadline,
                            isInvite: false,
                            isStudyDeadline: true
                        };
                    });


                const allNotifications = [...inviteNotifications, ...studyDeadlineNotifications]
                    .sort((a, b) => {

                        if (a.type === 'error' && b.type !== 'error') return -1;
                        if (b.type === 'error' && a.type !== 'error') return 1;
                        if (a.type === 'warning' && b.type !== 'warning') return -1;
                        if (b.type === 'warning' && a.type !== 'warning') return 1;
                        if (a.daysUntilDeadline !== null && b.daysUntilDeadline !== null) {
                            return a.daysUntilDeadline - b.daysUntilDeadline;
                        }
                        return 0;
                    })
                    .slice(0, 15);

                setNotifications(allNotifications);
            } catch (err) {
                console.error('Error fetching tasks:', err);
            } finally {
                setLoading(false);
            }
    }, []);


    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);


    useEffect(() => {
        if (location.state?.refresh) {
            fetchTasks();

            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname, fetchTasks]);


    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {

                fetchTasks();
            }
        };

        const handleFocus = () => {

            fetchTasks();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [fetchTasks]);


    const filteredAndSortedStudies = useMemo(() => {
        let filtered = [...assignedStudies];


        if (searchQuery.trim()) {
            filtered = filtered.filter(study =>
                study.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }


        if (deadlineFilter) {
            filtered = filtered.filter(study => {
                if (!study.deadline || study.deadline === 'N/A') return false;
                return study.deadline === deadlineFilter;
            });
        }


        filtered.sort((a, b) => {
            if (sortBy === 'name') {
                return a.title.localeCompare(b.title);
            } else if (sortBy === 'progress') {
                return b.progress - a.progress;
            }
            return 0;
        });

        return filtered;
    }, [assignedStudies, searchQuery, deadlineFilter, sortBy]);


    if (loading) {
        return (
            <div className="researcher-dashboard">
                <div className="dashboard-header">
                    <h1>Participant Dashboard</h1>
                    <p className="dashboard-subtitle">Track your assignments and study progress</p>
                </div>
                <div className="dashboard-card full-width">
                    <div className="card-content">
                        <p style={{textAlign: 'center', color: '#999', padding: '2rem'}}>
                            Loading your dashboard...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="researcher-dashboard">
            <div className="dashboard-header">
                <h1>Participant Dashboard</h1>
                <p className="dashboard-subtitle">Track your assignments and study progress</p>
            </div>

            <div className="dashboard-grid">

                {pendingQuizzes.length > 0 && (
                    <div className="dashboard-card full-width">
                        <div className="card-header">
                            <h2>Pending Quizzes</h2>
                        </div>
                        <div className="card-content participant-studies-section">
                            <div className="studies-grid">
                                {pendingQuizzes.map(quiz => (
                                    <div key={quiz.enrollmentId} className="participant-study-card" style={{
                                        border: '2px solid #ffc107'
                                    }}>
                                        <h2 className="participant-study-card-title">{quiz.studyTitle}</h2>
                                        <div className="participant-study-card-content">
                                            <div className="participant-study-card-left">
                                                <div style={{
                                                    width: '120px',
                                                    height: '120px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: '#3a3a3a',
                                                    borderRadius: '50%',
                                                    fontSize: '2.5rem',
                                                    margin: '0 auto',
                                                    border: '2px solid #ffc107'
                                                }}>
                                                    📝
                                                </div>
                                            </div>
                                            <div className="participant-study-card-right">
                                                <div className="participant-study-info">
                                                    <div className="participant-study-stat">
                                                        <span className="participant-study-stat-label">Quiz</span>
                                                        <span className="participant-study-stat-value">{quiz.quizTitle}</span>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    padding: '0.75rem',
                                                    backgroundColor: '#3a2a00',
                                                    borderRadius: '4px',
                                                    marginBottom: '0.75rem',
                                                    fontSize: '0.9rem',
                                                    color: '#ffc107',
                                                    textAlign: 'center',
                                                    fontWeight: '500',
                                                    border: '1px solid #ffc107'
                                                }}>
                                                    ⚠️ Quiz must be completed to start evaluating
                                                </div>
                                                <button
                                                    className="participant-evaluate-button"
                                                    onClick={() => navigate(`/participant-dashboard/quiz/${quiz.studyId}`)}
                                                >
                                                    Take Quiz
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}


                {pendingQuestionnaires.length > 0 && (
                    <div className="dashboard-card full-width">
                        <div className="card-header">
                            <h2>Pending Questionnaires</h2>
                        </div>
                        <div className="card-content participant-studies-section">
                            <div className="studies-grid">
                                {pendingQuestionnaires.map(questionnaire => (
                                    <div key={questionnaire.enrollmentId} className="participant-study-card" style={{
                                        border: '2px solid #9c27b0'
                                    }}>
                                        <h2 className="participant-study-card-title">{questionnaire.studyTitle}</h2>
                                        <div className="participant-study-card-content">
                                            <div className="participant-study-card-left">
                                                <div style={{
                                                    width: '120px',
                                                    height: '120px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: '#3a3a3a',
                                                    borderRadius: '50%',
                                                    fontSize: '2.5rem',
                                                    margin: '0 auto',
                                                    border: '2px solid #9c27b0'
                                                }}>
                                                    📋
                                                </div>
                                            </div>
                                            <div className="participant-study-card-right">
                                                <div className="participant-study-info">
                                                    <div className="participant-study-stat">
                                                        <span className="participant-study-stat-label">Questionnaire</span>
                                                        <span className="participant-study-stat-value">{questionnaire.questionnaireTitle}</span>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    padding: '0.75rem',
                                                    backgroundColor: '#2a1a2a',
                                                    borderRadius: '4px',
                                                    marginBottom: '0.75rem',
                                                    fontSize: '0.9rem',
                                                    color: '#9c27b0',
                                                    textAlign: 'center',
                                                    fontWeight: '500',
                                                    border: '1px solid #9c27b0'
                                                }}>
                                                    📋 Complete the questionnaire to continue
                                                </div>
                                                <button
                                                    className="participant-evaluate-button"
                                                    style={{ backgroundColor: '#9c27b0' }}
                                                    onClick={() => navigate(`/participant-dashboard/questionnaire/${questionnaire.studyId}`)}
                                                >
                                                    Take Questionnaire
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}


                <div className="dashboard-card full-width">
                    <div className="card-header">
                        <h2>Deadlines & Notifications</h2>
                    </div>
                    <div className="card-content participant-notifications-section">
                        {notifications.length === 0 ? (
                            <p className="empty-state">No new notifications</p>
                        ) : (
                            <div className="notifications-list">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`notification-item ${notification.type}`}
                                        style={{
                                            cursor: (notification.isInvite || notification.isStudyDeadline) ? 'pointer' : 'default',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                        onClick={() => {
                                            if (notification.isInvite) {

                                                const invite = pendingInvites.find(i => i.inviteId === notification.inviteId);
                                                if (invite) {
                                                    api.post(`/api/studies/invites/${invite.token}/accept`)
                                                        .then(() => {
                                                            alert('Invite accepted! Please complete the quiz to start evaluating.');
                                                            window.location.reload();
                                                        })
                                                        .catch(err => alert(err.response?.data?.message || 'Could not accept invite.'));
                                                }
                                            } else if (notification.isStudyDeadline && notification.studyId) {

                                                const studyCard = document.querySelector(`[data-study-id="${notification.studyId}"]`);
                                                if (studyCard) {
                                                    studyCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

                                                    studyCard.style.transition = 'box-shadow 0.3s';
                                                    studyCard.style.boxShadow = '0 0 20px rgba(255, 193, 7, 0.5)';
                                                    setTimeout(() => {
                                                        studyCard.style.boxShadow = '';
                                                    }, 2000);
                                                }
                                            }
                                        }}
                                    >
                                        <p className="notification-message">{notification.message}</p>
                                        {notification.isInvite && (
                                            <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: '1rem' }}>
                                                Click to accept →
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>


                <div className="dashboard-card full-width">
                    <div className="card-header">
                        <h2>Assigned Studies</h2>
                    </div>
                    <div className="card-content participant-studies-section">

                        {assignedStudies.length > 0 && (
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
                                {filteredAndSortedStudies.length !== assignedStudies.length && (
                                    <p style={{marginTop: '1rem', color: '#aaa', fontSize: '0.9rem'}}>
                                        Showing {filteredAndSortedStudies.length} of {assignedStudies.length} studies
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="studies-grid">
                            {assignedStudies.length === 0 ? (
                                <p className="empty-state" style={{textAlign: 'center', padding: '2rem', color: '#999'}}>
                                    No assigned studies yet. You will be notified when new studies are assigned to you.
                                </p>
                            ) : filteredAndSortedStudies.length === 0 ? (
                                <p className="empty-state" style={{textAlign: 'center', padding: '2rem', color: '#999'}}>
                                    No studies match your filters. Try adjusting your search criteria.
                                </p>
                            ) : (
                                filteredAndSortedStudies.map(study => (
                                    <ParticipantStudyCard
                                        key={study.id}
                                        study={study}
                                        enrollmentStatus={study.enrollmentStatus}
                                        isPendingQuiz={study.isPendingQuiz}
                                        onEvaluate={(studyId) => {

                                            const study = filteredAndSortedStudies.find(s => s.id === studyId);
                                            if (study && study.pendingTasks > 0 && !study.isPendingQuiz) {

                                                api.get('/api/tasks/my-tasks')
                                                    .then(response => {
                                                        const tasks = response.data || [];
                                                        const pendingTask = tasks.find(t =>
                                                            t.studyId === studyId && t.status !== 'COMPLETED'
                                                        );
                                                        if (pendingTask) {
                                                            navigate(`/participant-dashboard/task/${pendingTask.taskId}`);
                                                        }
                                                    })
                                                    .catch(err => {
                                                        console.error('Error fetching tasks:', err);
                                                    });
                                            }
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>


                <div className="dashboard-card full-width">
                    <div className="card-header">
                        <h2>Study History</h2>
                    </div>
                    <div className="card-content participant-history-section">
                        {completedStudies.length === 0 ? (
                            <p className="empty-state">No completed studies yet</p>
                        ) : (
                            <div className="participant-history-grid">
                                {completedStudies.map(study => (
                                    <div key={study.id} className="participant-history-card">
                                        <h3 className="history-card-title">{study.title}</h3>
                                        <div className="history-card-date">
                                            Completed on {study.completedDate}
                                        </div>
                                        <div className="history-card-stats">
                                            <div className="history-stat-item">
                                                <span className="history-stat-label">Tasks</span>
                                                <span className="history-stat-value">{study.completedTasks}/{study.totalTasks}</span>
                                            </div>
                                            <div className="history-stat-item">
                                                <span className="history-stat-label">Evaluations</span>
                                                <span className="history-stat-value">{study.evaluationsContributed}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParticipantDashboard;
