

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    initial: { opacity: 0, x: -30, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, x: 30, scale: 0.95, transition: { duration: 0.3 } }
};

const CreateQuestionnaire = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState([{ questionText: '', questionType: 'SHORT_ANSWER', options: [] }]);
    const [message, setMessage] = useState(null);

    const addQuestion = () => {
        setQuestions([...questions, { questionText: '', questionType: 'SHORT_ANSWER', options: [] }]);
    };

    const handleQuestionChange = (qIndex, field, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex][field] = value;
        if (field === 'questionType' && value === 'MULTIPLE_CHOICE' && newQuestions[qIndex].options.length === 0) {
            newQuestions[qIndex].options = [{ optionText: '' }, { optionText: '' }];
        }
        if (field === 'questionType' && value === 'SHORT_ANSWER') {
            newQuestions[qIndex].options = [];
        }
        setQuestions(newQuestions);
    };

    const addOption = (qIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push({ optionText: '' });
        setQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex].optionText = value;
        setQuestions(newQuestions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: 'info', text: 'Creating questionnaire...' });
        const quizData = { title, description, durationInMinutes: 0, type: 'BACKGROUND_SURVEY', questions };
        try {
            await api.post('/api/quizzes', quizData);
            setMessage({ type: 'success', text: 'Questionnaire created successfully!' });
            setTimeout(() => navigate('/researcher-dashboard/manage-quizzes'), 1500);
        } catch (err) {
            console.error("Create questionnaire error:", err);
            setMessage({ type: 'error', text: 'Could not create questionnaire.' });
        }
    };

    return (
        <div className="questionnaire-page-wrapper">
            <motion.div className="form-container-enhanced" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <div className="page-header-enhanced">
                    <div>
                        <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>📋 Create Questionnaire</motion.h2>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>Background Survey (No Time Limit, Not Graded)</motion.p>
                    </div>
                    <motion.button className="btn-glow btn-glow-secondary" onClick={() => navigate('/researcher-dashboard/manage-quizzes')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>← Back</motion.button>
                </div>

                <motion.div className="info-banner" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <span className="info-banner-icon">💡</span>
                    <span>Background surveys have no time limit and are not graded. Use them to collect demographic or experience data from participants.</span>
                </motion.div>

                <form onSubmit={handleSubmit}>
                    <motion.div className="fieldset-enhanced" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <span className="legend-enhanced">Questionnaire Details</span>
                        <div className="form-group">
                            <label className="form-label">Title</label>
                            <input type="text" className="input-enhanced" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Pre-Study Background Survey" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="input-enhanced textarea-enhanced" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the purpose of this questionnaire..." />
                        </div>
                    </motion.div>

                    <AnimatePresence mode="popLayout">
                        {questions.map((question, qIndex) => (
                            <motion.div key={qIndex} className="fieldset-enhanced tilt-card" variants={questionVariants} initial="initial" animate="animate" exit="exit" layout>
                                <span className="legend-enhanced">Question {qIndex + 1}</span>
                                <div className="form-group">
                                    <label className="form-label">Question Text</label>
                                    <input type="text" className="input-enhanced" value={question.questionText} onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)} placeholder="e.g., How many years of programming experience do you have?" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Question Type</label>
                                    <select className="select-enhanced" value={question.questionType} onChange={(e) => handleQuestionChange(qIndex, 'questionType', e.target.value)}>
                                        <option value="SHORT_ANSWER">Short Answer (Open Text)</option>
                                        <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                                    </select>
                                </div>
                                {question.questionType === 'MULTIPLE_CHOICE' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                        <h4 style={{ color: '#c4b5fd', fontSize: '0.9rem', marginTop: '1.5rem', marginBottom: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>Options</h4>
                                        <AnimatePresence>
                                            {question.options.map((option, oIndex) => (
                                                <motion.div key={oIndex} className="option-enhanced" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: oIndex * 0.05 }}>
                                                    <input type="text" placeholder={`Option ${oIndex + 1}`} value={option.optionText} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} className="input-enhanced" required style={{ flex: 1 }} />
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                        <motion.button type="button" onClick={() => addOption(qIndex)} className="btn-glow btn-glow-secondary" style={{ marginTop: '0.75rem' }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>+ Add Option</motion.button>
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    <motion.button type="button" onClick={addQuestion} className="btn-glow btn-glow-green" style={{ width: '100%', marginTop: '1rem' }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>+ Add New Question</motion.button>
                    <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
                    <motion.button type="submit" className="btn-glow" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>📋 Save Questionnaire</motion.button>

                    <AnimatePresence>
                        {message && (
                            <motion.div className={`message-enhanced ${message.type}`} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                {message.type === 'success' && '✅ '}{message.type === 'error' && '❌ '}{message.type === 'info' && '💡 '}{message.text}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
            </motion.div>
        </div>
    );
};

export default CreateQuestionnaire;
