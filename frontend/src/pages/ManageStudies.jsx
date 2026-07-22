


import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import PermissionGate from '../components/PermissionGate';
import { hasPermission } from '../utils/permissions';


import './dashboards/ResearcherDashboard.css';
import './Forms.css';

const emptyStudyForm = {
    title: '',
    description: '',
    blinded: false,
    accessWindowStart: '',
    accessWindowEnd: ''
};

const toIsoString = (value) => value ? new Date(value).toISOString() : null;
const formatDateTimeLocal = (value) => value ? new Date(value).toISOString().slice(0, 16) : '';
const formatDisplayDate = (value) => value ? new Date(value).toLocaleString() : 'Not set';

const ManageStudies = () => {
    const navigate = useNavigate();
    const [studies, setStudies] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [newStudyForm, setNewStudyForm] = useState(emptyStudyForm);
    const [editingStudyId, setEditingStudyId] = useState(null);
    const [editForm, setEditForm] = useState(emptyStudyForm);
    const [publishLoadingId, setPublishLoadingId] = useState(null);
    const [closeLoadingId, setCloseLoadingId] = useState(null);
    const [archiveLoadingId, setArchiveLoadingId] = useState(null);
    const [expandedStudyId, setExpandedStudyId] = useState(null);
    const [availableArtifacts, setAvailableArtifacts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [studyArtifacts, setStudyArtifacts] = useState({});
    const [studyCriteria, setStudyCriteria] = useState({});
    const [studyTasks, setStudyTasks] = useState({});
    const [studyReadiness, setStudyReadiness] = useState({});
    const [studyVersions, setStudyVersions] = useState({});
    const [versionDetails, setVersionDetails] = useState({});
    const [configLoading, setConfigLoading] = useState({});
    const [artifactFormState, setArtifactFormState] = useState({});
    const [criterionFormState, setCriterionFormState] = useState({});
    const [taskFormState, setTaskFormState] = useState({});
    const [eligibilityFormState, setEligibilityFormState] = useState({});
    const [eligibilityStats, setEligibilityStats] = useState({});
    const [pendingEnrollment, setPendingEnrollment] = useState({});
    const [eligibilitySaving, setEligibilitySaving] = useState({});
    const [templateForm, setTemplateForm] = useState({ studyId: '', name: '', description: '' });
    const [templateMessage, setTemplateMessage] = useState(null);
    const [templateActions, setTemplateActions] = useState({});
    const [cloneFormState, setCloneFormState] = useState({});
    const [instantiateFormState, setInstantiateFormState] = useState({});
    const [showTemplateSection, setShowTemplateSection] = useState(false);
    const [showCloneSection, setShowCloneSection] = useState(false);
    const [editTab, setEditTab] = useState('basic');

    const getArtifactForm = (studyId) => artifactFormState[studyId] || { artifactId: '', alias: '' };
    const getCriterionForm = (studyId) => criterionFormState[studyId] || { name: '', description: '' };
    const getTaskForm = (studyId) => taskFormState[studyId] || { taskId: null, instructions: '', artifactIds: [], ratingCriterionIds: [] };
    const buildDefaultEligibility = () => ({ approvalMode: 'AUTO', rulesets: [] });
    const defaultEligibilityStats = { eligible: 0, ineligible: 0, pending: 0 };
    const getEligibilityForm = (studyId) => eligibilityFormState[studyId] || buildDefaultEligibility();
    const getEligibilityStats = (studyId) => eligibilityStats[studyId] || defaultEligibilityStats;
    const getPendingRequests = (studyId) => pendingEnrollment[studyId] || [];

    const normalizeEligibilityConfig = (config) => ({
        approvalMode: config?.approvalMode || 'AUTO',
        rulesets: (config?.rulesets || []).map(rs => ({
            logic: rs.logic || 'AND',
            rules: (rs.rules || []).map(rule => ({
                field: rule.field || 'skills',
                operator: rule.operator || 'contains',
                value: rule.value || ''
            }))
        }))
    });
    const eligibilityFieldOptions = [
        { value: 'skills', label: 'Skill Tag' },
        { value: 'yearsOfExperience', label: 'Years of Experience' }
    ];
    const operatorOptions = {
        skills: [
            { value: 'contains', label: 'contains' },
            { value: 'not_contains', label: 'does not contain' }
        ],
        yearsOfExperience: [
            { value: '>=', label: '≥' },
            { value: '<=', label: '≤' },
            { value: '>', label: '>' },
            { value: '<', label: '<' },
            { value: '==', label: '=' }
        ]
    };

    const downloadBlob = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    const formatRole = (role) => {
        switch (role) {
            case 'OWNER':
                return 'Owner';
            case 'EDITOR':
                return 'Editor';
            case 'REVIEWER':
                return 'Reviewer';
            case 'VIEWER':
                return 'Viewer';
            default:
                return role || 'Viewer';
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [studiesResponse, quizzesResponse] = await Promise.all([
                api.get('/api/studies/my-studies'),
                api.get('/api/quizzes/my-quizzes')
            ]);
            setStudies(studiesResponse.data);
            setQuizzes(quizzesResponse.data);
        } catch (err) {
            console.error("Data loading error:", err);
            setError("Studies or quizzes could not be loaded.");
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableArtifacts = async () => {
        try {
            const response = await api.get('/api/artifacts/my-artifacts');
            setAvailableArtifacts(response.data);
        } catch (err) {
            console.error("Artifact load error:", err);
        }
    };

    const fetchTemplates = async () => {
        setTemplatesLoading(true);
        try {
            const response = await api.get('/api/study-templates');
            setTemplates(response.data);
        } catch (err) {
            console.error("Template load error:", err);
        } finally {
            setTemplatesLoading(false);
        }
    };

    const fetchStudyConfiguration = async (studyId, force = false) => {
        if (!force && configLoading[studyId]) {
            return;
        }
        setConfigLoading(prev => ({ ...prev, [studyId]: true }));
        try {
            const [artifactsRes, criteriaRes, readinessRes, versionsRes, tasksRes, eligibilityRes] = await Promise.all([
                api.get(`/api/studies/${studyId}/selected-artifacts`),
                api.get(`/api/studies/${studyId}/rating-criteria`),
                api.get(`/api/studies/${studyId}/publish-readiness`),
                api.get(`/api/studies/${studyId}/versions`),
                api.get(`/api/studies/${studyId}/task-definitions`),
                api.get(`/api/studies/${studyId}/eligibility`)
            ]);
            setStudyArtifacts(prev => ({ ...prev, [studyId]: artifactsRes.data }));
            setStudyCriteria(prev => ({ ...prev, [studyId]: criteriaRes.data }));
            setStudyReadiness(prev => ({ ...prev, [studyId]: readinessRes.data }));
            setStudyVersions(prev => ({ ...prev, [studyId]: versionsRes.data }));
            setStudyTasks(prev => ({ ...prev, [studyId]: tasksRes.data }));
            const normalizedConfig = normalizeEligibilityConfig(eligibilityRes.data?.config || buildDefaultEligibility());
            setEligibilityFormState(prev => ({ ...prev, [studyId]: normalizedConfig }));
            setEligibilityStats(prev => ({ ...prev, [studyId]: eligibilityRes.data?.stats || defaultEligibilityStats }));
            setPendingEnrollment(prev => ({ ...prev, [studyId]: eligibilityRes.data?.pendingRequests || [] }));
        } catch (err) {
            console.error("Study configuration error:", err);
            setMessage({ type: 'error', text: err.response?.data?.message || 'Study configuration could not be loaded.' });
        } finally {
            setConfigLoading(prev => ({ ...prev, [studyId]: false }));
        }
    };

    const ensureStudyConfig = (studyId) => {
        if (
            !studyArtifacts[studyId] ||
            !studyCriteria[studyId] ||
            !studyTasks[studyId] ||
            !eligibilityFormState[studyId]
        ) {
            fetchStudyConfiguration(studyId);
        }
    };

    useEffect(() => {
        fetchData();
        fetchAvailableArtifacts();
        fetchTemplates();
    }, []);

    const handleAssignQuiz = async (studyId, quizId) => {
        if (!quizId) {
            setMessage({ type: 'error', text: 'Please select a quiz.' });
            return;
        }
        setMessage({ type: 'info', text: 'Assigning quiz...' });
        try {
            const response = await api.post(`/api/studies/${studyId}/assign-quiz`, {
                quizId: quizId
            });
            setMessage({ type: 'success', text: response.data.message });
            fetchData();
            if (expandedStudyId === studyId) {
                fetchStudyConfiguration(studyId, true);
            }
        } catch (err) {
            console.error("Quiz assign error:", err);
            setMessage({ type: 'error', text: 'Could not assign quiz. (' + (err.response?.data?.message || err.message) + ')' });
        }
    };

    const handleAssignQuestionnaire = async (studyId, quizId) => {
        if (!quizId) {

            try {
                const response = await api.delete(`/api/studies/${studyId}/assign-questionnaire`);
                setMessage({ type: 'success', text: response.data.message });
                fetchData();
            } catch (err) {

                if (err.response?.status !== 400) {
                    console.error("Questionnaire remove error:", err);
                    setMessage({ type: 'error', text: 'Could not remove questionnaire. (' + (err.response?.data?.message || err.message) + ')' });
                }
            }
            return;
        }
        setMessage({ type: 'info', text: 'Assigning questionnaire...' });
        try {
            const response = await api.post(`/api/studies/${studyId}/assign-questionnaire`, {
                quizId: parseInt(quizId)
            });
            setMessage({ type: 'success', text: response.data.message });
            fetchData();
            if (expandedStudyId === studyId) {
                fetchStudyConfiguration(studyId, true);
            }
        } catch (err) {
            console.error("Questionnaire assign error:", err);
            setMessage({ type: 'error', text: 'Could not assign questionnaire. (' + (err.response?.data?.message || err.message) + ')' });
        }
    };


    const competencyQuizzes = quizzes.filter(q => q.type === 'COMPETENCY_QUIZ' || !q.type);
    const backgroundSurveys = quizzes.filter(q => q.type === 'BACKGROUND_SURVEY');

    const handleCreateStudy = async (e) => {
        e.preventDefault();
        setMessage(null);
        try {
            await api.post('/api/studies', {
                title: newStudyForm.title,
                description: newStudyForm.description,
                blinded: newStudyForm.blinded,
                accessWindowStart: toIsoString(newStudyForm.accessWindowStart),
                accessWindowEnd: toIsoString(newStudyForm.accessWindowEnd)
            });
            setMessage({ type: 'success', text: 'Study created successfully.' });
            setNewStudyForm(emptyStudyForm);
            fetchData();
        } catch (err) {
            const errors = err.response?.data?.errors;
            setMessage({ type: 'error', text: errors ? errors.join(' ') : (err.response?.data?.message || 'Could not create study.') });
        }
    };

    const openEditForm = (study) => {
        setEditingStudyId(study.id);
        setEditForm({
            title: study.title || '',
            description: study.description || '',
            blinded: study.blinded || false,
            accessWindowStart: formatDateTimeLocal(study.accessWindowStart),
            accessWindowEnd: formatDateTimeLocal(study.accessWindowEnd)
        });
    };

    const closeEditForm = () => {
        setEditingStudyId(null);
        setEditForm(emptyStudyForm);
        setEditTab('basic');
    };

    const handleUpdateStudy = async (e) => {
        e.preventDefault();
        if (!editingStudyId) return;
        setMessage(null);
        try {
            await api.put(`/api/studies/${editingStudyId}`, {
                title: editForm.title,
                description: editForm.description,
                blinded: editForm.blinded,
                accessWindowStart: toIsoString(editForm.accessWindowStart),
                accessWindowEnd: toIsoString(editForm.accessWindowEnd)
            });
            setMessage({ type: 'success', text: 'Study updated.' });
            closeEditForm();
            fetchData();
            if (expandedStudyId === editingStudyId) {
                fetchStudyConfiguration(editingStudyId, true);
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Could not update study.' });
        }
    };

    const toggleExpanded = (studyId) => {
        setExpandedStudyId(prev => {
            const next = prev === studyId ? null : studyId;
            if (next === studyId) {
                ensureStudyConfig(studyId);
            }
            return next;
        });
    };

    const handlePublish = async (studyId) => {
        setPublishLoadingId(studyId);
        setMessage(null);
        try {
            await api.post(`/api/studies/${studyId}/publish`);
            setMessage({ type: 'success', text: 'Study published successfully.' });
            fetchData();
            fetchStudyConfiguration(studyId, true);
        } catch (err) {
            const errors = err.response?.data?.errors;
            setMessage({ type: 'error', text: errors ? errors.join(' ') : (err.response?.data?.message || 'Publish failed.') });
        } finally {
            setPublishLoadingId(null);
        }
    };

    const handleCloseStudy = async (studyId) => {
        setCloseLoadingId(studyId);
        setMessage(null);
        try {
            const response = await api.post(`/api/studies/${studyId}/close`);
            const successMessage = response.data?.message || 'Study closed successfully.';
            setMessage({ type: 'success', text: successMessage });
            fetchData();
            fetchStudyConfiguration(studyId, true);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Close failed.' });
        } finally {
            setCloseLoadingId(null);
        }
    };

    const handleArchiveStudy = async (studyId) => {
        setArchiveLoadingId(studyId);
        setMessage(null);
        try {
            const response = await api.post(`/api/studies/${studyId}/archive`, null, { responseType: 'blob' });
            downloadBlob(response.data, `study-${studyId}-archive.zip`);
            setMessage({ type: 'success', text: 'Archive bundle generated successfully.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Archive failed.' });
        } finally {
            setArchiveLoadingId(null);
        }
    };

    const handleAddSelectedArtifact = async (studyId) => {
        const form = getArtifactForm(studyId);
        if (!form.artifactId) {
            setMessage({ type: 'error', text: 'Select an artifact to add.' });
            return;
        }
        try {
            await api.post(`/api/studies/${studyId}/selected-artifacts`, {
                artifactId: Number(form.artifactId),
                alias: form.alias || null
            });
            setMessage({ type: 'success', text: 'Artifact added to study.' });
            setArtifactFormState(prev => ({ ...prev, [studyId]: { artifactId: '', alias: '' } }));
            fetchStudyConfiguration(studyId, true);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to add artifact.' });
        }
    };

    const handleRemoveSelectedArtifact = async (studyId, selectionId) => {
        try {
            await api.delete(`/api/studies/${studyId}/selected-artifacts/${selectionId}`);
            setMessage({ type: 'success', text: 'Artifact removed.' });
            fetchStudyConfiguration(studyId, true);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to remove artifact.' });
        }
    };

    const handleAddRatingCriterion = async (studyId) => {
        const form = getCriterionForm(studyId);
        if (!form.name.trim()) {
            setMessage({ type: 'error', text: 'Criterion name is required.' });
            return;
        }
        try {
            await api.post(`/api/studies/${studyId}/rating-criteria`, {
                name: form.name,
                description: form.description || null
            });
            setMessage({ type: 'success', text: 'Rating criterion added.' });
            setCriterionFormState(prev => ({
                ...prev,
                [studyId]: { name: '', description: '' }
            }));
            fetchStudyConfiguration(studyId, true);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to add rating criterion.' });
        }
    };

    const handleDeleteRatingCriterion = async (studyId, criterionId) => {
        if (!criterionId) {
            setMessage({ type: 'error', text: 'Invalid criterion ID.' });
            return;
        }
        if (!window.confirm('Are you sure you want to remove this rating criterion?')) {
            return;
        }
        try {
            await api.delete(`/api/studies/${studyId}/rating-criteria/${Number(criterionId)}`);
            setMessage({ type: 'success', text: 'Rating criterion removed.' });
            fetchStudyConfiguration(studyId, true);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to remove rating criterion.' });
        }
    };

    const handleCloneTitleChange = (studyId, value) => {
        setCloneFormState(prev => ({ ...prev, [studyId]: value }));
    };

    const handleCloneStudy = async (studyId) => {
        const title = cloneFormState[studyId];
        if (!title || !title.trim()) {
            setMessage({ type: 'error', text: 'Enter a title for the cloned study.' });
            return;
        }
        try {
            await api.post(`/api/studies/${studyId}/clone`, { title });
            setMessage({ type: 'success', text: 'Study cloned successfully.' });
            setCloneFormState(prev => ({ ...prev, [studyId]: '' }));
            fetchData();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Clone failed.' });
        }
    };

    const handleTemplateFormChange = (field, value) => {
        setTemplateForm(prev => ({ ...prev, [field]: value }));
    };

    const handleCreateTemplate = async () => {
        if (!templateForm.studyId) {
            setTemplateMessage({ type: 'error', text: 'Select a study to template.' });
            return;
        }
        try {
            await api.post('/api/study-templates', {
                studyId: Number(templateForm.studyId),
                name: templateForm.name,
                description: templateForm.description
            });
            setTemplateMessage({ type: 'success', text: 'Template saved.' });
            setTemplateForm({ studyId: '', name: '', description: '' });
            fetchTemplates();
        } catch (err) {
            setTemplateMessage({ type: 'error', text: err.response?.data?.message || 'Could not save template.' });
        }
    };

    const handleTemplateActionChange = (templateId, field, value) => {
        setTemplateActions(prev => ({
            ...prev,
            [templateId]: {
                ...prev[templateId],
                [field]: value
            }
        }));
    };

    const handleUpdateTemplate = async (templateId) => {
        const action = templateActions[templateId] || {};
        try {
            await api.put(`/api/study-templates/${templateId}`, {
                name: action.name,
                description: action.description
            });
            setTemplateMessage({ type: 'success', text: 'Template updated.' });
            fetchTemplates();
        } catch (err) {
            setTemplateMessage({ type: 'error', text: err.response?.data?.message || 'Could not update template.' });
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        try {
            await api.delete(`/api/study-templates/${templateId}`);
            setTemplateMessage({ type: 'success', text: 'Template deleted.' });
            fetchTemplates();
        } catch (err) {
            setTemplateMessage({ type: 'error', text: err.response?.data?.message || 'Could not delete template.' });
        }
    };

    const handleInstantiateTemplate = async (templateId) => {
        const form = instantiateFormState[templateId] || { title: '' };
        if (!form.title.trim()) {
            setTemplateMessage({ type: 'error', text: 'Enter a title for the new study.' });
            return;
        }
        try {
            await api.post(`/api/study-templates/${templateId}/instantiate`, {
                title: form.title,
                description: form.description
            });
            setTemplateMessage({ type: 'success', text: 'Study created from template.' });
            setInstantiateFormState(prev => ({ ...prev, [templateId]: { title: '', description: '' } }));
            fetchTemplates();
            fetchData();
        } catch (err) {
            setTemplateMessage({ type: 'error', text: err.response?.data?.message || 'Could not create study.' });
        }
    };

    const handleInstantiateFieldChange = (templateId, field, value) => {
        setInstantiateFormState(prev => ({
            ...prev,
            [templateId]: {
                ...prev[templateId],
                [field]: value
            }
        }));
    };

    const updateEligibilityForm = (studyId, updater) => {
        setEligibilityFormState(prev => {
            const current = prev[studyId] || buildDefaultEligibility();
            return {
                ...prev,
                [studyId]: updater(JSON.parse(JSON.stringify(current)))
            };
        });
    };

    const handleEligibilityModeChange = (studyId, mode) => {
        updateEligibilityForm(studyId, form => {
            form.approvalMode = mode;
            return form;
        });
    };

    const handleAddRuleset = (studyId) => {
        updateEligibilityForm(studyId, form => {
            form.rulesets = [...(form.rulesets || []), { logic: 'AND', rules: [] }];
            return form;
        });
    };

    const handleRemoveRuleset = (studyId, index) => {
        updateEligibilityForm(studyId, form => {
            form.rulesets = form.rulesets.filter((_, idx) => idx !== index);
            return form;
        });
    };

    const handleAddRule = (studyId, rulesetIndex) => {
        updateEligibilityForm(studyId, form => {
            const target = form.rulesets[rulesetIndex];
            target.rules = [...target.rules, { field: 'skills', operator: 'contains', value: '' }];
            return form;
        });
    };

    const handleRemoveRule = (studyId, rulesetIndex, ruleIndex) => {
        updateEligibilityForm(studyId, form => {
            const target = form.rulesets[rulesetIndex];
            target.rules = target.rules.filter((_, idx) => idx !== ruleIndex);
            return form;
        });
    };

    const handleRuleFieldChange = (studyId, rulesetIndex, ruleIndex, field, value) => {
        updateEligibilityForm(studyId, form => {
            form.rulesets[rulesetIndex].rules[ruleIndex][field] = value;
            if (field === 'field') {
                form.rulesets[rulesetIndex].rules[ruleIndex].operator = operatorOptions[value][0].value;
                form.rulesets[rulesetIndex].rules[ruleIndex].value = '';
            }
            return form;
        });
    };

    const handleSaveEligibility = async (studyId) => {
        const config = getEligibilityForm(studyId);
        setEligibilitySaving(prev => ({ ...prev, [studyId]: true }));
        try {
            await api.put(`/api/studies/${studyId}/eligibility`, { config });
            setMessage({ type: 'success', text: 'Eligibility updated.' });
            fetchStudyConfiguration(studyId, true);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to update eligibility.' });
        } finally {
            setEligibilitySaving(prev => ({ ...prev, [studyId]: false }));
        }
    };

    const handleApproveEnrollment = async (studyId, requestId) => {
        try {
            await api.post(`/api/studies/${studyId}/enrollment-requests/${requestId}/approve`);
            setMessage({ type: 'success', text: 'Enrollment approved.' });
            fetchStudyConfiguration(studyId, true);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Approval failed.' });
        }
    };

    const handleRejectEnrollment = async (studyId, requestId) => {
        const note = window.prompt('Optional note for the participant?') || '';
        try {
            await api.post(`/api/studies/${studyId}/enrollment-requests/${requestId}/reject`, { note });
            setMessage({ type: 'success', text: 'Enrollment rejected.' });
            fetchStudyConfiguration(studyId, true);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Rejection failed.' });
        }
    };

    const handleEditTaskDefinition = (studyId, task) => {
        setTaskFormState(prev => ({
            ...prev,
            [studyId]: {
                taskId: task.id,
                instructions: task.instructions || '',
                artifactIds: task.artifacts.map(a => Number(a.artifactId)),
                ratingCriterionIds: task.ratingCriteria.map(rc => Number(rc.id))
            }
        }));
    };

    const resetTaskForm = (studyId) => {
        setTaskFormState(prev => ({
            ...prev,
            [studyId]: { taskId: null, instructions: '', artifactIds: [], ratingCriterionIds: [] }
        }));
    };

    const handleTaskFieldChange = (studyId, field, value) => {
        const current = getTaskForm(studyId);
        setTaskFormState(prev => ({
            ...prev,
            [studyId]: { ...current, [field]: value }
        }));
    };

    const handleTaskMultiSelect = (studyId, field, event) => {
        const values = Array.from(event.target.selectedOptions).map(option => option.value);
        handleTaskFieldChange(studyId, field, values);
    };

    const handleSaveTaskDefinition = async (studyId) => {
        const form = getTaskForm(studyId);
        if (!form.instructions || !form.instructions.trim()) {
            setMessage({ type: 'error', text: 'Instructions are required.' });
            return;
        }
        const artifactIds = (form.artifactIds || []).filter(id => id != null).map(Number);
        if (artifactIds.length < 2 || artifactIds.length > 3) {
            setMessage({ type: 'error', text: 'Each task must include 2 or 3 artifacts.' });
            return;
        }
        const payload = {
            instructions: form.instructions,
            artifactIds: artifactIds,
            ratingCriterionIds: (form.ratingCriterionIds || []).filter(id => id != null).map(Number)
        };
        try {
            if (form.taskId) {
                await api.put(`/api/studies/${studyId}/task-definitions/${form.taskId}`, payload);
                setMessage({ type: 'success', text: 'Task updated.' });
            } else {
                await api.post(`/api/studies/${studyId}/task-definitions`, payload);
                setMessage({ type: 'success', text: 'Task created.' });
            }
            resetTaskForm(studyId);
            fetchStudyConfiguration(studyId, true);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to save task.' });
        }
    };

    const handleDeleteTaskDefinition = async (studyId, taskId) => {
        try {
            await api.delete(`/api/studies/${studyId}/task-definitions/${taskId}`);
            setMessage({ type: 'success', text: 'Task removed.' });
            resetTaskForm(studyId);
            fetchStudyConfiguration(studyId, true);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to remove task.' });
        }
    };

    const handleReorderTaskDefinition = async (studyId, taskId, direction) => {
        const tasks = studyTasks[studyId] || [];
        const index = tasks.findIndex(task => task.id === taskId);
        if (index === -1) {
            return;
        }
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= tasks.length) {
            return;
        }
        const reordered = [...tasks];
        const [removed] = reordered.splice(index, 1);
        reordered.splice(newIndex, 0, removed);
        setStudyTasks(prev => ({ ...prev, [studyId]: reordered }));
        try {
            await api.post(`/api/studies/${studyId}/task-definitions/reorder`, {
                orderedTaskIds: reordered.map(task => task.id)
            });
            setMessage({ type: 'success', text: 'Task order updated.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to reorder tasks.' });
            fetchStudyConfiguration(studyId, true);
        }
    };

    const handleToggleVersionDetail = async (studyId, versionNumber) => {
        const key = `${studyId}-${versionNumber}`;
        if (versionDetails[key]) {
            setVersionDetails(prev => {
                const copy = { ...prev };
                delete copy[key];
                return copy;
            });
            return;
        }
        try {
            const response = await api.get(`/api/studies/${studyId}/versions/${versionNumber}`);
            setVersionDetails(prev => ({ ...prev, [key]: response.data }));
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to load version detail.' });
        }
    };




    return (
        <div className="researcher-dashboard">

            <div className="dashboard-header">
                <h1>Manage Studies & Quiz Assignment</h1>
            </div>


            {message && (
                <div
                    className={`form-message ${message.type}`}
                    style={{marginBottom: '1.5rem'}}
                >
                    {message.text}
                </div>
            )}

            <div className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <h2>Create New Study</h2>
                </div>
                <div className="card-content">
                    <form onSubmit={handleCreateStudy} className="form-grid">
                        <label className="form-label">Title</label>
                        <input
                            className="form-input"
                            value={newStudyForm.title}
                            onChange={(e) => setNewStudyForm(prev => ({ ...prev, title: e.target.value }))}
                            required
                        />

                        <label className="form-label">Description</label>
                        <textarea
                            className="form-textarea"
                            value={newStudyForm.description}
                            onChange={(e) => setNewStudyForm(prev => ({ ...prev, description: e.target.value }))}
                            required
                        />

                        <label className="form-label">Access Window Start</label>
                        <input
                            type="datetime-local"
                            className="form-input"
                            value={newStudyForm.accessWindowStart}
                            onChange={(e) => setNewStudyForm(prev => ({ ...prev, accessWindowStart: e.target.value }))}
                            required
                        />

                        <label className="form-label">Access Window End</label>
                        <input
                            type="datetime-local"
                            className="form-input"
                            value={newStudyForm.accessWindowEnd}
                            onChange={(e) => setNewStudyForm(prev => ({ ...prev, accessWindowEnd: e.target.value }))}
                            required
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start'}}>
                            <input
                                type="checkbox"
                                id="new-study-blinded"
                                checked={newStudyForm.blinded}
                                onChange={(e) => setNewStudyForm(prev => ({ ...prev, blinded: e.target.checked }))}
                                style={{ margin: 0, cursor: 'pointer', width: 'fit-content' }}
                            />
                            <label htmlFor="new-study-blinded" style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                Blinded Study? Hide artifact metadata from participants
                            </label>
                        </div>

                        <button type="submit" className="form-button form-button-submit" style={{ marginTop: '1rem' }}>
                            Create Study
                        </button>
                    </form>
                </div>
            </div>

            <div className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowTemplateSection(!showTemplateSection)}>
                    <h2>Template Library ({templates.length})</h2>
                    <button
                        type="button"
                        className="form-button form-button-secondary"
                        style={{ width: 'auto', padding: '0.5rem 1rem' }}
                        onClick={(e) => { e.stopPropagation(); setShowTemplateSection(!showTemplateSection); }}
                    >
                        {showTemplateSection ? 'Hide' : 'Show'} Templates
                    </button>
                </div>
                {showTemplateSection && (
                <div className="card-content">
                    <div className="form-grid">
                        <label className="form-label">Source Study</label>
                        <select
                            className="form-select"
                            value={templateForm.studyId}
                            onChange={(e) => handleTemplateFormChange('studyId', e.target.value)}
                        >
                            <option value="">-- Select --</option>
                            {studies
                                .filter(study => study.permissions?.canEditDraft)
                                .map(study => (
                                    <option key={study.id} value={study.id}>
                                        {study.title} (ID: {study.id})
                                    </option>
                                ))}
                        </select>

                        <label className="form-label">Template Name</label>
                        <input
                            className="form-input"
                            value={templateForm.name}
                            onChange={(e) => handleTemplateFormChange('name', e.target.value)}
                            placeholder="My Reusable Template"
                        />

                        <label className="form-label">Description</label>
                        <input
                            className="form-input"
                            value={templateForm.description}
                            onChange={(e) => handleTemplateFormChange('description', e.target.value)}
                            placeholder="Optional note"
                        />

                        <button
                            type="button"
                            className="form-button form-button-submit"
                            onClick={handleCreateTemplate}
                        >
                            Save Template
                        </button>
                    </div>
                    {templateMessage && (
                        <div className={`form-message ${templateMessage.type}`} style={{ marginTop: '1rem' }}>
                            {templateMessage.text}
                        </div>
                    )}
                    <div style={{ marginTop: '1rem' }}>
                        {templatesLoading ? (
                            <p>Loading templates...</p>
                        ) : templates.length === 0 ? (
                            <p>No templates yet.</p>
                        ) : (
                            <table className="artifact-list-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Description</th>
                                        <th>Updated</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.map(template => {
                                        const actionState = templateActions[template.id] || {
                                            name: template.name,
                                            description: template.description
                                        };
                                        const instantiateState = instantiateFormState[template.id] || { title: '', description: '' };
                                        return (
                                            <tr key={template.id}>
                                                <td>
                                                    <input
                                                        className="form-input"
                                                        value={actionState.name}
                                                        onChange={(e) => handleTemplateActionChange(template.id, 'name', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        className="form-input"
                                                        value={actionState.description || ''}
                                                        onChange={(e) => handleTemplateActionChange(template.id, 'description', e.target.value)}
                                                    />
                                                </td>
                                                <td>{new Date(template.updatedAt).toLocaleString()}</td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        <button
                                                            className="form-button form-button-secondary"
                                                            type="button"
                                                            onClick={() => handleUpdateTemplate(template.id)}
                                                        >
                                                            Update
                                                        </button>
                                                        <button
                                                            className="form-button form-button-secondary"
                                                            type="button"
                                                            onClick={() => handleDeleteTemplate(template.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                        <input
                                                            className="form-input"
                                                            value={instantiateState.title}
                                                            placeholder="New study title"
                                                            onChange={(e) => handleInstantiateFieldChange(template.id, 'title', e.target.value)}
                                                        />
                                                        <button
                                                            className="form-button form-button-submit"
                                                            type="button"
                                                            onClick={() => handleInstantiateTemplate(template.id)}
                                                        >
                                                            Create Study
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
                )}
            </div>

            {loading && <div className="dashboard-card"><p>Loading studies...</p></div>}
            {error && <div className="dashboard-card"><p style={{ color: 'red' }}>{error}</p></div>}

            {!loading && !error && (
                studies.length === 0 ? (
                    <div className="dashboard-card">
                        <p>You have not created any studies yet.</p>
                    </div>
                ) : (

                    <div className="dashboard-grid" style={{gridTemplateColumns: '1fr'}}>
                        {studies.map((study) => {
                            const permissions = study.permissions || {};
                            const canPublish = hasPermission(permissions, 'canPublish');
                            const canClose = hasPermission(permissions, 'canClose');
                            const canExport = hasPermission(permissions, 'canExport');
                            const canManageTasks = hasPermission(permissions, 'canManageTasks');
                            const canEditDraft = hasPermission(permissions, 'canEditDraft');
                            const canViewAudit = hasPermission(permissions, 'canViewAudit');
                            const canArchive = hasPermission(permissions, 'canArchive');
                            const publishDisabled = publishLoadingId === study.id || (!study.hasUnpublishedChanges && study.status === 'PUBLISHED');
                            const closeDisabled = closeLoadingId === study.id || study.status !== 'PUBLISHED';
                            const closeButtonLabel = closeLoadingId === study.id
                                ? 'Closing...'
                                : study.status === 'CLOSED'
                                    ? 'Study Closed'
                                    : 'Close Study';
                            const artifactsForStudy = studyArtifacts[study.id] || [];
                            const ratingCriteriaForStudy = studyCriteria[study.id] || [];
                            const versionsForStudy = studyVersions[study.id] || [];
                            const readiness = studyReadiness[study.id];
                            const readinessErrors = readiness?.errors || [];
                            const configBusy = configLoading[study.id];
                            const artifactForm = getArtifactForm(study.id);
                            const criterionForm = getCriterionForm(study.id);
                            const selectedArtifactIds = new Set(artifactsForStudy.map(item => item.artifactId));
                            const artifactOptions = availableArtifacts.filter(artifact => !selectedArtifactIds.has(artifact.id));

                            return (
                                <div key={study.id} className="dashboard-card">
                                    <div className="card-header" style={{marginBottom: '1rem'}}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <h2>{study.title} (ID: {study.id})</h2>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <span className={`badge status-badge status-${(study.status || '').toLowerCase()}`}>
                                                    {study.status || 'UNKNOWN'}
                                                </span>
                                                <span className="badge badge-role">
                                                    Role: {formatRole(study.currentRole)}
                                                </span>
                                                {study.hasUnpublishedChanges && (
                                                    <span className="badge badge-warn">Unpublished changes</span>
                                                )}
                                            {study.provenance && (
                                                <span className="badge badge-role">
                                                    {study.provenance}
                                                </span>
                                            )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <PermissionGate permissions={permissions} check="canViewAudit">
                                                <button
                                                    className="form-button form-button-secondary"
                                                    style={{ width: 'auto' }}
                                                    onClick={() => navigate(`/researcher-dashboard/study/${study.id}/audit-log`)}
                                                >
                                                    Audit Log
                                                </button>
                                            </PermissionGate>
                                            <PermissionGate permissions={permissions} check="canInvite">
                                                <Link to={`/researcher-dashboard/study/${study.id}/collaborators`}>
                                                    <button className="form-button form-button-secondary" style={{ width: 'auto' }}>
                                                        Manage Collaborators
                                                    </button>
                                                </Link>
                                            </PermissionGate>
                                            <button
                                                className="form-button form-button-secondary"
                                                style={{ width: 'auto' }}
                                                onClick={() => toggleExpanded(study.id)}
                                            >
                                                {expandedStudyId === study.id ? 'Hide Details' : 'View Details'}
                                            </button>
                                        </div>
                                    </div>

                                    {expandedStudyId === study.id && (
                                        <div className="card-content">
                                            {(canPublish || canClose) && editingStudyId !== study.id && (
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                                    <PermissionGate permissions={permissions} check="canPublish">
                                                        <button
                                                            className="form-button form-button-submit"
                                                            style={{ width: 'auto' }}
                                                            onClick={() => handlePublish(study.id)}
                                                            disabled={publishDisabled}
                                                        >
                                                            {publishLoadingId === study.id ? 'Publishing...' : 'Publish Study'}
                                                        </button>
                                                        {!study.hasUnpublishedChanges && study.status === 'PUBLISHED' && (
                                                            <span style={{ color: '#9fe870', fontSize: '0.85rem' }}>
                                                                All changes are already published.
                                                            </span>
                                                        )}
                                                    </PermissionGate>
                                                    <PermissionGate permissions={permissions} check="canClose">
                                                        <button
                                                            className="form-button form-button-secondary"
                                                            style={{ width: 'auto', backgroundColor: '#7b1e1e' }}
                                                            onClick={() => handleCloseStudy(study.id)}
                                                            disabled={closeDisabled}
                                                        >
                                                            {closeButtonLabel}
                                                        </button>
                                                    </PermissionGate>
                                                    <PermissionGate permissions={permissions} check="canArchive">
                                                        <button
                                                            className="form-button form-button-secondary"
                                                            style={{ width: 'auto' }}
                                                            onClick={() => handleArchiveStudy(study.id)}
                                                            disabled={archiveLoadingId === study.id}
                                                        >
                                                            {archiveLoadingId === study.id ? 'Archiving...' : 'Archive Bundle'}
                                                        </button>
                                                    </PermissionGate>
                                                </div>
                                            )}
                                            <p>{study.description}</p>
                                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                    <strong style={{ color: '#bbb' }}>Access Window:</strong>
                                                    <span style={{ color: '#fff', textAlign: 'center', padding: '0.5rem 0' }}>{formatDisplayDate(study.accessWindowStart)} – {formatDisplayDate(study.accessWindowEnd)}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                    <strong style={{ color: '#bbb' }}>Latest Published Version:</strong>
                                                    <span style={{ color: '#fff', textAlign: 'center', padding: '0.5rem 0' }}>{study.latestPublishedVersion ?? '—'} • Next Draft Version: {study.nextVersionNumber}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                    <strong style={{ color: '#bbb' }}>Blinding:</strong>
                                                    <span style={{ color: '#fff', textAlign: 'center', padding: '0.5rem 0' }}>{study.blinded ? 'Enabled' : 'Disabled'}</span>
                                                </div>
                                            </div>
                                            {study.status !== 'PUBLISHED' && (
                                                <p style={{ color: '#f5c17c', marginTop: '0.25rem' }}>
                                                    Participants cannot access this study until it is published.
                                                </p>
                                            )}
                                            {study.status === 'CLOSED' && (
                                                <p style={{ color: '#ff9f9f', marginTop: '0.25rem' }}>
                                                    This study is closed and no longer accepts participant activity.
                                                </p>
                                            )}

                                            <hr style={{borderColor: '#444', margin: '1.5rem 0'}} />

                                            {study.competencyQuiz ? (
                                                <div style={{marginBottom: '1.5rem'}}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                        <strong style={{ color: '#bbb' }}>Assigned Quiz:</strong>
                                                        <span style={{ textAlign: 'center', color: '#fff', padding: '0.5rem 0' }}>{study.competencyQuiz.title}</span>
                                                    </div>
                                                    <PermissionGate permissions={permissions} check="canExport">
                                                        <Link to={`/researcher-dashboard/study/${study.id}/submissions`}>
                                                            <button
                                                                className="form-button form-button-secondary"
                                                                style={{backgroundColor: '#28a745', width: 'auto'}}
                                                            >
                                                                View Submissions (Scores)
                                                            </button>
                                                        </Link>
                                                    </PermissionGate>
                                                </div>
                                            ) : (
                                                <p><i>No quiz assigned to this study yet.</i></p>
                                            )}

                                            <PermissionGate permissions={permissions} check="canManageTasks">
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <Link to={`/researcher-dashboard/study/${study.id}/tasks`}>
                                                        <button
                                                            className="form-button form-button-secondary"
                                                            style={{width: 'auto'}}
                                                        >
                                                            Manage Tasks
                                                        </button>
                                                    </Link>
                                                </div>
                                            </PermissionGate>

                                            <label className="form-label" style={{marginTop: '1rem'}}>
                                                Assign / Change Competency Quiz:
                                            </label>
                                            <select
                                                className="form-select"
                                                value={study.competencyQuiz?.id || ""}
                                                onChange={(e) => handleAssignQuiz(study.id, e.target.value)}
                                                disabled={!canEditDraft}
                                            >
                                                <option value="">-- Select a Quiz --</option>
                                                {competencyQuizzes.map(quiz => (
                                                    <option key={quiz.id} value={quiz.id}>
                                                        {quiz.title} (ID: {quiz.id})
                                                    </option>
                                                ))}
                                            </select>
                                            <small style={{color: '#999', marginTop: '0.5rem', display: 'block'}}>
                                                {canEditDraft
                                                    ? 'Technical quiz to assess participant skills before enrollment.'
                                                    : 'You cannot modify quiz assignments with your current access.'}
                                            </small>


                                            <label className="form-label" style={{marginTop: '1.5rem'}}>
                                                Assign / Change Background Questionnaire:
                                            </label>
                                            {study.backgroundQuestionnaire && (
                                                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: '#2a2a2a', borderRadius: '6px' }}>
                                                    <strong style={{ marginBottom: '0.25rem', color: '#bbb', fontSize: '0.9rem' }}>Currently Assigned:</strong>
                                                    <span style={{ color: '#4caf50' }}>{study.backgroundQuestionnaire.title}</span>
                                                </div>
                                            )}
                                            <select
                                                className="form-select"
                                                value={study.backgroundQuestionnaire?.id || ""}
                                                onChange={(e) => handleAssignQuestionnaire(study.id, e.target.value)}
                                                disabled={!canEditDraft}
                                            >
                                                <option value="">-- No Questionnaire --</option>
                                                {backgroundSurveys.map(quiz => (
                                                    <option key={quiz.id} value={quiz.id}>
                                                        {quiz.title} (ID: {quiz.id})
                                                    </option>
                                                ))}
                                            </select>
                                            <small style={{color: '#999', marginTop: '0.5rem', display: 'block'}}>
                                                {canEditDraft
                                                    ? 'Survey to collect demographic/background data for participant filtering.'
                                                    : 'You cannot modify questionnaire assignments with your current access.'}
                                            </small>
                                            {backgroundSurveys.length === 0 && (
                                                <small style={{color: '#f0ad4e', marginTop: '0.25rem', display: 'block'}}>
                                                    No background surveys available. Create one in Manage Quizzes with type "Background Survey".
                                                </small>
                                            )}
                                            {!canManageTasks && (
                                                <p style={{ color: '#bbb', fontSize: '0.85rem', marginTop: '1rem' }}>
                                                    You currently have read-only access to this study.
                                                </p>
                                            )}

                                            <div className="dashboard-card" style={{ marginTop: '1.5rem' }}>
                                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowCloneSection(!showCloneSection)}>
                                                    <h3>Clone Study</h3>
                                                    <button
                                                        type="button"
                                                        className="form-button form-button-secondary"
                                                        style={{ width: 'auto', padding: '0.5rem 1rem' }}
                                                        onClick={(e) => { e.stopPropagation(); setShowCloneSection(!showCloneSection); }}
                                                    >
                                                        {showCloneSection ? 'Hide' : 'Show'} Clone Options
                                                    </button>
                                                </div>
                                                {showCloneSection && (
                                                    <div className="card-content">
                                                        <div className="form-grid">
                                                            <label className="form-label">New Study Title</label>
                                                            <input
                                                                className="form-input"
                                                                value={cloneFormState[study.id] || ''}
                                                                placeholder="Enter title for cloned study"
                                                                onChange={(e) => handleCloneTitleChange(study.id, e.target.value)}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="form-button form-button-submit"
                                                                onClick={() => handleCloneStudy(study.id)}
                                                            >
                                                                Clone Study
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <PermissionGate permissions={permissions} check="canEditDraft">
                                                {editingStudyId !== study.id && (
                                                    <button
                                                        className="form-button form-button-secondary"
                                                        style={{ width: 'auto', marginTop: '1rem' }}
                                                        onClick={() => openEditForm(study)}
                                                    >
                                                        Edit Draft Details
                                                    </button>
                                                )}
                                            </PermissionGate>

                                            {editingStudyId === study.id && (
                                                <div style={{ marginTop: '1.5rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #444', flexWrap: 'wrap' }}>
                                                        {['basic', 'artifacts', 'criteria', 'tasks', 'eligibility'].map(tab => (
                                                            <button
                                                                key={tab}
                                                                type="button"
                                                                onClick={() => setEditTab(tab)}
                                                                className="form-button form-button-secondary"
                                                                style={{
                                                                    width: 'auto',
                                                                    padding: '0.5rem 1rem',
                                                                    backgroundColor: editTab === tab ? '#2a5d7a' : 'transparent',
                                                                    borderBottom: editTab === tab ? '2px solid #4a9eff' : '2px solid transparent',
                                                                    borderRadius: '4px 4px 0 0',
                                                                    marginBottom: '-1px'
                                                                }}
                                                            >
                                                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {editTab === 'basic' && (
                                                        <div className="dashboard-card">
                                                            <div className="card-header">
                                                                <h3>Basic Study Details</h3>
                                                            </div>
                                                            <div className="card-content">
                                                                <form onSubmit={handleUpdateStudy} className="form-grid">
                                                                    <label className="form-label">Title</label>
                                                                    <input
                                                                        className="form-input"
                                                                        value={editForm.title}
                                                                        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                                                    />

                                                                    <label className="form-label">Description</label>
                                                                    <textarea
                                                                        className="form-textarea"
                                                                        value={editForm.description}
                                                                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                                                    />

                                                                    <label className="form-label">Access Window Start</label>
                                                                    <input
                                                                        type="datetime-local"
                                                                        className="form-input"
                                                                        value={editForm.accessWindowStart}
                                                                        onChange={(e) => setEditForm(prev => ({ ...prev, accessWindowStart: e.target.value }))}
                                                                    />

                                                                    <label className="form-label">Access Window End</label>
                                                                    <input
                                                                        type="datetime-local"
                                                                        className="form-input"
                                                                        value={editForm.accessWindowEnd}
                                                                        onChange={(e) => setEditForm(prev => ({ ...prev, accessWindowEnd: e.target.value }))}
                                                                    />

                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            id="edit-study-blinded"
                                                                            checked={editForm.blinded}
                                                                            onChange={(e) => setEditForm(prev => ({ ...prev, blinded: e.target.checked }))}
                                                                            style={{ margin: 0, cursor: 'pointer', width: 'fit-content' }}
                                                                        />
                                                                        <label htmlFor="edit-study-blinded" style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                                            Blinded Study? Hide artifact metadata from participants
                                                                        </label>
                                                                    </div>

                                                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                                                        <button type="submit" className="form-button form-button-submit">
                                                                            Save Changes
                                                                        </button>
                                                                        <button type="button" className="form-button form-button-secondary" onClick={closeEditForm}>
                                                                            Cancel
                                                                        </button>
                                                                        <PermissionGate permissions={permissions} check="canPublish">
                                                                            <button
                                                                                type="button"
                                                                                className="form-button form-button-submit"
                                                                                style={{ backgroundColor: '#1d6f43' }}
                                                                                onClick={() => handlePublish(study.id)}
                                                                                disabled={publishDisabled}
                                                                            >
                                                                                {publishLoadingId === study.id ? 'Publishing...' : 'Publish Draft'}
                                                                            </button>
                                                                        </PermissionGate>
                                                                    </div>
                                                                </form>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {editTab === 'artifacts' && (
                                                        <div className="dashboard-card">
                                                            <div className="card-header">
                                                                <h3>Selected Artifacts ({artifactsForStudy.length})</h3>
                                                            </div>
                                                            <div className="card-content">
                                                                {configBusy && <p>Loading configuration...</p>}
                                                                {!configBusy && (
                                                                    <>
                                                                        {artifactsForStudy.length === 0 ? (
                                                                            <p>No artifacts have been linked to this study yet.</p>
                                                                        ) : (
                                                                            <table className="artifact-list-table">
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th>Alias</th>
                                                                                        <th>File</th>
                                                                                        <th>Owner</th>
                                                                                        <th>Added</th>
                                                                                        {canEditDraft && <th>Actions</th>}
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {artifactsForStudy.map(selection => (
                                                                                        <tr key={selection.id}>
                                                                                            <td>{selection.alias || '(default)'}</td>
                                                                                            <td>{selection.fileName}</td>
                                                                                            <td>{selection.ownerName}</td>
                                                                                            <td>{new Date(selection.addedAt).toLocaleString()}</td>
                                                                                            {canEditDraft && (
                                                                                                <td>
                                                                                                    <button
                                                                                                        className="form-button form-button-secondary"
                                                                                                        type="button"
                                                                                                        style={{ width: 'auto', padding: '0.25rem 0.75rem' }}
                                                                                                        onClick={() => handleRemoveSelectedArtifact(study.id, selection.id)}
                                                                                                    >
                                                                                                        Remove
                                                                                                    </button>
                                                                                                </td>
                                                                                            )}
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        )}
                                                                        <PermissionGate permissions={permissions} check="canEditDraft">
                                                                            <div className="form-grid" style={{ marginTop: '1rem' }}>
                                                                                <label className="form-label">Add Artifact</label>
                                                                                <select
                                                                                    className="form-select"
                                                                                    value={artifactForm.artifactId}
                                                                                    onChange={(e) => setArtifactFormState(prev => ({
                                                                                        ...prev,
                                                                                        [study.id]: { ...artifactForm, artifactId: e.target.value }
                                                                                    }))}
                                                                                >
                                                                                    <option value="">-- Select Artifact --</option>
                                                                                    {artifactOptions.map(artifact => (
                                                                                        <option key={artifact.id} value={artifact.id}>
                                                                                            {artifact.fileName} (ID: {artifact.id})
                                                                                        </option>
                                                                                    ))}
                                                                                </select>

                                                                                <label className="form-label">Alias (optional)</label>
                                                                                <input
                                                                                    className="form-input"
                                                                                    value={artifactForm.alias}
                                                                                    placeholder="Custom display name"
                                                                                    onChange={(e) => setArtifactFormState(prev => ({
                                                                                        ...prev,
                                                                                        [study.id]: { ...artifactForm, alias: e.target.value }
                                                                                    }))}
                                                                                />

                                                                                <button
                                                                                    type="button"
                                                                                    className="form-button form-button-submit"
                                                                                    onClick={() => handleAddSelectedArtifact(study.id)}
                                                                                    disabled={artifactOptions.length === 0}
                                                                                >
                                                                                    Add Artifact
                                                                                </button>
                                                                                {artifactOptions.length === 0 && (
                                                                                    <small style={{ color: '#bbb' }}>
                                                                                        You have linked all of your available artifacts.
                                                                                    </small>
                                                                                )}
                                                                            </div>
                                                                        </PermissionGate>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {editTab === 'criteria' && (
                                                        <div className="dashboard-card">
                                                            <div className="card-header">
                                                                <h3>Rating Criteria ({ratingCriteriaForStudy.length})</h3>
                                                            </div>
                                                            <div className="card-content">
                                                                {configBusy && <p>Loading configuration...</p>}
                                                                {!configBusy && (
                                                                    <>
                                                                        {ratingCriteriaForStudy.length === 0 ? (
                                                                            <p>No rating criteria defined yet.</p>
                                                                        ) : (
                                                                            <table className="artifact-list-table">
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th>Name</th>
                                                                                        <th>Description</th>
                                                                                        {canEditDraft && <th>Actions</th>}
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {ratingCriteriaForStudy.map(criterion => (
                                                                                        <tr key={criterion.id}>
                                                                                            <td>{criterion.name}</td>
                                                                                            <td>{criterion.description || '—'}</td>
                                                                                            {canEditDraft && (
                                                                                                <td>
                                                                                                    <button
                                                                                                        className="form-button form-button-secondary"
                                                                                                        type="button"
                                                                                                        style={{ width: 'auto', padding: '0.25rem 0.75rem' }}
                                                                                                        onClick={() => handleDeleteRatingCriterion(study.id, criterion.id)}
                                                                                                    >
                                                                                                        Remove
                                                                                                    </button>
                                                                                                </td>
                                                                                            )}
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        )}
                                                                        <PermissionGate permissions={permissions} check="canEditDraft">
                                                                            <div className="form-grid" style={{ marginTop: '1rem' }}>
                                                                                <label className="form-label">Criterion Name</label>
                                                                                <input
                                                                                    className="form-input"
                                                                                    value={criterionForm.name}
                                                                                    onChange={(e) => setCriterionFormState(prev => ({
                                                                                        ...prev,
                                                                                        [study.id]: { ...criterionForm, name: e.target.value }
                                                                                    }))}
                                                                                />

                                                                                <label className="form-label">Description (optional)</label>
                                                                                <textarea
                                                                                    className="form-textarea"
                                                                                    value={criterionForm.description}
                                                                                    onChange={(e) => setCriterionFormState(prev => ({
                                                                                        ...prev,
                                                                                        [study.id]: { ...criterionForm, description: e.target.value }
                                                                                    }))}
                                                                                />

                                                                                <button
                                                                                    type="button"
                                                                                    className="form-button form-button-submit"
                                                                                    onClick={() => handleAddRatingCriterion(study.id)}
                                                                                >
                                                                                    Add Criterion
                                                                                </button>
                                                                            </div>
                                                                        </PermissionGate>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {editTab === 'tasks' && (
                                                        <div className="dashboard-card">
                                                            <div className="card-header">
                                                                <h3>Task Builder ({(studyTasks[study.id] || []).length})</h3>
                                                            </div>
                                                            <div className="card-content">
                                                                {configBusy && <p>Loading tasks...</p>}
                                                                {!configBusy && (
                                                                    <>
                                                                        {(studyTasks[study.id] || []).length === 0 ? (
                                                                            <p>No tasks have been configured for this study.</p>
                                                                        ) : (
                                                                            <table className="artifact-list-table">
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th>Order</th>
                                                                                        <th>Instructions</th>
                                                                                        <th>Artifacts</th>
                                                                                        <th>Rating Criteria</th>
                                                                                        {canEditDraft && <th>Actions</th>}
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {(studyTasks[study.id] || []).map((task, index, array) => (
                                                                                        <tr key={task.id}>
                                                                                            <td>{task.sortOrder + 1}</td>
                                                                                            <td style={{ maxWidth: '220px' }}>
                                                                                                <span style={{ whiteSpace: 'pre-wrap' }}>
                                                                                                    {task.instructions || 'No instructions'}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td>
                                                                                                {task.artifacts.map(artifact => artifact.alias).join(', ')}
                                                                                            </td>
                                                                                            <td>
                                                                                                {task.ratingCriteria.length === 0
                                                                                                    ? 'All criteria'
                                                                                                    : task.ratingCriteria.map(rc => rc.name).join(', ')}
                                                                                            </td>
                                                                                            {canEditDraft && (
                                                                                                <td>
                                                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                                                                                        <button
                                                                                                            className="form-button form-button-secondary"
                                                                                                            type="button"
                                                                                                            style={{ width: 'auto', padding: '0.25rem 0.75rem' }}
                                                                                                            onClick={() => handleEditTaskDefinition(study.id, task)}
                                                                                                        >
                                                                                                            Edit
                                                                                                        </button>
                                                                                                        <button
                                                                                                            className="form-button form-button-secondary"
                                                                                                            type="button"
                                                                                                            style={{ width: 'auto', padding: '0.25rem 0.75rem' }}
                                                                                                            onClick={() => handleDeleteTaskDefinition(study.id, task.id)}
                                                                                                        >
                                                                                                            Remove
                                                                                                        </button>
                                                                                                        <button
                                                                                                            className="form-button form-button-secondary"
                                                                                                            type="button"
                                                                                                            style={{ width: 'auto', padding: '0.25rem 0.75rem' }}
                                                                                                            disabled={index === 0}
                                                                                                            onClick={() => handleReorderTaskDefinition(study.id, task.id, 'up')}
                                                                                                        >
                                                                                                            ↑
                                                                                                        </button>
                                                                                                        <button
                                                                                                            className="form-button form-button-secondary"
                                                                                                            type="button"
                                                                                                            style={{ width: 'auto', padding: '0.25rem 0.75rem' }}
                                                                                                            disabled={index === array.length - 1}
                                                                                                            onClick={() => handleReorderTaskDefinition(study.id, task.id, 'down')}
                                                                                                        >
                                                                                                            ↓
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </td>
                                                                                            )}
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        )}
                                                                        <PermissionGate permissions={permissions} check="canEditDraft">
                                                                            <div className="form-grid" style={{ marginTop: '1rem' }}>
                                                                                <label className="form-label">Task Instructions</label>
                                                                                <textarea
                                                                                    className="form-textarea"
                                                                                    value={getTaskForm(study.id).instructions}
                                                                                    onChange={(e) => handleTaskFieldChange(study.id, 'instructions', e.target.value)}
                                                                                />

                                                                                <label className="form-label">Artifacts (select 2 or 3)</label>
                                                                                <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', padding: '0.75rem', border: '1px solid #444', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                                                                                    {(studyArtifacts[study.id] || []).map(selection => {
                                                                                        const artifactId = Number(selection.artifactId);
                                                                                        const currentIds = (getTaskForm(study.id).artifactIds || []).map(id => Number(id));
                                                                                        return (
                                                                                            <label key={selection.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start', cursor: 'pointer' }}>
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    checked={currentIds.includes(artifactId)}
                                                                                                    onChange={(e) => {
                                                                                                        if (e.target.checked) {
                                                                                                            handleTaskFieldChange(study.id, 'artifactIds', [...currentIds, artifactId]);
                                                                                                        } else {
                                                                                                            handleTaskFieldChange(study.id, 'artifactIds', currentIds.filter(id => id !== artifactId));
                                                                                                        }
                                                                                                    }}
                                                                                                />
                                                                                                <span>{selection.alias || selection.fileName} (ID: {selection.artifactId})</span>
                                                                                            </label>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                                {(studyArtifacts[study.id] || []).length < 2 && (
                                                                                    <small style={{ color: '#bbb' }}>
                                                                                        Add at least two artifacts to the study before creating tasks.
                                                                                    </small>
                                                                                )}

                                                                                <label className="form-label">Rating Criteria (optional)</label>
                                                                                <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', padding: '0.75rem', border: '1px solid #444', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                                                                                    {(studyCriteria[study.id] || []).map(criterion => {
                                                                                        const criterionId = Number(criterion.id);
                                                                                        const currentIds = (getTaskForm(study.id).ratingCriterionIds || []).map(id => Number(id));
                                                                                        return (
                                                                                            <label key={criterion.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start', cursor: 'pointer' }}>
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    checked={currentIds.includes(criterionId)}
                                                                                                    onChange={(e) => {
                                                                                                        if (e.target.checked) {
                                                                                                            handleTaskFieldChange(study.id, 'ratingCriterionIds', [...currentIds, criterionId]);
                                                                                                        } else {
                                                                                                            handleTaskFieldChange(study.id, 'ratingCriterionIds', currentIds.filter(id => id !== criterionId));
                                                                                                        }
                                                                                                    }}
                                                                                                />
                                                                                                <span>{criterion.name}</span>
                                                                                            </label>
                                                                                        );
                                                                                    })}
                                                                                </div>

                                                                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                                                                                    <button
                                                                                        type="button"
                                                                                        className="form-button form-button-submit"
                                                                                        onClick={() => handleSaveTaskDefinition(study.id)}
                                                                                        disabled={(studyArtifacts[study.id] || []).length < 2}
                                                                                    >
                                                                                        {getTaskForm(study.id).taskId ? 'Update Task' : 'Create Task'}
                                                                                    </button>
                                                                                    {getTaskForm(study.id).taskId && (
                                                                                        <button
                                                                                            type="button"
                                                                                            className="form-button form-button-secondary"
                                                                                            onClick={() => resetTaskForm(study.id)}
                                                                                        >
                                                                                            Cancel Edit
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </PermissionGate>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {editTab === 'eligibility' && (
                                                        <div className="dashboard-card">
                                                            <div className="card-header">
                                                                <h3>Eligibility Rules & Enrollment</h3>
                                                            </div>
                                                            <div className="card-content">
                                                                {configBusy && <p>Loading eligibility...</p>}
                                                                {!configBusy && (
                                                                    <>
                                                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                                                            {['eligible', 'ineligible', 'pending'].map(key => (
                                                                                <div key={key} className="badge badge-role" style={{ fontSize: '0.85rem' }}>
                                                                                    {key.charAt(0).toUpperCase() + key.slice(1)}: {getEligibilityStats(study.id)[key] || 0}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <PermissionGate permissions={permissions} check="canEditDraft">
                                                                            <div className="form-grid">
                                                                                <label className="form-label">Approval Mode</label>
                                                                                <select
                                                                                    className="form-select"
                                                                                    value={getEligibilityForm(study.id).approvalMode}
                                                                                    onChange={(e) => handleEligibilityModeChange(study.id, e.target.value)}
                                                                                >
                                                                                    <option value="AUTO">Auto-approve eligible participants</option>
                                                                                    <option value="MANUAL">Manual review before enrollment</option>
                                                                                </select>
                                                                            </div>
                                                                            <div style={{ marginTop: '1rem' }}>
                                                                                {(getEligibilityForm(study.id).rulesets || []).length === 0 && (
                                                                                    <p style={{ fontStyle: 'italic', color: '#888' }}>No rules defined. All participants are eligible.</p>
                                                                                )}
                                                                                {(getEligibilityForm(study.id).rulesets || []).map((ruleset, idx) => (
                                                                                    <div key={`ruleset-${idx}`} className="dashboard-card" style={{ marginBottom: '1rem', background: '#1c1f2b' }}>
                                                                                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                            <div>
                                                                                                <strong>Group {idx + 1}</strong>
                                                                                                <select
                                                                                                    className="form-select"
                                                                                                    style={{ marginLeft: '0.5rem' }}
                                                                                                    value={ruleset.logic}
                                                                                                    onChange={(e) => updateEligibilityForm(study.id, form => {
                                                                                                        form.rulesets[idx].logic = e.target.value;
                                                                                                        return form;
                                                                                                    })}
                                                                                                >
                                                                                                    <option value="AND">All rules (AND)</option>
                                                                                                    <option value="OR">Any rule (OR)</option>
                                                                                                </select>
                                                                                            </div>
                                                                                            <button
                                                                                                className="form-button form-button-secondary"
                                                                                                type="button"
                                                                                                onClick={() => handleRemoveRuleset(study.id, idx)}
                                                                                            >
                                                                                                Remove Group
                                                                                            </button>
                                                                                        </div>
                                                                                        <div className="card-content">
                                                                                            {(ruleset.rules || []).length === 0 && (
                                                                                                <p style={{ color: '#aaa' }}>No rules yet.</p>
                                                                                            )}
                                                                                            {ruleset.rules?.map((rule, ruleIdx) => (
                                                                                                <div key={`rule-${idx}-${ruleIdx}`} className="form-grid" style={{ marginBottom: '0.75rem', alignItems: 'center' }}>
                                                                                                    <select
                                                                                                        className="form-select"
                                                                                                        value={rule.field}
                                                                                                        onChange={(e) => handleRuleFieldChange(study.id, idx, ruleIdx, 'field', e.target.value)}
                                                                                                    >
                                                                                                        {eligibilityFieldOptions.map(opt => (
                                                                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                                                        ))}
                                                                                                    </select>
                                                                                                    <select
                                                                                                        className="form-select"
                                                                                                        value={rule.operator}
                                                                                                        onChange={(e) => handleRuleFieldChange(study.id, idx, ruleIdx, 'operator', e.target.value)}
                                                                                                    >
                                                                                                        {(operatorOptions[rule.field] || []).map(opt => (
                                                                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                                                        ))}
                                                                                                    </select>
                                                                                                    <input
                                                                                                        className="form-input"
                                                                                                        type={rule.field === 'yearsOfExperience' ? 'number' : 'text'}
                                                                                                        value={rule.value}
                                                                                                        onChange={(e) => handleRuleFieldChange(study.id, idx, ruleIdx, 'value', e.target.value)}
                                                                                                        placeholder={rule.field === 'skills' ? 'e.g., React' : 'e.g., 3'}
                                                                                                    />
                                                                                                    <button
                                                                                                        className="form-button form-button-secondary"
                                                                                                        type="button"
                                                                                                        onClick={() => handleRemoveRule(study.id, idx, ruleIdx)}
                                                                                                    >
                                                                                                        Remove
                                                                                                    </button>
                                                                                                </div>
                                                                                            ))}
                                                                                            <button
                                                                                                className="form-button form-button-secondary"
                                                                                                type="button"
                                                                                                onClick={() => handleAddRule(study.id, idx)}
                                                                                            >
                                                                                                Add Rule
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                                <button
                                                                                    className="form-button form-button-secondary"
                                                                                    type="button"
                                                                                    onClick={() => handleAddRuleset(study.id)}
                                                                                >
                                                                                    Add Rule Group
                                                                                </button>
                                                                                <button
                                                                                    className="form-button form-button-submit"
                                                                                    type="button"
                                                                                    style={{ marginLeft: '0.75rem' }}
                                                                                    onClick={() => handleSaveEligibility(study.id)}
                                                                                    disabled={eligibilitySaving[study.id]}
                                                                                >
                                                                                    {eligibilitySaving[study.id] ? 'Saving...' : 'Save Eligibility'}
                                                                                </button>
                                                                            </div>
                                                                        </PermissionGate>
                                                                        {getEligibilityForm(study.id).approvalMode === 'MANUAL' && (
                                                                            <div style={{ marginTop: '1.5rem' }}>
                                                                                <h4>Pending Enrollment Requests</h4>
                                                                                <PermissionGate permissions={permissions} check="canInvite">
                                                                                    {getPendingRequests(study.id).length === 0 ? (
                                                                                        <p style={{ color: '#aaa' }}>No pending requests.</p>
                                                                                    ) : (
                                                                                        <table className="artifact-list-table">
                                                                                            <thead>
                                                                                                <tr>
                                                                                                    <th>Participant</th>
                                                                                                    <th>Email</th>
                                                                                                    <th>Requested</th>
                                                                                                    <th>Actions</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody>
                                                                                                {getPendingRequests(study.id).map(request => (
                                                                                                    <tr key={request.id}>
                                                                                                        <td>{request.participantName}</td>
                                                                                                        <td>{request.participantEmail}</td>
                                                                                                        <td>{new Date(request.createdAt).toLocaleString()}</td>
                                                                                                        <td style={{ display: 'flex', gap: '0.5rem' }}>
                                                                                                            <button
                                                                                                                className="form-button form-button-submit"
                                                                                                                type="button"
                                                                                                                onClick={() => handleApproveEnrollment(study.id, request.id)}
                                                                                                            >
                                                                                                                Approve
                                                                                                            </button>
                                                                                                            <button
                                                                                                                className="form-button form-button-secondary"
                                                                                                                type="button"
                                                                                                                onClick={() => handleRejectEnrollment(study.id, request.id)}
                                                                                                            >
                                                                                                                Reject
                                                                                                            </button>
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                ))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    )}
                                                                                </PermissionGate>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}


                                            <div className="dashboard-card" style={{ marginTop: '1.5rem' }}>
                                                <div className="card-header">
                                                    <h3>Publish Readiness</h3>
                                                </div>
                                                <div className="card-content">
                                                    {configBusy && <p>Checking requirements...</p>}
                                                    {!configBusy && (
                                                        <>
                                                            {!readiness ? (
                                                                <p>Readiness data not available.</p>
                                                            ) : readiness.ready ? (
                                                                <p style={{ color: '#86f484' }}>
                                                                    All requirements satisfied. Next draft version: v{readiness.draftVersionNumber}.
                                                                </p>
                                                            ) : (
                                                                <>
                                                                    <p style={{ color: '#f5c17c' }}>
                                                                        Complete the following before publishing draft v{readiness.draftVersionNumber}:
                                                                    </p>
                                                                    <ul style={{ paddingLeft: '1.5rem' }}>
                                                                        {readinessErrors.map((err, idx) => (
                                                                            <li key={idx}>{err}</li>
                                                                        ))}
                                                                    </ul>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="dashboard-card" style={{ marginTop: '1.5rem' }}>
                                                <div className="card-header">
                                                    <h3>Published Versions</h3>
                                                </div>
                                                <div className="card-content">
                                                    {configBusy && <p>Loading version history...</p>}
                                                    {!configBusy && (
                                                        <>
                                                            {versionsForStudy.length === 0 ? (
                                                                <p>No versions have been published yet.</p>
                                                            ) : (
                                                                versionsForStudy.map(version => {
                                                                    const key = `${study.id}-${version.versionNumber}`;
                                                                    const detail = versionDetails[key];
                                                                    return (
                                                                        <div key={version.versionNumber} style={{ marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.75rem' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                                <div>
                                                                                    <strong>Version {version.versionNumber}</strong> • Published {version.publishedAt ? new Date(version.publishedAt).toLocaleString() : 'pending'}
                                                                                </div>
                                                                                <button
                                                                                    className="form-button form-button-secondary"
                                                                                    style={{ width: 'auto' }}
                                                                                    onClick={() => handleToggleVersionDetail(study.id, version.versionNumber)}
                                                                                >
                                                                                    {detail ? 'Hide Snapshot' : 'View Snapshot'}
                                                                                </button>
                                                                            </div>
                                                                            {detail && (
                                                                                <pre className="form-textarea" style={{ marginTop: '0.5rem', maxHeight: '240px', overflow: 'auto' }}>
                                                                                    {JSON.stringify(detail.config, null, 2)}
                                                                                </pre>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
};

export default ManageStudies;