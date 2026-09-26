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
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/mentors" element={<MentorCatalog />} />
        <Route path="/student/mentors/:mentorId" element={<MentorDetails />} />
        <Route path="/student/my-mentor" element={<MyMentor />} />
        <Route path="/student/meetings" element={<StudentMeetings />} />
        <Route path="/student/notes" element={<NotesPage />} />
        <Route path="/mentor/dashboard" element={<MentorDashboard />} />
        <Route path="/mentor/students" element={<MyStudents />} />
        <Route path="/mentor/students/:studentId" element={<StudentDetails />} />
        <Route path="/mentor/meetings" element={<MentorMeetings />} />
        <Route path="/mentor/availability" element={<Availability />} />
        <Route path="/mentor/notes" element={<NotesPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
