


import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../context/AuthContext';


import './dashboards/ResearcherDashboard.css';
import './Forms.css';

const ViewSubmissions = () => {
    const { studyId } = useParams();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [studyTitle, setStudyTitle] = useState('');

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await api.get(`/api/studies/${studyId}/quiz/submissions`);
                setSubmissions(response.data);
                setStudyTitle(`Study ID: ${studyId}`);
            } catch (err) {
                console.error("Error loading submissions:", err);
                setError(err.response?.data?.message || err.message || "Submissions could not be loaded.");
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [studyId]);
    return (
        <div className="researcher-dashboard">

            <div className="dashboard-header" style={{marginBottom: '1rem'}}>
                <h1>Quiz Submissions</h1>
                <p style={{marginTop: '-1.5rem', color: '#ccc'}}>{studyTitle}</p>
            </div>

            <p>
                <Link to="/researcher-dashboard/manage-studies">
                    <button className="form-button form-button-secondary" style={{width: 'auto'}}>
                        &larr; Back to Study List
                    </button>
                </Link>
            </p>


            <div className="dashboard-card full-width">
                <div className="card-header">
                    <h2>Submission Scores</h2>
                </div>

                <div className="card-content">
                    {loading && <p>Loading submissions...</p>}
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {!loading && !error && (
                        submissions.length === 0 ? (
                            <p>No completed submissions found for this study's quiz yet.</p>
                        ) : (

                            <table className="artifact-list-table">
                                <thead>
                                <tr>
                                    <th>Submission ID</th>
                                    <th>Participant Name</th>
                                    <th>Score</th>
                                    <th>Submitted At</th>
                                </tr>
                                </thead>
                                <tbody>
                                {submissions.map(sub => (
                                    <tr key={sub.submissionId}>
                                        <td>{sub.submissionId}</td>
                                        <td>{sub.participantName} (ID: {sub.participantId})</td>
                                        <td>{sub.score.toFixed(2)}%</td>
                                        <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewSubmissions;