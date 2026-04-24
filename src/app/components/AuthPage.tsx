import { useState } from 'react';
import { GraduationCap, Mail, Lock, User, BookOpen } from 'lucide-react';
import { useAppContext, Student, Teacher } from '../context/AppContext';

interface AuthPageProps {
  onLogin: (role: 'teacher' | 'student', user: Student | Teacher) => void;
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const { registerStudent, registerTeacher, loginStudent, loginTeacher } = useAppContext();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<'teacher' | 'student'>('student');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Student signup state
  const [signupName, setSignupName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [section, setSection] = useState('1');

  // Teacher signup state
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherBranches, setTeacherBranches] = useState<string[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'teacher') {
      const teacher = await loginTeacher(loginEmail, loginPassword);
      if (teacher) {
        onLogin('teacher', teacher);
      } else {
        alert('Invalid teacher credentials');
      }
    } else {
      const student = await loginStudent(loginEmail, loginPassword);
      if (student) {
        onLogin('student', student);
      } else {
        alert('Invalid student credentials');
      }
    }
  };

  const handleStudentSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signupName || !rollNumber || !section) {
      alert('Please fill all fields');
      return;
    }

    const email = `${rollNumber.toLowerCase()}btit24${section === '2' ? 'sec2' : ''}@igdtuw.ac.in`;

    try {
      await registerStudent({
        name: signupName,
        email,
        password: signupPassword,
        rollNumber,
        branch: 'IT',
        section,
        batch: '2024',
      });

      setMode('login');
      setLoginEmail(email);
      alert(`Account created!\nEmail: ${email}\n\nYou can now login.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create student account';
      alert(message);
    }
  };

  const handleTeacherSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teacherName || !teacherEmail || !teacherPassword || teacherBranches.length === 0) {
      alert('Please fill all fields and select at least one branch');
      return;
    }

    try {
      await registerTeacher({
        name: teacherName,
        email: teacherEmail,
        password: teacherPassword,
        branches: teacherBranches,
        department: 'Information Technology',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create teacher account';
      alert(message);
    }
  };

  const toggleBranch = (branch: string) => {
    if (teacherBranches.includes(branch)) {
      setTeacherBranches(teacherBranches.filter(b => b !== branch));
    } else {
      setTeacherBranches([...teacherBranches, branch]);
    }
  };

  const generateEmailPreview = () => {
    if (rollNumber && section) {
      return `${rollNumber.toLowerCase()}btit24${section === '2' ? 'sec2' : ''}@igdtuw.ac.in`;
    }
    return 'Your email will be auto-generated';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="text-center md:text-left space-y-6 p-8">
          <div className="inline-block p-4 bg-white rounded-2xl shadow-lg">
            <BookOpen className="w-16 h-16 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Batch Manager
            </h1>
            <p className="text-xl text-emerald-700 font-semibold mb-2">
              Indira Gandhi Delhi Technical University for Women
            </p>
            <p className="text-gray-600">
              Manage attendance, assignments, and academic records all in one place
            </p>
          </div>
          <div className="hidden md:block space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Track student attendance with smart approval system</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Submit and manage assignments with deadline enforcement</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>View marks and raise queries instantly</span>
            </div>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setRole('student')}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                role === 'student'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <GraduationCap className="w-5 h-5" />
              <span className="font-semibold">Student</span>
            </button>
            <button
              onClick={() => setRole('teacher')}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                role === 'teacher'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="font-semibold">Teacher</span>
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder={role === 'student' ? '001btit24@igdtuw.ac.in' : 'your.email@igdtuw.ac.in'}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg"
              >
                Sign In
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Demo: {role === 'student' ? '001btit24@igdtuw.ac.in' : 'praveen@igdtuw.ac.in'} / {role === 'student' ? 'student123' : 'teacher123'}
              </p>
            </form>
          ) : (
            <>
              {role === 'student' ? (
                <form onSubmit={handleStudentSignup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Roll No. *</label>
                      <input
                        type="text"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                        placeholder="001"
                        maxLength={3}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Section *</label>
                      <select
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                      >
                        <option value="1">IT-1</option>
                        <option value="2">IT-2</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-xs text-emerald-800 font-medium mb-1">Your College Email:</p>
                    <p className="text-sm text-emerald-900 font-mono">{generateEmailPreview()}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                        placeholder="Create a password"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg"
                  >
                    Create Student Account
                  </button>
                </form>
              ) : (
                <form onSubmit={handleTeacherSignup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                        placeholder="Prof. Your Name"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                        placeholder="your.email@igdtuw.ac.in"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                        placeholder="Create a password"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Branches *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['IT-1', 'IT-2'].map(branch => (
                        <button
                          key={branch}
                          type="button"
                          onClick={() => toggleBranch(branch)}
                          className={`p-3 rounded-lg border-2 transition-all font-semibold ${
                            teacherBranches.includes(branch)
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {branch}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg"
                  >
                    Create Teacher Account
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
