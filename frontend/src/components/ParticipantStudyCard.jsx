import React from 'react';
import '../pages/dashboards/ResearcherDashboard.css';
import './ParticipantStudyCard.css';


const getCompletionColor = (percentage) => {
    if (percentage >= 70) {
        return '#4CAF50';
    } else if (percentage >= 40) {
        return '#FF9800';
    } else {
        return '#f44336';
    }
};


const PieChart = ({ percentage }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const chartColor = getCompletionColor(percentage);

    return (
        <div className="pie-chart-container">
            <svg width="120" height="120" className="pie-chart">
                <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#444"
                    strokeWidth="12"
                />
                <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={chartColor}
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                />
            </svg>
            <div className="pie-chart-label">
                <span className="pie-chart-percentage" style={{ color: chartColor }}>
                    {percentage}%
                </span>
            </div>
        </div>
    );
};

import { useNavigate } from 'react-router-dom';

const ParticipantStudyCard = ({ study, enrollmentStatus, isPendingQuiz, onEvaluate }) => {
    const navigate = useNavigate();
    const completionPercentage = study.totalTasks > 0
        ? Math.round((study.completedTasks / study.totalTasks) * 100)
        : 0;

    const hasStarted = study.completedTasks > 0;
    const buttonText = hasStarted ? 'Continue Evaluating' : 'Start Evaluating';


    const isDisabled = isPendingQuiz || enrollmentStatus === 'PENDING_QUIZ' || enrollmentStatus === 'QUIZ_FAILED';
    const statusMessage = isPendingQuiz
        ? (enrollmentStatus === 'QUIZ_FAILED'
            ? '⚠️ Quiz Failed - Please retake the quiz to continue'
            : '⚠️ Quiz must be completed before you can start evaluating')
        : null;

    const handleEvaluate = () => {
        if (isDisabled) {
            return;
        }
        if (onEvaluate) {
            onEvaluate(study.id);
        } else {

            const mockTaskId = `T${study.id}01`;
            navigate(`/participant-dashboard/task/${mockTaskId}`);
        }
    };

    return (
        <div className="participant-study-card" data-study-id={study.id}>
            <h2 className="participant-study-card-title">{study.title}</h2>
            <div className="participant-study-card-content">
                <div className="participant-study-card-left">
                    <PieChart percentage={completionPercentage} />
                </div>
                <div className="participant-study-card-right">
                    <div className="participant-study-info">
                        <div className="participant-study-stat">
                            <span className="participant-study-stat-label">Tasks</span>
                            <span className="participant-study-stat-value">
                                {study.completedTasks}/{study.totalTasks}
                            </span>
                        </div>
                        <div className="participant-study-stat">
                            <span className="participant-study-stat-label">Due Date</span>
                            <span className="participant-study-stat-value">{study.deadline || 'N/A'}</span>
                        </div>
                    </div>
                    {statusMessage && (
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
                            {statusMessage}
                            {enrollmentStatus === 'QUIZ_FAILED' && (
                                <div style={{ marginTop: '0.75rem' }}>
                                    <button
                                        onClick={() => navigate(`/participant-dashboard/quiz/${study.id}`)}
                                        style={{
                                            backgroundColor: '#ffc107',
                                            color: '#1a1a1a',
                                            border: 'none',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '0.9rem',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#ffb300'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = '#ffc107'}
                                    >
                                        Retake Quiz
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <button
                        className="participant-evaluate-button"
                        onClick={handleEvaluate}
                        disabled={isDisabled}
                        style={{
                            opacity: isDisabled ? 0.5 : 1,
                            cursor: isDisabled ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ParticipantStudyCard;

