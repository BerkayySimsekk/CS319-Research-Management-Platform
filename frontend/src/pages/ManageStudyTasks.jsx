


import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../context/AuthContext';
import { useStudyPermissions } from '../hooks/useStudyPermissions';
import PermissionGate from '../components/PermissionGate';
import { hasPermission } from '../utils/permissions';


import './dashboards/ResearcherDashboard.css';
import './Forms.css';

const ManageStudyTasks = () => {
    const { studyId } = useParams();

    const { data: permissions, loading: permissionsLoading, error: permissionsError } = useStudyPermissions(studyId);
    const canView = hasPermission(permissions, 'canView');
    const canManageTasks = hasPermission(permissions, 'canManageTasks');



    const [assignedTasks, setAssignedTasks] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [artifacts, setArtifacts] = useState([]);
    const [studyTitle, setStudyTitle] = useState('');
    const [studyStatus, setStudyStatus] = useState(null);
    const [latestPublishedVersion, setLatestPublishedVersion] = useState(null);

    const [selectedParticipant, setSelectedParticipant] = useState('');
    const [selectedArtifactA, setSelectedArtifactA] = useState('');
    const [selectedArtifactB, setSelectedArtifactB] = useState('');
    const [taskDescription, setTaskDescription] = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formMessage, setFormMessage] = useState(null);

    const fetchData = async () => {
        if (!canView) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [tasksRes, participantsRes, artifactsRes, studiesRes] = await Promise.all([
                api.get(`/api/studies/${studyId}/tasks`),
                api.get(`/api/studies/${studyId}/enrolled-participants`).catch(() => ({ data: [] })),
                api.get('/api/artifacts/my-artifacts'),
                api.get('/api/studies/my-studies')
            ]);

            setAssignedTasks(tasksRes.data);
            setParticipants(participantsRes.data || []);
            setArtifacts(artifactsRes.data);


            const currentStudy = studiesRes.data.find(s => s.id == studyId);
            if (currentStudy) {
                setStudyTitle(currentStudy.title);
                setStudyStatus(currentStudy.status);
                setLatestPublishedVersion(currentStudy.latestPublishedVersion);
            } else {
                setStudyStatus(null);
                setLatestPublishedVersion(null);
            }

        } catch (err) {
            console.error("Data loading error:", err);
            setError("Page data could not be loaded.");
        } finally {
            setLoading(false);
        }
    };


    const fetchTasksOnly = async () => {
        try {
            const tasksRes = await api.get(`/api/studies/${studyId}/tasks`);
            setAssignedTasks(tasksRes.data);
        } catch (err) {
            console.error("Tasks refresh error:", err);
            setFormMessage({ type: 'error', text: 'Could not refresh task list.' });
        }
    };


    useEffect(() => {
        if (permissionsLoading) return;
        if (permissionsError) return;
        if (permissions && canView) {
            fetchData();
        } else if (permissions && !canView) {
            setLoading(false);
            setAssignedTasks([]);
        }

    }, [studyId, permissions, permissionsLoading, permissionsError, canView]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormMessage(null);

        if (!selectedParticipant || !selectedArtifactA || !selectedArtifactB) {
            setFormMessage({ type: 'error', text: 'Please select participant and both artifacts.' });
            return;
        }
        if (selectedArtifactA === selectedArtifactB) {
            setFormMessage({ type: 'error', text: 'Artifact A and Artifact B cannot be the same.' });
            return;
        }

        setFormMessage({ type: 'info', text: 'Assigning task...' });

        try {
            const requestBody = {
                participantId: selectedParticipant,
                artifactAId: selectedArtifactA,
                artifactBId: selectedArtifactB,
                description: taskDescription.trim() || null
            };

            await api.post(`/api/studies/${studyId}/tasks`, requestBody);

            setFormMessage({ type: 'success', text: 'Task assigned successfully!' });


            setSelectedParticipant('');
            setSelectedArtifactA('');
            setSelectedArtifactB('');
            setTaskDescription('');

            fetchTasksOnly();

        } catch (err) {
            console.error("Task assign error:", err);
            setFormMessage({ type: 'error', text: err.response?.data?.message || 'Could not assign task.' });
        }
    };

    const messageClass = formMessage ? `form-message ${formMessage.type}` : 'form-message';



    return (
        <div className="researcher-dashboard">

            <div className="dashboard-header" style={{marginBottom: '1rem'}}>
                <h1>Manage Tasks</h1>
                <p style={{marginTop: '-1.5rem', color: '#ccc'}}>
                    {loading ? `Study ID: ${studyId}` : `${studyTitle} (ID: ${studyId})`}
                    {studyStatus && (
                        <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem' }}>
                            Status: {studyStatus} {latestPublishedVersion ? `(Latest Version: ${latestPublishedVersion})` : ''}
                        </span>
                    )}
                </p>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                <Link to="/researcher-dashboard/manage-studies">
                    <button className="form-button form-button-secondary" style={{width: 'auto'}}>
                        &larr; Back to Study List
                    </button>
                </Link>
                <Link to={`/researcher-dashboard/study/${studyId}`}>
                    <button className="form-button form-button-secondary" style={{width: 'auto'}}>
                        View Study Stats →
                    </button>
                </Link>
            </div>

            {permissionsError && <div className="form-message error">{permissionsError}</div>}
            {error && <div className="form-message error">{error}</div>}
            {!permissionsLoading && permissions && !canView && (
                <div className="form-message error">
                    You only have read-only access to this study. Task management is disabled.
                </div>
            )}

            {studyStatus && studyStatus !== 'PUBLISHED' && (
                <div className="form-message info" style={{ marginBottom: '1rem' }}>
                    Tasks configured now are part of the draft and will become available to participants after publishing.
                </div>
            )}

            <PermissionGate
                permissions={permissions}
                loading={permissionsLoading}
                check="canManageTasks"
                fallback={
                    <div className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-content">
                            <p className="form-message info" style={{ marginBottom: 0 }}>
                                You do not have permission to assign tasks for this study.
                            </p>
                        </div>
                    </div>
                }
            >
                <div className="dashboard-card" style={{marginBottom: '1.5rem'}}>
                    <div className="card-header">
                        <h2>Assign New Task</h2>
                    </div>
                    <div className="card-content">
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Participant:</label>
                                <select
                                    className="form-select"
                                    value={selectedParticipant}
                                    onChange={(e) => setSelectedParticipant(e.target.value)}
                                    disabled={!canManageTasks}
                                >
                                    <option value="">-- Select a Participant --</option>
                                    {participants.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Artifact A:</label>
                                <select
                                    className="form-select"
                                    value={selectedArtifactA}
                                    onChange={(e) => setSelectedArtifactA(e.target.value)}
                                    disabled={!canManageTasks}
                                >
                                    <option value="">-- Select Artifact A --</option>
                                    {artifacts.map(a => (
                                        <option key={a.id} value={a.id}>{a.fileName} (ID: {a.id})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Artifact B:</label>
                                <select
                                    className="form-select"
                                    value={selectedArtifactB}
                                    onChange={(e) => setSelectedArtifactB(e.target.value)}
                                    disabled={!canManageTasks}
                                >
                                    <option value="">-- Select Artifact B --</option>
                                    {artifacts.map(a => (
                                        <option key={a.id} value={a.id}>{a.fileName} (ID: {a.id})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Task Description (Optional):</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    placeholder="Enter a description for this task..."
                                    value={taskDescription}
                                    onChange={(e) => setTaskDescription(e.target.value)}
                                    disabled={!canManageTasks}
                                />
                            </div>

                            <button type="submit" className="form-button form-button-submit" disabled={!canManageTasks}>
                                Assign Task
                            </button>

                            {formMessage && <p className={messageClass} style={{marginTop: '1rem'}}>{formMessage.text}</p>}
                        </form>
                    </div>
                </div>
            </PermissionGate>


            <div className="dashboard-card full-width">
                <div className="card-header">
                    <h2>Assigned Tasks ({assignedTasks.length})</h2>
                </div>
                <div className="card-content">
                    {(loading || permissionsLoading) && <p>Loading tasks...</p>}
                    {!(loading || permissionsLoading) && permissions && permissions.canView && (
                        assignedTasks.length === 0 ? (
                            <p>No tasks have been assigned to this study yet.</p>
                        ) : (
                            <table className="artifact-list-table">
                                <thead>
                                <tr>
                                    <th>Task ID</th>
                                    <th>Participant</th>
                                    <th>Status</th>
                                    <th>Artifact A</th>
                                    <th>Artifact B</th>
                                    <th>Description</th>
                                    <th>Assigned At</th>
                                    <th>Study Version</th>
                                </tr>
                                </thead>
                                <tbody>
                                {assignedTasks.map(task => (
                                    <tr key={task.taskId}>
                                        <td>{task.taskId}</td>
                                        <td>{task.participantName} (ID: {task.participantId})</td>
                                        <td>{task.status}</td>
                                        <td>{task.artifactAFileName}</td>
                                        <td>{task.artifactBFileName}</td>
                                        <td>{task.description || '—'}</td>
                                        <td>{new Date(task.createdAt).toLocaleString()}</td>
                                        <td>{task.studyVersionNumber ?? '—'}</td>
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

export default ManageStudyTasks;