

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../context/AuthContext';
import './Forms.css';
import './QuizEnhanced.css';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: -20 }
};

const questionVariants = {
    initial: { opacity: 0, x: 50, scale: 0.95 },
    animate: (i) => ({ opacity: 1, x: 0, scale: 1, transition: { delay: i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
    exit: { opacity: 0, x: -50 }
};

const TakeQuestionnaire = () => {
    const { studyId } = useParams();
    const [questionnaire, setQuestionnaire] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const fetchQuestionnaire = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/api/studies/${studyId}/questionnaire`);
                setQuestionnaire(response.data);
            } catch (err) {
                setError(err.response?.data?.message || err.message || "Could not load questionnaire.");
            } finally {
                setLoading(false);
            }
        };
        fetchQuestionnaire();
    }, [studyId]);

    const handleAnswerChange = (questionId, questionType, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: { selectedOptionId: questionType === 'MULTIPLE_CHOICE' ? value : null, answerText: questionType === 'SHORT_ANSWER' ? value : null }
        }));
    };

    const handleSubmit = async () => {
        if (submitting) return;
        if (!window.confirm("Are you sure you want to submit this questionnaire?")) return;
        setSubmitting(true);
        setError(null);
        const submissionData = { answers: Object.keys(answers).map(qId => ({ questionId: qId, selectedOptionId: answers[qId].selectedOptionId, answerText: answers[qId].answerText })) };
        try {
            const response = await api.post(`/api/studies/${studyId}/questionnaire/submit`, submissionData);
            setResult(response.data);
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Could not submit questionnaire.");
            setSubmitting(false);
        }
    };

    const getProgress = () => questionnaire ? (Object.keys(answers).length / questionnaire.questions.length) * 100 : 0;

    if (loading) {
        return (
            <div className="questionnaire-page-wrapper">
                <motion.div className="form-container-enhanced" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '4rem' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📋</motion.div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Loading Questionnaire...</h2>
                    <p style={{ color: '#888' }}>Please wait while we prepare your survey</p>
                </motion.div>
            </div>
        );
    }

    if (error && !result) {
        return (
            <div className="questionnaire-page-wrapper">
                <motion.div className="form-container-enhanced" variants={pageVariants} initial="initial" animate="animate" style={{ textAlign: 'center', padding: '4rem' }}>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>😔</motion.div>
                    <h2 style={{ color: '#f87171', marginBottom: '0.5rem' }}>Oops! Something went wrong</h2>
                    <p style={{ color: '#888', marginBottom: '2rem' }}>{error}</p>
                    <Link to="/participant-dashboard" style={{ textDecoration: 'none' }}><motion.button className="btn-glow btn-glow-secondary" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>← Back to Dashboard</motion.button></Link>
                </motion.div>
            </div>
        );
    }

    if (result) {
        return (
            <div className="questionnaire-page-wrapper">
                <motion.div className="form-container-enhanced" variants={pageVariants} initial="initial" animate="animate" style={{ textAlign: 'center', padding: '3rem' }}>
                    <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} style={{ fontSize: '5rem', marginBottom: '1rem' }}>🎉</motion.div>
                    <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginBottom: '0.5rem' }}>Questionnaire Completed!</motion.h2>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ color: '#888', marginBottom: '2rem' }}>{result.message || "Thank you for completing this survey!"}</motion.p>
                    <div className="completion-stats">
                        <motion.div className="completion-stat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}><div className="completion-stat-value">{questionnaire?.questions?.length || 0}</div><div className="completion-stat-label">Questions</div></motion.div>
                        <motion.div className="completion-stat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}><div className="completion-stat-value">✓</div><div className="completion-stat-label">Submitted</div></motion.div>
                    </div>
                    <Link to="/participant-dashboard" style={{ textDecoration: 'none' }}><motion.button className="btn-glow" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>🏠 Back to Dashboard</motion.button></Link>
                </motion.div>
            </div>
        );
    }

    if (!questionnaire) return <div className="questionnaire-page-wrapper"><motion.div className="form-container-enhanced" variants={pageVariants} initial="initial" animate="animate" style={{ textAlign: 'center', padding: '4rem' }}><div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div><h2>Questionnaire Not Found</h2><p style={{ color: '#888' }}>The questionnaire you're looking for doesn't exist.</p></motion.div></div>;

    return (
        <div className="questionnaire-page-wrapper">
            <motion.div className="form-container-enhanced" variants={pageVariants} initial="initial" animate="animate">
                <div className="page-header-enhanced questionnaire-header">
                    <div>
                        <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>📋 {questionnaire.title}</motion.h2>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>{questionnaire.description}</motion.p>
                    </div>
                    <div className="time-badge"><span>∞</span><span>No Time Limit</span></div>
                </div>

                <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.4 }} style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${getProgress()}%` }} transition={{ duration: 0.5 }} style={{ height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #c4b5fd)', borderRadius: '10px' }} />
                </motion.div>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ color: '#888', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{Object.keys(answers).length} of {questionnaire.questions.length} questions answered</motion.p>

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    {questionnaire.questions.map((q, qIndex) => (
                        <motion.div key={q.id} className="fieldset-enhanced" custom={qIndex} variants={questionVariants} initial="initial" animate="animate" style={{ borderLeft: answers[q.id] ? '4px solid #8b5cf6' : '4px solid transparent' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <span className="legend-enhanced">Question {qIndex + 1}</span>
                                {answers[q.id] && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem' }}>✓ Answered</motion.span>}
                            </div>
                            <p style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1.25rem', lineHeight: 1.6 }}>{q.questionText}</p>
                            {q.questionType === 'MULTIPLE_CHOICE' && <div>{q.options.map((opt, oIndex) => (
                                <motion.label key={opt.id} className={`option-enhanced ${answers[q.id]?.selectedOptionId === opt.id ? 'selected' : ''}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: qIndex * 0.1 + oIndex * 0.05 }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                                    <input type="radio" className="radio-enhanced" name={`question_${q.id}`} checked={answers[q.id]?.selectedOptionId === opt.id} onChange={() => handleAnswerChange(q.id, 'MULTIPLE_CHOICE', opt.id)} />
                                    <span style={{ flex: 1 }}>{opt.optionText}</span>
                                </motion.label>
                            ))}</div>}
                            {q.questionType === 'SHORT_ANSWER' && <textarea className="input-enhanced textarea-enhanced" value={answers[q.id]?.answerText || ""} onChange={(e) => handleAnswerChange(q.id, 'SHORT_ANSWER', e.target.value)} placeholder="Type your answer here..." style={{ marginTop: '0.5rem' }} />}
                        </motion.div>
                    ))}
                    <motion.button type="submit" disabled={submitting} className="btn-glow" style={{ width: '100%', padding: '1.25rem', fontSize: '1.2rem', marginTop: '1rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }} whileHover={{ scale: submitting ? 1 : 1.02 }} whileTap={{ scale: submitting ? 1 : 0.98 }}>
                        {submitting ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>⏳</motion.span>Submitting...</span> : '📋 Submit Questionnaire'}
                    </motion.button>
                </form>
                <AnimatePresence>{error && <motion.div className="message-enhanced error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>❌ {error}</motion.div>}</AnimatePresence>
            </motion.div>
        </div>
    );
};

export default TakeQuestionnaire;
