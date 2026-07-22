
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';
import './dashboards/ResearcherDashboard.css';
import './Forms.css';

const Participants = () => {
    const navigate = useNavigate();
    const [participants, setParticipants] = useState([]);
    const [filteredParticipants, setFilteredParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedParticipants, setSelectedParticipants] = useState(new Set());
    const [studies, setStudies] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [questionnaires, setQuestionnaires] = useState([]);


    const [selectedQuizId, setSelectedQuizId] = useState('');
    const [selectedQuizQuestions, setSelectedQuizQuestions] = useState([]);
    const [quizMinScore, setQuizMinScore] = useState('');
    const [questionAnswerFilters, setQuestionAnswerFilters] = useState({});

    const [questionTitles, setQuestionTitles] = useState({});

    const [filters, setFilters] = useState({
        minQuizScores: {},
        questionnaireAnswers: {},
        minYearsOfExperience: '',
        skills: ''
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [filters, participants]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError(null);

            const participantsResponse = await api.get('/api/participants');
            setParticipants(participantsResponse.data);
            setFilteredParticipants(participantsResponse.data);


            const studiesResponse = await api.get('/api/studies/my-studies');
            setStudies(studiesResponse.data);


            const quizzesResponse = await api.get('/api/quizzes/my-quizzes');
            setQuizzes(quizzesResponse.data);


            const competencyQuizzes = quizzesResponse.data.filter(q => q.type === 'COMPETENCY_QUIZ' || !q.type);
            const backgroundSurveys = quizzesResponse.data.filter(q => q.type === 'BACKGROUND_SURVEY');
            setQuestionnaires(backgroundSurveys);


            const titlesMap = {};
            for (const survey of backgroundSurveys) {
                try {
                    const detailsRes = await api.get(`/api/quizzes/${survey.id}/details`);
                    if (detailsRes.data && detailsRes.data.questions) {
                        detailsRes.data.questions.forEach(q => {

                            titlesMap[q.id] = q.questionText;
                        });
                    }
                } catch (e) {
                    console.warn(`Could not fetch details for questionnaire ${survey.id}`, e);
                }
            }
            setQuestionTitles(titlesMap);

        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load participants.');
        } finally {
            setLoading(false);
        }
    };


    const fetchQuizQuestions = async (quizId) => {
        if (!quizId) {
            setSelectedQuizQuestions([]);
            return;
        }
        try {
            const response = await api.get(`/api/quizzes/${quizId}/details`);
            const quizDetails = response.data;



            if (quizDetails && quizDetails.questions) {
                setSelectedQuizQuestions(quizDetails.questions.map(q => ({
                    id: q.id,
                    questionText: q.questionText
                })));
            } else {
                setSelectedQuizQuestions([]);
            }
        } catch (err) {
            console.error('Error fetching quiz questions:', err);
            setSelectedQuizQuestions([]);
        }
    };


    const handleQuizSelectionChange = (quizId) => {
        setSelectedQuizId(quizId);
        setQuizMinScore('');
        setQuestionAnswerFilters({});

        if (quizId) {
            const quiz = quizzes.find(q => q.id === parseInt(quizId));
            if (quiz && quiz.type === 'BACKGROUND_SURVEY') {
                fetchQuizQuestions(quizId);
            } else {
                setSelectedQuizQuestions([]);
            }
        } else {
            setSelectedQuizQuestions([]);
        }
    };


    useEffect(() => {
        if (selectedQuizId) {
            const quiz = quizzes.find(q => q.id === parseInt(selectedQuizId));
            if (quiz) {
                if (quiz.type === 'COMPETENCY_QUIZ' || !quiz.type) {

                    if (quizMinScore) {
                        setFilters(prev => ({
                            ...prev,
                            minQuizScores: { [selectedQuizId]: quizMinScore },
                            questionnaireAnswers: {}
                        }));
                    } else {
                        setFilters(prev => ({
                            ...prev,
                            minQuizScores: {},
                            questionnaireAnswers: {}
                        }));
                    }
                } else {

                    const validAnswers = Object.fromEntries(
                        Object.entries(questionAnswerFilters).filter(([_, v]) => v && v.trim())
                    );
                    setFilters(prev => ({
                        ...prev,
                        minQuizScores: {},
                        questionnaireAnswers: validAnswers
                    }));
                }
            }
        } else {

            setFilters(prev => ({
                ...prev,
                minQuizScores: {},
                questionnaireAnswers: {}
            }));
        }
    }, [selectedQuizId, quizMinScore, questionAnswerFilters, quizzes]);

    const applyFilters = async () => {
        try {

            const filterRequest = {
                minQuizScores: Object.keys(filters.minQuizScores).length > 0
                    ? Object.fromEntries(
                        Object.entries(filters.minQuizScores)
                            .filter(([_, value]) => value !== '' && value != null)
                            .map(([key, value]) => [parseInt(key), parseFloat(value)])
                    )
                    : null,
                questionnaireAnswers: Object.keys(filters.questionnaireAnswers).length > 0
                    ? Object.fromEntries(
                        Object.entries(filters.questionnaireAnswers)
                            .filter(([_, value]) => value !== '' && value != null)
                            .map(([key, value]) => [parseInt(key), value])
                    )
                    : null,
                experienceLevel: filters.experienceLevel || null,
                minYearsOfExperience: filters.minYearsOfExperience
                    ? parseInt(filters.minYearsOfExperience)
                    : null,
                skills: filters.skills || null
            };

            Object.keys(filterRequest).forEach(key => {
                if (filterRequest[key] === null ||
                    (typeof filterRequest[key] === 'object' && Object.keys(filterRequest[key]).length === 0)) {
                    delete filterRequest[key];
                }
            });


            if (Object.keys(filterRequest).length === 0) {
                setFilteredParticipants(participants);
                return;
            }


            const response = await api.post('/api/participants/filter', filterRequest);
            setFilteredParticipants(response.data);
        } catch (err) {
            console.error('Error filtering participants:', err);
            setError(err.response?.data?.message || err.message || 'Failed to filter participants.');
        }
    };

    const handleFilterChange = (filterType, key, value) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            if (filterType === 'minQuizScores') {
                newFilters.minQuizScores = { ...prev.minQuizScores, [key]: value };
            } else if (filterType === 'questionnaireAnswers') {
                newFilters.questionnaireAnswers = { ...prev.questionnaireAnswers, [key]: value };
            } else {
                newFilters[filterType] = value;
            }
            return newFilters;
        });
    };

    const removeFilter = (filterType, key) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            if (filterType === 'minQuizScores') {
                const { [key]: removed, ...rest } = prev.minQuizScores;
                newFilters.minQuizScores = rest;
            } else if (filterType === 'questionnaireAnswers') {
                const { [key]: removed, ...rest } = prev.questionnaireAnswers;
                newFilters.questionnaireAnswers = rest;
            }
            return newFilters;
        });
    };

    const toggleParticipantSelection = (participantId) => {
        setSelectedParticipants(prev => {
            const newSet = new Set(prev);
            if (newSet.has(participantId)) {
                newSet.delete(participantId);
            } else {
                newSet.add(participantId);
            }
            return newSet;
        });
    };

    const selectAll = () => {
        setSelectedParticipants(new Set(filteredParticipants.map(p => p.id)));
    };

    const deselectAll = () => {
        setSelectedParticipants(new Set());
    };

    const handleInviteSelected = async (studyId) => {
        if (selectedParticipants.size === 0) {
            alert('Please select at least one participant.');
            return;
        }

        if (!studyId) {
            alert('Please select a study.');
            return;
        }

        try {

            const selectedEmails = filteredParticipants
                .filter(p => selectedParticipants.has(p.id))
                .map(p => p.email)
                .filter(email => email);


            const failedInvites = [];
            for (const email of selectedEmails) {
                try {
                    await api.post(`/api/studies/${studyId}/invites`, {
                        email: email,
                        expiresInHours: 72,
                        shareableLink: false
                    });
                } catch (err) {
                    console.error(`Failed to invite ${email}:`, err);

                    const errorMessage = err.response?.data?.message
                        || err.response?.data?.error
                        || err.message
                        || 'Unknown error';
                    failedInvites.push({ email, reason: errorMessage });
                }
            }

            if (failedInvites.length > 0) {
                const failedList = failedInvites.map(f => `  • ${f.email}: ${f.reason}`).join('\n');
                alert(`Some invites failed:\n${failedList}\n\nPlease check eligibility requirements for these participants.`);
            } else {
                alert(`Invites sent to ${selectedEmails.length} participant(s).`);
            }
            setSelectedParticipants(new Set());
        } catch (err) {
            console.error('Error sending invites:', err);
            alert('Failed to send invites. Please try again.');
        }
    };

    return (
        <div className="researcher-dashboard">
            <div className="dashboard-header">
                <h1>Participants</h1>
                <p className="dashboard-subtitle">Filter and invite participants to your studies</p>
            </div>

            {loading ? (
                <div className="dashboard-card full-width">
                    <div className="card-content">
                        <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                            Loading participants...
                        </p>
                    </div>
                </div>
            ) : error ? (
                <div className="dashboard-card full-width">
                    <div className="card-content">
                        <p style={{ textAlign: 'center', color: '#f44336', padding: '2rem' }}>
                            {error}
                        </p>
                    </div>
                </div>
            ) : (
                <>

                    <div className="dashboard-card full-width" style={{ marginBottom: '2rem' }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>🔍 Filter Participants</h2>
                            <button
                                className="form-button-secondary"
                                onClick={() => {
                                    setFilters({
                                        minQuizScores: {},
                                        questionnaireAnswers: {},
                                        experienceLevel: '',
                                        minYearsOfExperience: '',
                                        skills: ''
                                    });
                                    setSelectedQuizId('');
                                    setQuizMinScore('');
                                    setQuestionAnswerFilters({});
                                    setSelectedQuizQuestions([]);
                                }}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                            >
                                Clear All Filters
                            </button>
                        </div>
                        <div className="card-content">

                            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
                                <h3 style={{ color: '#4caf50', marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>
                                    👤 Profile-Based Filters
                                </h3>
                                <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                    Filter by global profile data captured during registration
                                </p>
                                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                                    <div>
                                        <label className="form-label">Min Years of Experience</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="e.g., 5"
                                            min="0"
                                            value={filters.minYearsOfExperience}
                                            onChange={(e) => handleFilterChange('minYearsOfExperience', null, e.target.value)}
                                        />
                                    </div>


                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Skills (exact match, any of listed)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g., Java, Python, React (comma-separated, must match exactly)"
                                            value={filters.skills}
                                            onChange={(e) => handleFilterChange('skills', null, e.target.value)}
                                        />
                                        <small style={{ color: '#888', marginTop: '0.25rem', display: 'block' }}>
                                            Type full skill names (e.g., "Java" not "j"). Matches any of the listed skills.
                                        </small>
                                    </div>
                                </div>
                            </div>


                            <div style={{ padding: '1rem', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
                                <h3 style={{ color: '#2196f3', marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>
                                    📊 Study-Based Filters
                                </h3>
                                <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                    Select a quiz or questionnaire to filter participants by their performance
                                </p>


                                <div style={{ marginBottom: '1rem' }}>
                                    <label className="form-label">Select Quiz / Questionnaire</label>
                                    <select
                                        className="form-select"
                                        value={selectedQuizId}
                                        onChange={(e) => handleQuizSelectionChange(e.target.value)}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">-- Select to filter --</option>
                                        <optgroup label="Technical Quizzes (Competency)">
                                            {quizzes.filter(q => q.type === 'COMPETENCY_QUIZ' || !q.type).map(quiz => (
                                                <option key={quiz.id} value={quiz.id}>
                                                    {quiz.title}
                                                </option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Background Surveys">
                                            {quizzes.filter(q => q.type === 'BACKGROUND_SURVEY').map(quiz => (
                                                <option key={quiz.id} value={quiz.id}>
                                                    {quiz.title}
                                                </option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>


                                {selectedQuizId && (() => {
                                    const selectedQuiz = quizzes.find(q => q.id === parseInt(selectedQuizId));
                                    if (!selectedQuiz) return null;

                                    const isCompetencyQuiz = selectedQuiz.type === 'COMPETENCY_QUIZ' || !selectedQuiz.type;

                                    if (isCompetencyQuiz) {
                                        return (
                                            <div style={{ padding: '1rem', backgroundColor: '#252525', borderRadius: '6px' }}>
                                                <label className="form-label" style={{ color: '#4caf50' }}>
                                                    🎯 Minimum Score for "{selectedQuiz.title}"
                                                </label>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        placeholder="Minimum accuracy %"
                                                        min="0"
                                                        max="100"
                                                        value={quizMinScore}
                                                        onChange={(e) => setQuizMinScore(e.target.value)}
                                                        style={{ flex: 1 }}
                                                    />
                                                    <span style={{ color: '#aaa' }}>%</span>
                                                </div>
                                                <small style={{ color: '#888', marginTop: '0.5rem', display: 'block' }}>
                                                    Show only participants who scored at least this percentage
                                                </small>
                                            </div>
                                        );
                                    } else {

                                        return (
                                            <div style={{ padding: '1rem', backgroundColor: '#252525', borderRadius: '6px' }}>
                                                <label className="form-label" style={{ color: '#ff9800' }}>
                                                    📝 Filter by Answers in "{selectedQuiz.title}"
                                                </label>
                                                <small style={{ color: '#888', marginBottom: '1rem', display: 'block' }}>
                                                    Enter text to filter participants whose answers contain the specified words
                                                </small>
                                                {selectedQuizQuestions.length === 0 ? (
                                                    <p style={{ color: '#666', fontSize: '0.85rem', margin: '0.5rem 0' }}>
                                                        No questions in this questionnaire
                                                    </p>
                                                ) : (
                                                    selectedQuizQuestions.map(question => (
                                                        <div key={question.id} style={{ marginBottom: '0.75rem' }}>
                                                            <label style={{ color: '#bbb', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
                                                                {question.questionText}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                placeholder="Answer contains..."
                                                                value={questionAnswerFilters[question.id] || ''}
                                                                onChange={(e) => setQuestionAnswerFilters(prev => ({
                                                                    ...prev,
                                                                    [question.id]: e.target.value
                                                                }))}
                                                            />
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        );
                                    }
                                })()}

                                {!selectedQuizId && (
                                    <div style={{ padding: '1rem', backgroundColor: '#252525', borderRadius: '6px', textAlign: 'center' }}>
                                        <p style={{ color: '#666', margin: 0 }}>
                                            Select a quiz above to enable score/answer filtering
                                        </p>
                                    </div>
                                )}
                            </div>


                            {(filters.skills || filters.minYearsOfExperience || filters.experienceLevel ||
                              selectedQuizId || quizMinScore ||
                              Object.keys(questionAnswerFilters).some(k => questionAnswerFilters[k])) && (
                                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#2a2a2a', borderRadius: '6px' }}>
                                    <span style={{ color: '#aaa', fontSize: '0.85rem', fontWeight: '500' }}>Active filters: </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {filters.skills && (
                                            <span style={{ backgroundColor: '#2a3a2a', color: '#4caf50', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                                Skills: {filters.skills}
                                            </span>
                                        )}
                                        {filters.minYearsOfExperience && (
                                            <span style={{ backgroundColor: '#2a2a3a', color: '#64b5f6', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                                Experience ≥ {filters.minYearsOfExperience} yrs
                                            </span>
                                        )}
                                        {filters.experienceLevel && (
                                            <span style={{ backgroundColor: '#3a2a2a', color: '#ff9800', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                                Level: {filters.experienceLevel}
                                            </span>
                                        )}
                                        {selectedQuizId && quizMinScore && (() => {
                                            const quiz = quizzes.find(q => q.id === parseInt(selectedQuizId));
                                            return quiz && (
                                                <span style={{ backgroundColor: '#2a3a3a', color: '#26c6da', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                                    {quiz.title} ≥ {quizMinScore}%
                                                </span>
                                            );
                                        })()}
                                        {Object.entries(questionAnswerFilters).filter(([_, v]) => v).map(([qId, answer]) => (
                                            <span key={qId} style={{ backgroundColor: '#3a3a2a', color: '#ffeb3b', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                                Q{qId}: "{answer}"
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>


                    <div className="dashboard-card full-width">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>Participants ({filteredParticipants.length})</h2>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="form-button-secondary"
                                    onClick={selectAll}
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                >
                                    Select All
                                </button>
                                <button
                                    className="form-button-secondary"
                                    onClick={deselectAll}
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                >
                                    Deselect All
                                </button>
                            </div>
                        </div>
                        <div className="card-content">
                            {filteredParticipants.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                                    No participants match the filter criteria.
                                </p>
                            ) : (
                                <>
                                    <table className="artifact-list-table" style={{ borderCollapse: 'separate', borderSpacing: '0 12px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px', padding: '1rem 0.75rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedParticipants.size === filteredParticipants.length && filteredParticipants.length > 0}
                                                        onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                                                    />
                                                </th>
                                                <th style={{ padding: '1rem 0.75rem' }}>Name</th>
                                                <th style={{ padding: '1rem 0.75rem' }}>Email</th>
                                                <th style={{ padding: '1rem 0.75rem' }}>Skills</th>
                                                <th style={{ padding: '1rem 0.75rem' }}>Years of Experience</th>
                                                <th style={{ padding: '1rem 0.75rem' }}>Quiz Scores</th>
                                                <th style={{ padding: '1rem 0.75rem' }}>Questionnaire Answers</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredParticipants.map(participant => (
                                                <tr key={participant.id} style={{ backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
                                                    <td style={{ padding: '1.25rem 0.75rem', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedParticipants.has(participant.id)}
                                                            onChange={() => toggleParticipantSelection(participant.id)}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '1.25rem 0.75rem', fontWeight: '500' }}>{participant.name}</td>
                                                    <td style={{ padding: '1.25rem 0.75rem', color: '#aaa' }}>{participant.email}</td>
                                                    <td style={{ padding: '1.25rem 0.75rem' }}>
                                                        {participant.skills ? (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                                {participant.skills.split(',').map((skill, idx) => (
                                                                    <span key={idx} style={{
                                                                        backgroundColor: '#2a3a2a',
                                                                        color: '#4caf50',
                                                                        padding: '0.2rem 0.5rem',
                                                                        borderRadius: '4px',
                                                                        fontSize: '0.8rem'
                                                                    }}>
                                                                        {skill.trim()}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : <span style={{ color: '#666' }}>N/A</span>}
                                                    </td>
                                                    <td style={{ padding: '1.25rem 0.75rem', textAlign: 'center' }}>
                                                        {participant.yearsOfExperience != null ? (
                                                            <span style={{
                                                                backgroundColor: '#2a2a3a',
                                                                color: '#64b5f6',
                                                                padding: '0.25rem 0.75rem',
                                                                borderRadius: '12px',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '500'
                                                            }}>
                                                                {participant.yearsOfExperience} yrs
                                                            </span>
                                                        ) : <span style={{ color: '#666' }}>N/A</span>}
                                                    </td>
                                                    <td style={{ padding: '1.25rem 0.75rem' }}>
                                                        {Object.keys(participant.quizScores || {}).length > 0 ? (
                                                            <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.85rem', listStyle: 'none' }}>
                                                                {Object.entries(participant.quizScores).map(([quizId, score]) => {
                                                                    const quiz = quizzes.find(q => q.id === parseInt(quizId));
                                                                    const scoreColor = score >= 80 ? '#4caf50' : score >= 60 ? '#ff9800' : '#f44336';
                                                                    return (
                                                                        <li key={quizId} style={{ marginBottom: '0.25rem' }}>
                                                                            <span style={{ color: '#aaa' }}>{quiz ? quiz.title : `Quiz ${quizId}`}:</span>{' '}
                                                                            <span style={{ color: scoreColor, fontWeight: '500' }}>{score.toFixed(1)}%</span>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        ) : <span style={{ color: '#666' }}>No scores</span>}
                                                    </td>
                                                    <td style={{ padding: '1.25rem 0.75rem', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>
                                                        {Object.keys(participant.questionnaireAnswers || {}).length > 0 ? (
                                                            <ul style={{ margin: 0, paddingLeft: '0', fontSize: '0.85rem', listStyle: 'none' }}>
                                                                {Object.entries(participant.questionnaireAnswers).slice(0, 3).map(([qId, answer]) => (
                                                                    <li key={qId} style={{ marginBottom: '0.5rem', color: '#bbb' }}>
                                                                        <div style={{ color: '#ff9800', fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                                                                            {questionTitles[qId] || `Question ${qId}`}
                                                                        </div>
                                                                        <div style={{ color: '#ddd' }}>
                                                                            {answer.length > 40 ? answer.substring(0, 40) + '...' : answer}
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                                {Object.keys(participant.questionnaireAnswers).length > 3 && (
                                                                    <li style={{ color: '#666', fontSize: '0.8rem' }}>
                                                                        +{Object.keys(participant.questionnaireAnswers).length - 3} more
                                                                    </li>
                                                                )}
                                                            </ul>
                                                        ) : <span style={{ color: '#666' }}>No answers</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>


                                    {selectedParticipants.size > 0 && (
                                        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
                                            <label className="form-label">Invite Selected ({selectedParticipants.size}) to Study:</label>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <select
                                                    className="form-select"
                                                    style={{ flex: 1 }}
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            handleInviteSelected(parseInt(e.target.value));
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                >
                                                    <option value="">Select a study...</option>
                                                    {studies.map(study => (
                                                        <option key={study.id} value={study.id}>
                                                            {study.title}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Participants;

