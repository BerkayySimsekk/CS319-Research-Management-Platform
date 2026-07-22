

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    },
    exit: { opacity: 0, y: -20 }
};

const questionVariants = {
    initial: { opacity: 0, x: -30, scale: 0.95 },
    animate: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    },
    exit: {
        opacity: 0,
        x: 30,
        scale: 0.95,
        transition: { duration: 0.3 }
    }
};

const skeletonVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
};

const EditQuiz = () => {
    const navigate = useNavigate();
    const { quizId } = useParams();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [durationInMinutes, setDurationInMinutes] = useState(10);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [canEditQuestions, setCanEditQuestions] = useState(true);

    const [aiTopic, setAiTopic] = useState('');
    const [aiCount, setAiCount] = useState(3);
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                setLoading(true);
                setError(null);

                try {
                    const canEditResponse = await api.get(`/api/quizzes/${quizId}/can-edit`);
                    setCanEditQuestions(canEditResponse.data.canEdit);
                } catch (err) {
                    console.error("Error checking edit permission:", err);
                    setCanEditQuestions(true);
                }

                const response = await api.get(`/api/quizzes/${quizId}`);

                const quiz = response.data;
                setTitle(quiz.title || '');
                setDescription(quiz.description || '');
                setDurationInMinutes(quiz.durationInMinutes || 0);

                const formattedQuestions = quiz.questions.map(q => ({
                    questionText: q.questionText || '',
                    codeSnippet: '',
                    questionType: q.questionType || 'MULTIPLE_CHOICE',
                    options: q.options ? q.options.map(opt => ({
                        optionText: opt.optionText || '',
                        isCorrect: opt.isCorrect || false
                    })) : []
                }));

                setQuestions(formattedQuestions.length > 0 ? formattedQuestions : [
                    {
                        questionText: '',
                        codeSnippet: '',
                        questionType: 'MULTIPLE_CHOICE',
                        options: [
                            { optionText: '', isCorrect: true },
                            { optionText: '', isCorrect: false }
                        ]
                    }
                ]);
            } catch (err) {
                console.error("Error loading quiz:", err);
                setError("Quiz could not be loaded.");
                setMessage({ type: 'error', text: 'Could not load quiz. Please try again.' });
            } finally {
                setLoading(false);
            }
        };

        if (quizId) {
            fetchQuiz();
        }
    }, [quizId]);

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                questionText: '',
                codeSnippet: '',
                questionType: 'MULTIPLE_CHOICE',
                options: [
                    { optionText: '', isCorrect: true },
                    { optionText: '', isCorrect: false }
                ]
            }
        ]);
    };

    const removeQuestion = (qIndex) => {
        const newQuestions = questions.filter((_, index) => index !== qIndex);
        setQuestions(newQuestions.length > 0 ? newQuestions : [
            {
                questionText: '',
                codeSnippet: '',
                questionType: 'MULTIPLE_CHOICE',
                options: [
                    { optionText: '', isCorrect: true },
                    { optionText: '', isCorrect: false }
                ]
            }
        ]);
    };

    const handleQuestionChange = (qIndex, field, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex][field] = value;
        if (field === 'questionType' && value === 'SHORT_ANSWER') {
            newQuestions[qIndex].options = [];
        }
        if (field === 'questionType' && value === 'MULTIPLE_CHOICE' && newQuestions[qIndex].options.length === 0) {
            newQuestions[qIndex].options = [
                { optionText: '', isCorrect: true },
                { optionText: '', isCorrect: false }
            ];
        }
        setQuestions(newQuestions);
    };

    const addOption = (qIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push({ optionText: '', isCorrect: false });
        setQuestions(newQuestions);
    };

    const removeOption = (qIndex, oIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, index) => index !== oIndex);
        if (newQuestions[qIndex].options.length === 0 && newQuestions[qIndex].questionType === 'MULTIPLE_CHOICE') {
            newQuestions[qIndex].options = [{ optionText: '', isCorrect: true }];
        }
        setQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex].optionText = value;
        setQuestions(newQuestions);
    };

    const handleCorrectChange = (qIndex, correctOIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.forEach((option, oIndex) => {
            option.isCorrect = (oIndex === correctOIndex);
        });
        setQuestions(newQuestions);
    };

    const handleAiGenerate = async () => {
        if (!aiTopic) return alert("Please enter a topic (e.g. 'Java Loops')");
        setIsGenerating(true);
        setMessage({ type: 'info', text: 'Asking AI to generate questions...' });

        try {
            const res = await api.post('/api/quizzes/generate', {
                topic: aiTopic,
                count: parseInt(aiCount)
            });

            setQuestions(prev => [...prev, ...res.data]);
            setMessage({ type: 'success', text: `Successfully added ${res.data.length} questions about "${aiTopic}"!` });
        } catch (err) {
            console.error("AI Gen Error:", err);
            const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
            const statusCode = err.response?.status;

            if (statusCode === 401 || statusCode === 403) {
                setMessage({ type: 'error', text: 'Authentication failed. Please log in as a researcher.' });
            } else if (statusCode === 404) {
                setMessage({ type: 'error', text: 'AI generation endpoint not found. Please check backend configuration.' });
            } else if (err.code === 'ERR_NETWORK' || !err.response) {
                setMessage({ type: 'error', text: 'AI Generation failed. Ensure backend is running and accessible.' });
            } else {
                setMessage({ type: 'error', text: `AI Generation failed: ${errorMessage}` });
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: 'info', text: 'Updating quiz...' });

        const quizData = {
            title,
            description,
            durationInMinutes: parseInt(durationInMinutes) || 0,
            type: 'COMPETENCY_QUIZ',
            ...(canEditQuestions && {
                questions: questions.map(q => ({
                    questionText: q.questionText,
                    questionType: q.questionType,
                    options: q.questionType === 'MULTIPLE_CHOICE' ? q.options.map(opt => ({
                        optionText: opt.optionText,
                        isCorrect: opt.isCorrect
                    })) : []
                }))
            })
        };

        try {
            await api.put(`/api/quizzes/${quizId}`, quizData);
            setMessage({ type: 'success', text: 'Quiz updated successfully!' });
            setTimeout(() => {
                navigate('/researcher-dashboard/manage-quizzes');
            }, 1500);
        } catch (err) {
            console.error("Update quiz error:", err);
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Could not update quiz.';
            setMessage({ type: 'error', text: errorMessage });
        }
    };

    if (loading) {
        return (
            <div className="quiz-page-wrapper">
                <motion.div
                    className="form-container-enhanced"
                    variants={skeletonVariants}
                    initial="initial"
                    animate="animate"
                >
                    <div className="page-header-enhanced">
                        <div>
                            <div className="skeleton skeleton-title" style={{ width: '200px', height: '2rem' }}></div>
                            <div className="skeleton skeleton-text" style={{ width: '300px', marginTop: '0.5rem' }}></div>
                        </div>
                    </div>
                    <div className="fieldset-enhanced" style={{ marginTop: '2rem' }}>
                        <div className="skeleton skeleton-text" style={{ width: '100%', height: '3rem', marginBottom: '1rem' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '100%', height: '5rem', marginBottom: '1rem' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '150px', height: '3rem' }}></div>
                    </div>
                    <div className="fieldset-enhanced" style={{ marginTop: '1.5rem' }}>
                        <div className="skeleton skeleton-text" style={{ width: '100%', height: '3rem', marginBottom: '1rem' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '100%', height: '3rem' }}></div>
                    </div>
                </motion.div>
            </div>
        );
    }


    if (error && questions.length === 0) {
        return (
            <div className="quiz-page-wrapper">
                <motion.div
                    className="form-container-enhanced"
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    style={{ textAlign: 'center', padding: '3rem' }}
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        style={{ fontSize: '4rem', marginBottom: '1rem' }}
                    >
                        😕
                    </motion.div>
                    <h2 style={{ color: '#f87171', marginBottom: '1rem' }}>Failed to Load Quiz</h2>
                    <p style={{ color: '#888', marginBottom: '2rem' }}>{error}</p>
                    <motion.button
                        className="btn-glow btn-glow-secondary"
                        onClick={() => navigate('/researcher-dashboard/manage-quizzes')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        ← Back to Manage Quizzes
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="quiz-page-wrapper">
            <motion.div
                className="form-container-enhanced"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
            >

                <div className="page-header-enhanced">
                    <div>
                        <motion.h2
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            ✏️ Edit Quiz
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            Update quiz title, description, duration, and questions
                        </motion.p>
                    </div>
                    <motion.button
                        className="btn-glow btn-glow-secondary"
                        onClick={() => navigate('/researcher-dashboard/manage-quizzes')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        ← Back
                    </motion.button>
                </div>


                {canEditQuestions && (
                    <motion.div
                        className="ai-generator-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h3>
                            <span className="ai-sparkle">✨</span> Generate with AI
                        </h3>
                        <p style={{color: '#aaa', fontSize: '0.9rem', marginBottom: '1rem', position: 'relative', zIndex: 1}}>
                            Automatically generate technical questions using our AI model.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                            <input
                                className="input-enhanced"
                                style={{flex: 1, minWidth: '200px'}}
                                placeholder="Topic (e.g., Python Lists, React Hooks)"
                                value={aiTopic}
                                onChange={e => setAiTopic(e.target.value)}
                            />
                            <input
                                className="input-enhanced"
                                type="number"
                                min="1"
                                max="10"
                                style={{width: '100px'}}
                                value={aiCount}
                                onChange={e => setAiCount(e.target.value)}
                            />
                            <motion.button
                                type="button"
                                className="btn-glow"
                                onClick={handleAiGenerate}
                                disabled={isGenerating}
                                whileHover={{ scale: isGenerating ? 1 : 1.05 }}
                                whileTap={{ scale: isGenerating ? 1 : 0.95 }}
                                style={{ minWidth: '130px' }}
                            >
                                {isGenerating ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <motion.span
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            style={{ display: 'inline-block' }}
                                        >
                                            ⚡
                                        </motion.span>
                                        Generating...
                                    </span>
                                ) : 'Generate'}
                            </motion.button>
                        </div>
                    </motion.div>
                )}


                <AnimatePresence>
                    {!canEditQuestions && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                color: '#fbbf24',
                                padding: '1.25rem',
                                borderRadius: '12px',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem'
                            }}
                        >
                            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                            <div>
                                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Quiz is Locked</strong>
                                <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                                    This quiz has submissions from participants. You can only update the title, description, and duration.
                                    Questions and options cannot be modified to preserve answer integrity.
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit}>

                    <motion.div
                        className="fieldset-enhanced"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <span className="legend-enhanced">Quiz Details</span>

                        <div className="form-group">
                            <label className="form-label">Title</label>
                            <input
                                type="text"
                                className="input-enhanced"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter quiz title..."
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="input-enhanced textarea-enhanced"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what this quiz covers..."
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Duration (in Minutes) — 0 = unlimited</label>
                            <input
                                type="number"
                                className="input-enhanced"
                                value={durationInMinutes}
                                onChange={(e) => setDurationInMinutes(e.target.value)}
                                min="0"
                                style={{ maxWidth: '200px' }}
                            />
                        </div>
                    </motion.div>


                    <AnimatePresence mode="popLayout">
                        {questions.map((question, qIndex) => (
                            <motion.div
                                key={qIndex}
                                className="fieldset-enhanced tilt-card"
                                variants={questionVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                layout
                                style={{ opacity: canEditQuestions ? 1 : 0.7 }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <span className="legend-enhanced">Question {qIndex + 1}</span>
                                    {questions.length > 1 && canEditQuestions && (
                                        <motion.button
                                            type="button"
                                            onClick={() => removeQuestion(qIndex)}
                                            className="btn-glow"
                                            style={{
                                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                                                padding: '0.4rem 0.8rem',
                                                fontSize: '0.85rem'
                                            }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            🗑️ Remove
                                        </motion.button>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Question Text</label>
                                    <input
                                        type="text"
                                        className="input-enhanced"
                                        value={question.questionText}
                                        onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                                        placeholder="What is the output of the following code?"
                                        required
                                        disabled={!canEditQuestions}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Code Snippet (Optional)</label>
                                    <textarea
                                        className="input-enhanced textarea-enhanced textarea-code"
                                        placeholder="// Paste code for participants to analyze..."
                                        value={question.codeSnippet}
                                        onChange={e => handleQuestionChange(qIndex, 'codeSnippet', e.target.value)}
                                        disabled={!canEditQuestions}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Question Type</label>
                                    <select
                                        className="select-enhanced"
                                        value={question.questionType}
                                        onChange={(e) => handleQuestionChange(qIndex, 'questionType', e.target.value)}
                                        disabled={!canEditQuestions}
                                    >
                                        <option value="MULTIPLE_CHOICE">Multiple Choice (Graded)</option>
                                        <option value="SHORT_ANSWER">Short Answer (Survey - Not graded)</option>
                                    </select>
                                </div>

                                {question.questionType === 'MULTIPLE_CHOICE' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        <h4 style={{
                                            color: '#a78bfa',
                                            fontSize: '0.9rem',
                                            marginTop: '1.5rem',
                                            marginBottom: '1rem',
                                            paddingTop: '1rem',
                                            borderTop: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            Options (Select the correct one)
                                        </h4>

                                        <AnimatePresence>
                                            {question.options.map((option, oIndex) => (
                                                <motion.div
                                                    key={oIndex}
                                                    className={`option-enhanced ${option.isCorrect ? 'selected' : ''}`}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ delay: oIndex * 0.05 }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                                                >
                                                    <input
                                                        type="radio"
                                                        className="radio-enhanced"
                                                        name={`correct_q_${qIndex}`}
                                                        checked={option.isCorrect}
                                                        onChange={() => handleCorrectChange(qIndex, oIndex)}
                                                        disabled={!canEditQuestions}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder={`Option ${oIndex + 1}`}
                                                        value={option.optionText}
                                                        onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                        className="input-enhanced"
                                                        required
                                                        style={{ flex: 1 }}
                                                        disabled={!canEditQuestions}
                                                    />
                                                    {question.options.length > 1 && canEditQuestions && (
                                                        <motion.button
                                                            type="button"
                                                            onClick={() => removeOption(qIndex, oIndex)}
                                                            style={{
                                                                background: '#ef4444',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                width: '28px',
                                                                height: '28px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                color: 'white',
                                                                fontSize: '1rem'
                                                            }}
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                        >
                                                            ×
                                                        </motion.button>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>

                                        {canEditQuestions && (
                                            <motion.button
                                                type="button"
                                                onClick={() => addOption(qIndex)}
                                                className="btn-glow btn-glow-secondary"
                                                style={{ marginTop: '0.75rem' }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                + Add Option
                                            </motion.button>
                                        )}
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {canEditQuestions && (
                        <motion.button
                            type="button"
                            onClick={addQuestion}
                            className="btn-glow btn-glow-green"
                            style={{ width: '100%', marginTop: '1rem' }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            + Add New Question
                        </motion.button>
                    )}

                    <hr style={{ margin: '2rem 0', borderColor: 'rgba(255,255,255,0.1)', border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

                    <motion.button
                        type="submit"
                        className="btn-glow"
                        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        💾 Update Quiz
                    </motion.button>

                    <AnimatePresence>
                        {message && (
                            <motion.div
                                className={`message-enhanced ${message.type}`}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                {message.type === 'success' && '✅ '}
                                {message.type === 'error' && '❌ '}
                                {message.type === 'info' && '💡 '}
                                {message.text}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
            </motion.div>
        </div>
    );
};

export default EditQuiz;
