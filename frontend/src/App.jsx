
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import './App.css'


import ResearcherDashboard from './pages/dashboards/ResearcherDashboard'
import ParticipantDashboard from './pages/dashboards/ParticipantDashboard'
import AdminDashboard from './pages/dashboards/AdminDashboard'
import ReviewerDashboard from './pages/dashboards/ReviewerDashboard'
import StudyDetailStats from './pages/dashboards/StudyDetailStats'


import CreateQuiz from './pages/CreateQuiz'
import EditQuiz from './pages/EditQuiz'
import ManageQuizzes from './pages/ManageQuizzes'
import ManageStudies from './pages/ManageStudies'
import ViewSubmissions from './pages/ViewSubmissions'
import TakeQuiz from './pages/TakeQuiz'
import ManageStudyTasks from './pages/ManageStudyTasks'
import StudyCollaborators from './pages/StudyCollaborators'
import TaskEvaluationRouter from './pages/TaskEvaluationRouter'
import UploadArtifacts from './pages/UploadArtifacts.jsx'
import EvaluationProgress from './pages/EvaluationProgress'
import EvaluationProgressBlindedMode from './pages/EvaluationProgressBlindedMode'
import Submission from './pages/Submission'
import CreateQuestionnaire from './pages/CreateQuestionnaire'
import TakeQuestionnaire from './pages/TakeQuestionnaire'
import StudyAuditLog from './pages/StudyAuditLog'
import Participants from './pages/Participants'
import Profile from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';


import DashboardLayout from './components/DashboardLayout'

function App() {
  const { isAuthenticated, user } = useAuth()

  return (
    <div className="App">
      {!isAuthenticated && (
        <nav className="app-nav">
          <Link to="/login" className="nav-link">Log in</Link>
          <Link to="/register" className="nav-link">Register</Link>
        </nav>
      )}

      <Routes>

        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <Login />
            ) : (
              <Navigate
                to={
                  user.role === 'RESEARCHER' ? '/researcher-dashboard'
                  : user.role === 'REVIEWER' ? '/reviewer-dashboard'
                  : user.role === 'ADMIN' ? '/admin-dashboard'
                  : '/participant-dashboard'
                }
                replace
              />
            )
          }
        />
        <Route
          path="/register"
          element={
            !isAuthenticated ? <Register /> : <Navigate to="/participant-dashboard" replace />
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              user.role === 'RESEARCHER' ? <Navigate to="/researcher-dashboard" replace />
              : user.role === 'REVIEWER' ? <Navigate to="/reviewer-dashboard" replace />
              : user.role === 'ADMIN' ? <Navigate to="/admin-dashboard" replace />
              : <Navigate to="/participant-dashboard" replace />
            )
          }
        />




        <Route element={<ProtectedRoute allowedRole="ADMIN" />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin-dashboard/study/:studyId" element={<StudyDetailStats />} />
            <Route path="/admin-dashboard/profile" element={<Profile />} />
          </Route>
        </Route>


        <Route element={<ProtectedRoute allowedRole="RESEARCHER" />}>
          <Route element={<DashboardLayout />}>
            <Route path="/researcher-dashboard" element={<ResearcherDashboard />} />
            <Route path="/researcher-dashboard/study/:studyId" element={<StudyDetailStats />} />
            <Route path="/researcher-dashboard/create-quiz" element={<CreateQuiz />} />
            <Route path="/researcher-dashboard/edit-quiz/:quizId" element={<EditQuiz />} />
            <Route path="/researcher-dashboard/create-questionnaire" element={<CreateQuestionnaire />} />
            <Route path="/researcher-dashboard/manage-quizzes" element={<ManageQuizzes />} />
            <Route path="/researcher-dashboard/manage-studies" element={<ManageStudies />} />
            <Route path="/researcher-dashboard/study/:studyId/submissions" element={<ViewSubmissions />} />
            <Route path="/researcher-dashboard/study/:studyId/tasks" element={<ManageStudyTasks />} />
            <Route path="/researcher-dashboard/study/:studyId/collaborators" element={<StudyCollaborators />} />
            <Route path="/researcher-dashboard/study/:studyId/audit-log" element={<StudyAuditLog />} />
            <Route path="/researcher-dashboard/artifacts" element={<UploadArtifacts />} />
            <Route path="/researcher-dashboard/participants" element={<Participants />} />
            <Route path="/researcher-dashboard/profile" element={<Profile />} />


            <Route path="/researcher-dashboard/evaluation/:taskId" element={<EvaluationProgress />} />
            <Route path="/researcher-dashboard/evaluation-blinded/:taskId" element={<EvaluationProgressBlindedMode />} />
          </Route>
        </Route>


        <Route element={<ProtectedRoute allowedRole="REVIEWER" />}>
          <Route element={<DashboardLayout />}>
            <Route path="/reviewer-dashboard" element={<ReviewerDashboard />} />
            <Route path="/reviewer-dashboard/study/:studyId" element={<StudyDetailStats />} />
            <Route path="/reviewer-dashboard/profile" element={<Profile />} />
          </Route>
        </Route>


        <Route element={<ProtectedRoute allowedRole="PARTICIPANT" />}>
          <Route element={<DashboardLayout />}>
            <Route path="/participant-dashboard" element={<ParticipantDashboard />} />
            <Route path="/participant-dashboard/quiz/:studyId" element={<TakeQuiz />} />
            <Route path="/participant-dashboard/questionnaire/:studyId" element={<TakeQuestionnaire />} />
            <Route path="/participant-dashboard/task/:taskId" element={<TaskEvaluationRouter />} />
            <Route path="/participant-dashboard/evaluation/:taskId" element={<EvaluationProgress />} />
            <Route path="/participant-dashboard/evaluation-blinded/:taskId" element={<EvaluationProgressBlindedMode />} />
            <Route path="/participant-dashboard/submission" element={<Submission />} />
            <Route path="/participant-dashboard/profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </div>
  )
}

export default App
