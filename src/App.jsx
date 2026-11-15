import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import GlobalBackground from './components/GlobalBackground'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import OAuthSuccess from './pages/OAuthSuccess'
import StudentDashboard from './pages/StudentDashboard'
import CourseCatalog from './pages/CourseCatalog'
import SelectedCourses from './pages/SelectedCourses'
import RegistrationConfirmation from './pages/RegistrationConfirmation'
import AcademicRecord from './pages/AcademicRecord'
import Timetable from './pages/Timetable'
import WaitingList from './pages/WaitingList'
import AdminDashboard from './pages/AdminDashboard'
import ManageCourses from './pages/ManageCourses'
import AdminAccessControl from './pages/AdminAccessControl'
import AdminWaitlists from './pages/AdminWaitlists'
import AdminSettings from './pages/AdminSettings'
import AdminReports from './pages/AdminReports'
import FacultyDashboard from './pages/FacultyDashboard'
import FacultyCourseRoster from './pages/FacultyCourseRoster'
import FacultyProfile from './pages/FacultyProfile'

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <GlobalBackground />
        <div className="relative z-10 min-h-screen bg-transparent">
          <Routes>
            {/* Auth */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/oauth-success" element={<OAuthSuccess />} />

            {/* Student Portal Pages */}
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/catalog" element={<CourseCatalog />} />
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/selected-courses" element={<SelectedCourses />} />
            <Route path="/cart" element={<Navigate to="/selected-courses" replace />} />
            <Route path="/confirmation" element={<RegistrationConfirmation />} />
            <Route path="/record" element={<AcademicRecord />} />
            <Route path="/academic-record" element={<AcademicRecord />} />
            <Route path="/waitlist" element={<WaitingList />} />

            {/* Faculty Console Pages */}
            <Route path="/faculty" element={<Navigate to="/faculty/dashboard" replace />} />
            <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
            <Route path="/faculty/courses/:courseCode" element={<FacultyCourseRoster />} />
            <Route path="/faculty/roster" element={<FacultyCourseRoster />} />
            <Route path="/faculty/timetable" element={<Timetable />} />
            <Route path="/faculty/profile" element={<FacultyProfile />} />

            {/* Admin Console Pages */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/overview" element={<AdminDashboard />} />
            <Route path="/admin/courses" element={<ManageCourses />} />
            <Route path="/admin/waitlists" element={<AdminWaitlists />} />
            <Route path="/admin/access-control" element={<AdminAccessControl />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/settings" element={<AdminSettings />} />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </AppProvider>
    </AuthProvider>
  )
}
