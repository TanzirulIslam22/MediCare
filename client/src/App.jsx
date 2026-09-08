import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Spinner } from './components/ui';
import LoginPage from './pages/LoginPage';
import { useAuth } from './context/AuthContext';

import PatientDashboard from './pages/patient/Dashboard';
import BookAppointment from './pages/patient/BookAppointment';
import MyAppointments from './pages/patient/MyAppointments';
import MedicalRecords from './pages/patient/MedicalRecords';
import Prescriptions from './pages/patient/Prescriptions';
import Payments from './pages/patient/Payments';

import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorSchedule from './pages/doctor/Schedule';
import DoctorAppointments from './pages/doctor/Appointments';
import DoctorQueue from './pages/doctor/Queue';

import ReceptionDashboard from './pages/reception/Dashboard';
import ReceptionAppointments from './pages/reception/Appointments';
import ReceptionQueue from './pages/reception/Queue';
import ReceptionPatients from './pages/reception/Patients';
import ReceptionPayments from './pages/reception/Payments';

import PharmacyDashboard from './pages/pharmacy/Dashboard';
import Medicines from './pages/pharmacy/Medicines';
import PharmacyPrescriptions from './pages/pharmacy/Prescriptions';

import AdminAnalytics from './pages/admin/Analytics';
import AdminUsers from './pages/admin/Users';
import AdminDoctors from './pages/admin/Doctors';
import AdminDepartments from './pages/admin/Departments';
import AdminReports from './pages/admin/Reports';
import AdminAudit from './pages/admin/AuditLogs';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;

  const homeFor = {
    PATIENT: '/patient',
    DOCTOR: '/doctor',
    RECEPTIONIST: '/reception',
    PHARMACIST: '/pharmacy',
    ADMIN: '/admin',
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor[user.role]} replace /> : <LoginPage />} />

      <Route path="/" element={user ? <Navigate to={homeFor[user.role]} replace /> : <Navigate to="/login" replace />} />

      <Route element={<ProtectedRoute roles={['PATIENT']} />}>
        <Route path="/patient" element={<PatientDashboard />} />
        <Route path="/patient/book" element={<BookAppointment />} />
        <Route path="/patient/appointments" element={<MyAppointments />} />
        <Route path="/patient/records" element={<MedicalRecords />} />
        <Route path="/patient/prescriptions" element={<Prescriptions />} />
        <Route path="/patient/payments" element={<Payments />} />
      </Route>

      <Route element={<ProtectedRoute roles={['DOCTOR']} />}>
        <Route path="/doctor" element={<DoctorDashboard />} />
        <Route path="/doctor/schedule" element={<DoctorSchedule />} />
        <Route path="/doctor/appointments" element={<DoctorAppointments />} />
        <Route path="/doctor/queue" element={<DoctorQueue />} />
      </Route>

      <Route element={<ProtectedRoute roles={['RECEPTIONIST']} />}>
        <Route path="/reception" element={<ReceptionDashboard />} />
        <Route path="/reception/appointments" element={<ReceptionAppointments />} />
        <Route path="/reception/queue" element={<ReceptionQueue />} />
        <Route path="/reception/patients" element={<ReceptionPatients />} />
        <Route path="/reception/payments" element={<ReceptionPayments />} />
      </Route>

      <Route element={<ProtectedRoute roles={['PHARMACIST']} />}>
        <Route path="/pharmacy" element={<PharmacyDashboard />} />
        <Route path="/pharmacy/medicines" element={<Medicines />} />
        <Route path="/pharmacy/prescriptions" element={<PharmacyPrescriptions />} />
      </Route>

      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route path="/admin" element={<AdminAnalytics />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/doctors" element={<AdminDoctors />} />
        <Route path="/admin/departments" element={<AdminDepartments />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/audit" element={<AdminAudit />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
