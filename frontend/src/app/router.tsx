import { DataPage } from './DataPage'
import { ProtectedRoute } from './auth/AuthProvider'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { Login, NotFound, Register } from '../pages/AuthPages'
import { Notifications, Profile, Settings } from '../pages/CommonPages'
import { Availability } from '../pages/Availability'
import { MentorCatalog } from '../pages/MentorCatalog'
import { MentorDashboard } from '../pages/MentorDashboard'
import { MentorDetails } from '../pages/MentorDetails'
import { MentorMeetings } from '../pages/MentorMeetings'
import { MyMentor } from '../pages/MyMentor'
import { MyStudents } from '../pages/MyStudents'
import { StudentDashboard } from '../pages/StudentDashboard'
import { StudentDetails } from '../pages/StudentDetails'
import { StudentMeetings } from '../pages/StudentMeetings'
import { NotesPage } from '../pages/NotesPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="/student/dashboard" element={<DataPage mode="student"><StudentDashboard /></DataPage>} />
        <Route path="/student/mentors" element={<DataPage mode="student"><MentorCatalog /></DataPage>} />
        <Route path="/student/mentors/:mentorId" element={<DataPage mode="student"><MentorDetails /></DataPage>} />
        <Route path="/student/my-mentor" element={<DataPage mode="student"><MyMentor /></DataPage>} />
        <Route path="/student/meetings" element={<DataPage mode="student"><StudentMeetings /></DataPage>} />
        <Route path="/student/notes" element={<DataPage mode="student"><NotesPage /></DataPage>} />
        <Route path="/mentor/dashboard" element={<DataPage mode="mentor"><MentorDashboard /></DataPage>} />
        <Route path="/mentor/students" element={<DataPage mode="mentor"><MyStudents /></DataPage>} />
        <Route path="/mentor/students/:studentId" element={<DataPage mode="mentor"><StudentDetails /></DataPage>} />
        <Route path="/mentor/meetings" element={<DataPage mode="mentor"><MentorMeetings /></DataPage>} />
        <Route path="/mentor/availability" element={<DataPage mode="mentor"><Availability /></DataPage>} />
        <Route path="/mentor/notes" element={<DataPage mode="mentor"><NotesPage /></DataPage>} />
        <Route path="/profile" element={<DataPage><Profile /></DataPage>} />
        <Route path="/notifications" element={<DataPage><Notifications /></DataPage>} />
        <Route path="/settings" element={<DataPage><Settings /></DataPage>} />
      </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
