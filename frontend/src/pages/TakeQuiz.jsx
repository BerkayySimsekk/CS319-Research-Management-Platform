

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
    animate: (i) => ({
        opacity: 1, x: 0, scale: 1,
        transition: { delay: i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    }),
    exit: { opacity: 0, x: -50 }
};

const TakeQuiz = () => {
    const { studyId } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/api/studies/${studyId}/quiz`);
                setQuiz(response.data);
                if (response.data.durationInMinutes && response.data.durationInMinutes > 0) {
                    setTimeLeft(response.data.durationInMinutes * 60);
                }
            } catch (err) {
                setError(err.response?.data?.message || err.message || "Could not load quiz.");
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [studyId]);

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) {
            if (timeLeft === 0) handleSubmit(true);
            return;
        }
        const timerId = setInterval(() => setTimeLeft(prevTime => prevTime - 1), 1000);
        return () => clearInterval(timerId);
    }, [timeLeft]);

    const handleAnswerChange = (questionId, questionType, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                selectedOptionId: questionType === 'MULTIPLE_CHOICE' ? value : null,
                answerText: questionType === 'SHORT_ANSWER' ? value : null
            }
        }));
    };

    const handleSubmit = async (isTimeUp = false) => {
        if (submitting) return;
        if (isTimeUp) alert("Time is up! Your answers are being submitted automatically.");
        else if (!window.confirm("Are you sure you want to submit this quiz?")) return;

        setSubmitting(true);
        setError(null);
        const submissionData = {
            answers: Object.keys(answers).map(qId => ({
                questionId: qId,
                selectedOptionId: answers[qId].selectedOptionId,
                answerText: answers[qId].answerText
            }))
        };

        try {
            const response = await api.post(`/api/studies/${studyId}/quiz/submit`, submissionData);
            setResult(response.data);
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('fromInvite')) setTimeout(() => navigate('/participant-dashboard'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Could not submit quiz.");
            setSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        if (seconds === null) return "∞";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const getTimerClass = () => {
        if (timeLeft === null) return '';
        if (timeLeft <= 60) return 'danger';
        if (timeLeft <= 300) return 'warning';
        return '';
    };

    const getProgress = () => quiz ? (Object.keys(answers).length / quiz.questions.length) * 100 : 0;

    if (loading) {
        return (
            <div className="quiz-page-wrapper">
                <motion.div className="form-container-enhanced" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '4rem' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⏳</motion.div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Loading Quiz...</h2>
                    <p style={{ color: '#888' }}>Please wait while we prepare your assessment</p>
                </motion.div>
            </div>
        );
    }

    if (error && !result) {
        return (
            <div className="quiz-page-wrapper">
                <motion.div className="form-container-enhanced" variants={pageVariants} initial="initial" animate="animate" style={{ textAlign: 'center', padding: '4rem' }}>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>😔</motion.div>
                    <h2 style={{ color: '#f87171', marginBottom: '0.5rem' }}>Oops! Something went wrong</h2>
                    <p style={{ color: '#888', marginBottom: '2rem' }}>{error}</p>
                    <Link to="/participant-dashboard" style={{ textDecoration: 'none' }}>
                        <motion.button className="btn-glow btn-glow-secondary" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>← Back to Dashboard</motion.button>
                    </Link>
                </motion.div>
            </div>
        );
    }

    if (result) {
        const scorePercentage = result.score || 0;
        const isGoodScore = scorePercentage >= 70;
        return (
            <div className="quiz-page-wrapper">
                <motion.div className="form-container-enhanced" variants={pageVariants} initial="initial" animate="animate" style={{ textAlign: 'center', padding: '3rem' }}>
                    <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} style={{ fontSize: '5rem', marginBottom: '1rem' }}>{isGoodScore ? '🎉' : '📊'}</motion.div>
                    <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginBottom: '0.5rem' }}>Quiz Completed!</motion.h2>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ color: '#888', marginBottom: '2rem' }}>{result.message}</motion.p>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 100, delay: 0.5 }} style={{ width: '180px', height: '180px', borderRadius: '50%', background: `conic-gradient(${isGoodScore ? '#10b981' : '#7c3aed'} ${scorePercentage * 3.6}deg, rgba(255,255,255,0.1) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                        <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: '#1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} style={{ fontSize: '2.5rem', fontWeight: '700', color: isGoodScore ? '#34d399' : '#a78bfa' }}>{scorePercentage.toFixed(0)}%</motion.span>
                            <span style={{ fontSize: '0.85rem', color: '#888' }}>Score</span>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}><div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#34d399' }}>{result.correctAnswers}</div><div style={{ fontSize: '0.85rem', color: '#888' }}>Correct</div></div>
                        <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}><div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f87171' }}>{result.totalQuestions - result.correctAnswers}</div><div style={{ fontSize: '0.85rem', color: '#888' }}>Incorrect</div></div>
                        <div style={{ background: 'rgba(124, 58, 237, 0.15)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(124, 58, 237, 0.3)' }}><div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#a78bfa' }}>{result.totalQuestions}</div><div style={{ fontSize: '0.85rem', color: '#888' }}>Total</div></div>
                    </motion.div>
                    <Link to="/participant-dashboard" style={{ textDecoration: 'none' }}><motion.button className="btn-glow" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>🏠 Back to Dashboard</motion.button></Link>
                </motion.div>
            </div>
        );
    }

    if (!quiz) return <div className="quiz-page-wrapper"><motion.div className="form-container-enhanced" variants={pageVariants} initial="initial" animate="animate" style={{ textAlign: 'center', padding: '4rem' }}><div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div><h2>Quiz Not Found</h2><p style={{ color: '#888' }}>The quiz you're looking for doesn't exist.</p></motion.div></div>;

    return (
        <div className="quiz-page-wrapper">
            <motion.div className="form-container-enhanced" variants={pageVariants} initial="initial" animate="animate">
                <div className="page-header-enhanced" style={{ alignItems: 'center' }}>
                    <div>
                        <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>📝 {quiz.title}</motion.h2>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>{quiz.description}</motion.p>
                    </div>
                    {quiz.durationInMinutes > 0 && <motion.div className={`timer-display ${getTimerClass()}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}><span>⏱️</span><span>{formatTime(timeLeft)}</span></motion.div>}
                </div>
                <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.4 }} style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${getProgress()}%` }} transition={{ duration: 0.5 }} style={{ height: '100%', background: 'linear-gradient(90deg, #7c3aed, #10b981)', borderRadius: '10px' }} />
                </motion.div>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ color: '#888', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{Object.keys(answers).length} of {quiz.questions.length} questions answered</motion.p>
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }}>
                    {quiz.questions.map((q, qIndex) => (
                        <motion.div key={q.id} className="fieldset-enhanced" custom={qIndex} variants={questionVariants} initial="initial" animate="animate" style={{ borderLeft: answers[q.id] ? '4px solid #10b981' : '4px solid transparent' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <span className="legend-enhanced">Question {qIndex + 1}</span>
                                {answers[q.id] && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem' }}>✓ Answered</motion.span>}
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
                    <motion.button type="submit" disabled={submitting} className="btn-glow" style={{ width: '100%', padding: '1.25rem', fontSize: '1.2rem', marginTop: '1rem' }} whileHover={{ scale: submitting ? 1 : 1.02 }} whileTap={{ scale: submitting ? 1 : 0.98 }}>
                        {submitting ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>⏳</motion.span>Submitting...</span> : '🚀 Finish & Submit Quiz'}
                    </motion.button>
                </form>
                <AnimatePresence>{error && <motion.div className="message-enhanced error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>❌ {error}</motion.div>}</AnimatePresence>
            </motion.div>
        </div>
    );
};

export default TakeQuiz;
