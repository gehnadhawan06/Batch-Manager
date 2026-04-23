import { useEffect, useState } from 'react';
import { AppProvider, useAppContext, Student, Teacher } from './context/AppContext';
import { AuthPage } from './components/AuthPage';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { logout, me, refreshAccessToken } from './api/auth';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<(Student | Teacher) & { role: 'student' | 'teacher' } | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const user = await me();
        if (user.role === 'TEACHER' || user.role === 'ADMIN') {
          const branchLabel = user.branch && user.section ? `${user.branch}-${user.section}` : 'IT-1';
          setCurrentUser({
            id: user.id,
            name: user.name,
            email: user.email,
            password: '',
            branches: [branchLabel],
            department: 'Information Technology',
            role: 'teacher',
          });
        } else {
          setCurrentUser({
            id: user.id,
            name: user.name,
            email: user.email,
            password: '',
            rollNumber: '',
            branch: user.branch ?? 'IT',
            section: user.section ?? '1',
            batch: user.batch ?? '2024',
            role: 'student',
          });
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    void restoreSession();
  }, []);

  const handleLogin = (role: 'teacher' | 'student', user: Student | Teacher) => {
    setCurrentUser({ ...user, role });
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
  };

  if (isBootstrapping) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading...</div>;
  }

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  if (currentUser.role === 'teacher') {
    const teacher = currentUser as Teacher;
    return (
      <TeacherDashboard
        teacherId={teacher.id}
        userName={teacher.name}
        branches={teacher.branches}
        onLogout={handleLogout}
      />
    );
  }

  const student = currentUser as Student;
  return (
    <StudentDashboard
      userName={student.name}
      studentId={student.id}
      branch={student.branch}
      section={student.section}
      onLogout={handleLogout}
    />
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
