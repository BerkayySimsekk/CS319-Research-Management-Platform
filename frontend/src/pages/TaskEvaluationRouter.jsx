



import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../context/AuthContext';
import EvaluationProgress from './EvaluationProgress';
import EvaluationProgressBlindedMode from './EvaluationProgressBlindedMode';

const TaskEvaluationRouter = () => {
    const { taskId } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isBlinded, setIsBlinded] = useState(null);

    useEffect(() => {
        const fetchTaskData = async () => {
            try {
                setLoading(true);
                setError(null);


                const response = await api.get(`/api/tasks/${taskId}`);
                const taskData = response.data;

                if (!taskData) {
                    setError("Task data not found");
                    return;
                }


                setIsBlinded(taskData.blinded === true);

            } catch (err) {
                console.error("Error loading task:", err);
                setError(err.response?.data?.message || err.message || "Could not load task.");
            } finally {
                setLoading(false);
            }
        };

        if (taskId) {
            fetchTaskData();
        } else {
            setError("Task ID is required");
            setLoading(false);
        }
    }, [taskId]);

    if (loading) {
        return <div className="dashboard-card"><p>Loading task...</p></div>;
    }

    if (error) {
        return <div className="form-message error">{error}</div>;
    }



    if (isBlinded === true) {

        return <EvaluationProgressBlindedMode />;
    } else if (isBlinded === false) {

        return <EvaluationProgress />;
    }


    return <div className="form-message error">Unable to determine evaluation mode</div>;
};

export default TaskEvaluationRouter;

