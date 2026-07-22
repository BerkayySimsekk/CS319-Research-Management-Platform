

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../context/AuthContext';
import './Forms.css';
import './QuizEnhanced.css';


const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    }
};

const tableRowVariants = {
    initial: { opacity: 0, x: -20 },
    animate: (i) => ({
        opacity: 1,
        x: 0,
        transition: { delay: i * 0.05, duration: 0.3 }
    }),
    exit: { opacity: 0, x: 20 }
};

const ManageQuizzes = () => {
    const navigate = useNavigate();
    const [allQuizzes, setAllQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('quizzes');


    const quizzes = allQuizzes.filter(q => q.type === 'COMPETENCY_QUIZ' || !q.type);
    const questionnaires = allQuizzes.filter(q => q.type === 'BACKGROUND_SURVEY');

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await api.get('/api/quizzes/my-quizzes');
                setAllQuizzes(response.data);
            } catch (err) {
                console.error("Error loading quizzes:", err);
                setError("Quizzes could not be loaded.");
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, []);


    if (loading) {
        return (
            <div className="quiz-page-wrapper">
                <motion.div
                    className="form-container-enhanced"
                    style={{ maxWidth: '1200px' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="page-header-enhanced">
                        <div className="skeleton skeleton-title" style={{ width: '300px', height: '2rem' }}></div>
                        <div className="skeleton skeleton-button"></div>
                    </div>
                    <div style={{ marginTop: '2rem' }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="skeleton" style={{ height: '60px', marginBottom: '0.5rem', borderRadius: '8px' }}></div>
                        ))}
                    </div>
                </motion.div>
            </div>
        );
    }


    const currentItems = activeTab === 'quizzes' ? quizzes : questionnaires;

    return (
        <div className="quiz-page-wrapper">
            <motion.div
                className="form-container-enhanced"
                style={{ maxWidth: '1200px' }}
                variants={pageVariants}
                initial="initial"
                animate="animate"
            >

                <div className="page-header-enhanced">
                    <div>
                        <motion.h2
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            📋 Manage My Assessments
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            Create, edit, and manage your quizzes and questionnaires
                        </motion.p>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{ display: 'flex', gap: '0.75rem' }}
                    >
                        <Link to="/researcher-dashboard/create-quiz" style={{ textDecoration: 'none' }}>
                            <motion.button
                                className="btn-glow btn-glow-green"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                ✨ New Quiz
                            </motion.button>
                        </Link>
                        <Link to="/researcher-dashboard/create-questionnaire" style={{ textDecoration: 'none' }}>
                            <motion.button
                                className="btn-glow btn-glow-secondary"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                📝 New Questionnaire
                            </motion.button>
                        </Link>
                    </motion.div>
                </div>


                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '1.5rem',
                        background: '#1f1f1f',
                        padding: '0.5rem',
                        borderRadius: '12px',
                        width: 'fit-content'
                    }}
                >
                    <motion.button
                        onClick={() => setActiveTab('quizzes')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s',
                            background: activeTab === 'quizzes' ? 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' : 'transparent',
                            color: activeTab === 'quizzes' ? '#fff' : '#888'
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        🧠 Quizzes ({quizzes.length})
                    </motion.button>
                    <motion.button
                        onClick={() => setActiveTab('questionnaires')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s',
                            background: activeTab === 'questionnaires' ? 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' : 'transparent',
                            color: activeTab === 'questionnaires' ? '#fff' : '#888'
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        📋 Questionnaires ({questionnaires.length})
                    </motion.button>
                </motion.div>


                <AnimatePresence>
                    {error && (
                        <motion.div
                            className="message-enhanced error"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            ❌ {error}
                        </motion.div>
                    )}
                </AnimatePresence>


                {!error && currentItems.length === 0 && (
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        style={{
                            textAlign: 'center',
                            padding: '4rem 2rem',
                            background: '#1f1f1f',
                            borderRadius: '16px',
                            border: '1px dashed rgba(255, 255, 255, 0.2)'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, delay: 0.4 }}
                            style={{ fontSize: '4rem', marginBottom: '1rem' }}
                        >
                            {activeTab === 'quizzes' ? '🧠' : '📋'}
                        </motion.div>
                        <h3 style={{ color: activeTab === 'quizzes' ? '#a78bfa' : '#34d399', marginBottom: '0.5rem' }}>
                            No {activeTab === 'quizzes' ? 'Quizzes' : 'Questionnaires'} Yet
                        </h3>
                        <p style={{ color: '#888', marginBottom: '1.5rem' }}>
                            {activeTab === 'quizzes'
                                ? 'Create your first quiz to start assessing participants'
                                : 'Create your first questionnaire to collect background information'}
                        </p>
                        <Link
                            to={activeTab === 'quizzes'
                                ? '/researcher-dashboard/create-quiz'
                                : '/researcher-dashboard/create-questionnaire'}
                            style={{ textDecoration: 'none' }}
                        >
                            <motion.button
                                className={activeTab === 'quizzes' ? 'btn-glow' : 'btn-glow btn-glow-green'}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Create Your First {activeTab === 'quizzes' ? 'Quiz' : 'Questionnaire'}
                            </motion.button>
                        </Link>
                    </motion.div>
                )}


                {!error && currentItems.length > 0 && (
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <table className="table-enhanced">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Title</th>
                                    <th>Questions</th>
                                    <th>{activeTab === 'quizzes' ? 'Duration' : 'Type'}</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="wait">
                                    {currentItems.map((item, index) => (
                                        <motion.tr
                                            key={item.id}
                                            custom={index}
                                            variants={tableRowVariants}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                            whileHover={{
                                                backgroundColor: activeTab === 'quizzes'
                                                    ? 'rgba(124, 58, 237, 0.15)'
                                                    : 'rgba(16, 185, 129, 0.15)',
                                                transition: { duration: 0.2 }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <span style={{
                                                    background: activeTab === 'quizzes'
                                                        ? 'rgba(124, 58, 237, 0.2)'
                                                        : 'rgba(16, 185, 129, 0.2)',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '20px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    color: activeTab === 'quizzes' ? '#a78bfa' : '#34d399'
                                                }}>
                                                    #{item.id}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: '500' }}>{item.title}</td>
                                            <td>
                                                <span style={{
                                                    background: 'rgba(251, 191, 36, 0.2)',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '20px',
                                                    fontSize: '0.85rem',
                                                    color: '#fbbf24'
                                                }}>
                                                    {item.questionCount} questions
                                                </span>
                                            </td>
                                            <td>
                                                {activeTab === 'quizzes' ? (
                                                    item.durationInMinutes ? (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            ⏱️ {item.durationInMinutes} min
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#888' }}>∞ Unlimited</span>
                                                    )
                                                ) : (
                                                    <span style={{
                                                        background: 'rgba(16, 185, 129, 0.2)',
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '20px',
                                                        fontSize: '0.85rem',
                                                        color: '#34d399'
                                                    }}>
                                                        📝 Survey
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ color: '#888', fontSize: '0.9rem' }}>
                                                {new Date(item.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </td>
                                            <td>
                                                <motion.button
                                                    className="btn-glow btn-glow-secondary"
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                                    onClick={() => navigate(`/researcher-dashboard/edit-quiz/${item.id}`)}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    ✏️ Edit
                                                </motion.button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>


                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            style={{
                                marginTop: '1.5rem',
                                padding: '1rem 1.5rem',
                                background: '#1f1f1f',
                                borderRadius: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '1rem'
                            }}
                        >
                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <div>
                                    <span style={{ color: '#888', fontSize: '0.85rem' }}>
                                        Total {activeTab === 'quizzes' ? 'Quizzes' : 'Questionnaires'}
                                    </span>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: activeTab === 'quizzes' ? '#a78bfa' : '#34d399' }}>
                                        {currentItems.length}
                                    </div>
                                </div>
                                <div>
                                    <span style={{ color: '#888', fontSize: '0.85rem' }}>Total Questions</span>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fbbf24' }}>
                                        {currentItems.reduce((sum, q) => sum + (q.questionCount || 0), 0)}
                                    </div>
                                </div>
                            </div>
                            <Link
                                to={activeTab === 'quizzes'
                                    ? '/researcher-dashboard/create-quiz'
                                    : '/researcher-dashboard/create-questionnaire'}
                                style={{ textDecoration: 'none' }}
                            >
                                <motion.button
                                    className={activeTab === 'quizzes' ? 'btn-glow' : 'btn-glow btn-glow-green'}
                                    style={{ padding: '0.6rem 1.25rem' }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    + Add Another {activeTab === 'quizzes' ? 'Quiz' : 'Questionnaire'}
                                </motion.button>
                            </Link>
                        </motion.div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default ManageQuizzes;
