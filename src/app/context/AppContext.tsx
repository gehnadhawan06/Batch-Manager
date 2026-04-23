import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  approveAttendance as approveAttendanceApi,
  cancelAttendance as cancelAttendanceApi,
  denyAttendance as denyAttendanceApi,
  getAttendanceRecords,
  markAttendance as markAttendanceApi,
} from '../api/attendance';
import {
  createAssignment as createAssignmentApi,
  getAssignments,
  submitAssignment as submitAssignmentApi,
} from '../api/assignments';
import { login as loginApi } from '../api/auth';
import {
  freezeAssessment as freezeAssessmentApi,
  getMarks,
  unfreezeAssessment as unfreezeAssessmentApi,
  updateMark as updateMarkApi,
} from '../api/marks';
import { createQuery as createQueryApi, getQueries, respondToQuery as respondToQueryApi } from '../api/queries';
import { getSubmissions, markSubmissionManual } from '../api/submissions';

export interface Student {
  id: number;
  name: string;
  email: string;
  password: string;
  rollNumber: string;
  branch: string;
  section: string;
  batch: string;
}

export interface Teacher {
  id: number;
  name: string;
  email: string;
  password: string;
  branches: string[];
  department: string;
}

export interface AttendanceRecord {
  id: number;
  studentId: number;
  date: string;
  time: string;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  ipAddress: string;
  deviceId: string;
  proxyWarning?: boolean;
  branch: string;
  section: string;
}

export interface Assignment {
  id: number;
  title: string;
  description: string;
  deadline: string;
  createdAt: string;
  branch: string;
  section: string;
  subject: string;
}

export interface Submission {
  id?: number;
  assignmentId: number;
  studentId: number;
  status: 'not_submitted' | 'submitted_file' | 'submitted_manual';
  fileName?: string;
  submittedAt?: string;
}

export interface Mark {
  id: number;
  studentId: number;
  assessment: string;
  marks: number | null;
  totalMarks: number;
  branch: string;
  section: string;
  subject: string;
  isFrozen: boolean;
}

export interface Query {
  id: number;
  studentId: number;
  markId: number;
  queryText: string;
  response?: string;
  status: 'open' | 'closed';
  createdAt: string;
}

interface AppContextType {
  students: Student[];
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  assignments: Assignment[];
  submissions: Submission[];
  marks: Mark[];
  queries: Query[];
  registerStudent: (student: Omit<Student, 'id'>) => void;
  registerTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  loginStudent: (email: string, password: string) => Promise<Student | null>;
  loginTeacher: (email: string, password: string) => Promise<Teacher | null>;
  markAttendance: (studentId: number, branch: string, section: string) => Promise<void>;
  approveAttendance: (recordId: number) => Promise<void>;
  denyAttendance: (recordId: number) => Promise<void>;
  cancelAttendance: (recordId: number) => Promise<void>;
  fetchAttendanceRecords: (filters: { branch?: string; section?: string; studentId?: number }) => Promise<void>;
  fetchAssignments: (filters: { branch?: string; section?: string }) => Promise<void>;
  fetchSubmissions: (filters: { assignmentId?: number; studentId?: number }) => Promise<void>;
  fetchMarks: (filters: { branch?: string; section?: string; studentId?: number }) => Promise<void>;
  fetchQueries: (filters: { studentId?: number; markId?: number }) => Promise<void>;
  createAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt'>) => Promise<void>;
  submitAssignment: (assignmentId: number, studentId: number, fileName: string) => Promise<void>;
  markAsSubmittedManual: (assignmentId: number, studentId: number) => Promise<void>;
  updateMark: (markId: number, marks: number | null) => Promise<void>;
  freezeAssessment: (assessment: string, branch: string, section: string) => Promise<void>;
  unfreezeAssessment: (assessment: string, branch: string, section: string) => Promise<void>;
  createQuery: (query: Omit<Query, 'id' | 'createdAt'>) => Promise<void>;
  respondToQuery: (queryId: number, response: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [queries, setQueries] = useState<Query[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('batchManagerData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setStudents(data.students || []);
      setTeachers(data.teachers || []);
      setAttendanceRecords(data.attendanceRecords || []);
      setAssignments(data.assignments || []);
      setSubmissions(data.submissions || []);
      setMarks(data.marks || []);
      setQueries(data.queries || []);
    } else {
      // Initialize with default data
      initializeDefaultData();
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    const data = {
      students,
      teachers,
      attendanceRecords,
      assignments,
      submissions,
      marks,
      queries,
    };
    localStorage.setItem('batchManagerData', JSON.stringify(data));
  }, [students, teachers, attendanceRecords, assignments, submissions, marks, queries]);

  const initializeDefaultData = () => {
    // Generate students for IT1 and IT2
    const generatedStudents = generateStudents();
    setStudents(generatedStudents);

    // Add default teacher
    const defaultTeacher: Teacher = {
      id: 1,
      name: 'Prof. Praveen',
      email: 'praveen@igdtuw.ac.in',
      password: 'teacher123',
      branches: ['IT-1', 'IT-2'],
      department: 'Information Technology',
    };
    setTeachers([defaultTeacher]);

    // Generate attendance records for last 15 classes
    const generatedAttendance = generateAttendanceHistory(generatedStudents);
    setAttendanceRecords(generatedAttendance);

    // Generate initial assignments
    const initialAssignments = generateInitialAssignments();
    setAssignments(initialAssignments);

    // Generate initial submissions
    const initialSubmissions = generateInitialSubmissions(generatedStudents, initialAssignments);
    setSubmissions(initialSubmissions);

    // Generate initial marks
    const initialMarks = generateInitialMarks(generatedStudents);
    setMarks(initialMarks);
  };

  const registerStudent = (student: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...student,
      id: students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1,
    };
    setStudents([...students, newStudent]);

    // Create initial submissions for existing assignments
    const studentAssignments = assignments.filter(
      a => a.branch === student.branch && a.section === student.section
    );
    const newSubmissions = studentAssignments.map(assignment => ({
      assignmentId: assignment.id,
      studentId: newStudent.id,
      status: 'not_submitted' as const,
    }));
    setSubmissions([...submissions, ...newSubmissions]);

    // Create initial marks
    const assessments = [
      { name: 'Mid-term Exam', total: 100, subject: 'Data Structures', frozen: false },
      { name: 'Quiz 1', total: 20, subject: 'Data Structures', frozen: false },
      { name: 'Assignment 1', total: 50, subject: 'Web Development', frozen: false },
    ];

    const newMarks = assessments.map((assessment, index) => ({
      id: marks.length > 0 ? Math.max(...marks.map(m => m.id)) + index + 1 : index + 1,
      studentId: newStudent.id,
      assessment: assessment.name,
      marks: null,
      totalMarks: assessment.total,
      branch: student.branch,
      section: student.section,
      subject: assessment.subject,
      isFrozen: assessment.frozen,
    }));
    setMarks([...marks, ...newMarks]);
  };

  const registerTeacher = (teacher: Omit<Teacher, 'id'>) => {
    const newTeacher: Teacher = {
      ...teacher,
      id: teachers.length > 0 ? Math.max(...teachers.map(t => t.id)) + 1 : 1,
    };
    setTeachers([...teachers, newTeacher]);
  };

  const loginStudent = async (email: string, password: string): Promise<Student | null> => {
    try {
      const user = await loginApi(email, password);
      if (user.role !== 'STUDENT') {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        password: '',
        rollNumber: '',
        branch: user.branch ?? 'IT',
        section: user.section ?? '1',
        batch: user.batch ?? '2024',
      };
    } catch {
      return null;
    }
  };

  const loginTeacher = async (email: string, password: string): Promise<Teacher | null> => {
    try {
      const user = await loginApi(email, password);
      if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
        return null;
      }

      const branchLabel = user.branch && user.section ? `${user.branch}-${user.section}` : 'IT-1';
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        password: '',
        branches: [branchLabel],
        department: 'Information Technology',
      };
    } catch {
      return null;
    }
  };

  const fetchAttendanceRecords = useCallback(async (filters: { branch?: string; section?: string; studentId?: number }) => {
    try {
      const records = await getAttendanceRecords(filters);
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Failed to load attendance records', error);
    }
  }, []);

  const markAttendance = async (studentId: number, branch: string, section: string) => {
    try {
      const record = await markAttendanceApi({
        studentId,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        deviceId: `device-${Math.random().toString(36).substring(7)}`,
      });
      setAttendanceRecords(prev => [record, ...prev.filter(r => r.id !== record.id)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark attendance';
      alert(message);
    }
  };

  const approveAttendance = async (recordId: number) => {
    try {
      const updated = await approveAttendanceApi(recordId);
      setAttendanceRecords(prev => prev.map(r => (r.id === recordId ? updated : r)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve attendance';
      alert(message);
    }
  };

  const denyAttendance = async (recordId: number) => {
    try {
      const updated = await denyAttendanceApi(recordId);
      setAttendanceRecords(prev => prev.map(r => (r.id === recordId ? updated : r)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deny attendance';
      alert(message);
    }
  };

  const cancelAttendance = async (recordId: number) => {
    try {
      const updated = await cancelAttendanceApi(recordId);
      setAttendanceRecords(prev => prev.map(r => (r.id === recordId ? updated : r)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel attendance';
      alert(message);
    }
  };

  const fetchAssignments = useCallback(async (filters: { branch?: string; section?: string }) => {
    try {
      const data = await getAssignments(filters);
      setAssignments(data);
    } catch (error) {
      console.error('Failed to load assignments', error);
    }
  }, []);

  const fetchSubmissions = useCallback(async (filters: { assignmentId?: number; studentId?: number }) => {
    try {
      const data = await getSubmissions(filters);
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to load submissions', error);
    }
  }, []);

  const createAssignment = async (assignment: Omit<Assignment, 'id' | 'createdAt'>) => {
    try {
      const created = await createAssignmentApi(assignment);
      setAssignments(prev => [created, ...prev.filter(a => a.id !== created.id)]);
      await fetchSubmissions({});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create assignment';
      alert(message);
    }
  };

  const submitAssignment = async (assignmentId: number, studentId: number, fileName: string) => {
    try {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment && new Date() > new Date(assignment.deadline)) {
        alert('Cannot submit after deadline!');
        return;
      }

      await submitAssignmentApi(assignmentId, { studentId, fileUrl: fileName });
      await fetchSubmissions({ studentId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit assignment';
      alert(message);
    }
  };

  const markAsSubmittedManual = async (assignmentId: number, studentId: number) => {
    try {
      const existing = submissions.find(s => s.assignmentId === assignmentId && s.studentId === studentId);
      if (!existing) {
        alert('Submission record not found');
        return;
      }
      if (!existing.id) {
        alert('Submission id missing');
        return;
      }
      await markSubmissionManual(existing.id);
      await fetchSubmissions({ assignmentId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark manual submission';
      alert(message);
    }
  };

  const fetchMarks = useCallback(async (filters: { branch?: string; section?: string; studentId?: number }) => {
    try {
      const data = await getMarks(filters);
      setMarks(
        data.map(mark => ({
          ...mark,
          totalMarks: mark.total,
        }))
      );
    } catch (error) {
      console.error('Failed to load marks', error);
    }
  }, []);

  const fetchQueries = useCallback(async (filters: { studentId?: number; markId?: number }) => {
    try {
      const data = await getQueries(filters);
      setQueries(
        data.map(query => ({
          ...query,
          response: query.response ?? undefined,
        }))
      );
    } catch (error) {
      console.error('Failed to load queries', error);
    }
  }, []);

  const updateMark = async (markId: number, newMarks: number | null) => {
    try {
      const updated = await updateMarkApi(markId, newMarks);
      setMarks(prev =>
        prev.map(mark =>
          mark.id === markId
            ? { ...mark, marks: updated.marks, totalMarks: updated.total, isFrozen: updated.isFrozen }
            : mark
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update mark';
      alert(message);
    }
  };

  const freezeAssessment = async (assessment: string, branch: string, section: string) => {
    try {
      await freezeAssessmentApi(assessment, branch, section);
      await fetchMarks({ branch, section });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to freeze assessment';
      alert(message);
    }
  };

  const unfreezeAssessment = async (assessment: string, branch: string, section: string) => {
    try {
      await unfreezeAssessmentApi(assessment, branch, section);
      await fetchMarks({ branch, section });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unfreeze assessment';
      alert(message);
    }
  };

  const createQuery = async (query: Omit<Query, 'id' | 'createdAt'>) => {
    try {
      const created = await createQueryApi({
        studentId: query.studentId,
        markId: query.markId,
        queryText: query.queryText,
      });
      setQueries(prev => [{ ...created, response: created.response ?? undefined }, ...prev.filter(q => q.id !== created.id)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create query';
      alert(message);
    }
  };

  const respondToQuery = async (queryId: number, response: string) => {
    try {
      const updated = await respondToQueryApi(queryId, response);
      setQueries(prev =>
        prev.map(query =>
          query.id === queryId
            ? { ...updated, response: updated.response ?? undefined }
            : query
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to respond to query';
      alert(message);
    }
  };

  return (
    <AppContext.Provider
      value={{
        students,
        teachers,
        attendanceRecords,
        assignments,
        submissions,
        marks,
        queries,
        registerStudent,
        registerTeacher,
        loginStudent,
        loginTeacher,
        markAttendance,
        approveAttendance,
        denyAttendance,
        cancelAttendance,
        fetchAttendanceRecords,
        fetchAssignments,
        fetchSubmissions,
        fetchMarks,
        fetchQueries,
        createAssignment,
        submitAssignment,
        markAsSubmittedManual,
        updateMark,
        freezeAssessment,
        unfreezeAssessment,
        createQuery,
        respondToQuery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

// Helper functions to generate initial data
function generateStudents(): Student[] {
  const students: Student[] = [];
  const firstNames = [
    'Aadhya', 'Aanya', 'Ananya', 'Anushka', 'Diya', 'Isha', 'Jiya', 'Kavya', 'Khushi', 'Myra',
    'Navya', 'Pari', 'Prisha', 'Saanvi', 'Sara', 'Shanaya', 'Siya', 'Tara', 'Vanya', 'Zara',
    'Aditi', 'Aisha', 'Anjali', 'Avni', 'Divya', 'Kiara', 'Mira', 'Neha', 'Riya', 'Shreya',
    'Simran', 'Tanvi', 'Trisha', 'Vidya', 'Zoya', 'Anika', 'Ishita', 'Mehak', 'Naina', 'Palak',
  ];

  const lastNames = [
    'Sharma', 'Verma', 'Kumar', 'Singh', 'Gupta', 'Patel', 'Reddy', 'Rao', 'Desai', 'Joshi',
    'Agarwal', 'Mehta', 'Chopra', 'Malhotra', 'Kapoor', 'Bhat', 'Nair', 'Iyer', 'Menon', 'Pillai',
  ];

  let id = 1;

  // IT-1: 60 students
  for (let i = 1; i <= 60; i++) {
    const rollNumber = String(i).padStart(3, '0');
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    students.push({
      id: id++,
      name: `${firstName} ${lastName}`,
      email: `${rollNumber}btit24@igdtuw.ac.in`,
      password: 'student123',
      rollNumber,
      branch: 'IT',
      section: '1',
      batch: '2024',
    });
  }

  // IT-2: 55 students
  for (let i = 1; i <= 55; i++) {
    const rollNumber = String(i).padStart(3, '0');
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    students.push({
      id: id++,
      name: `${firstName} ${lastName}`,
      email: `${rollNumber}btit24sec2@igdtuw.ac.in`,
      password: 'student123',
      rollNumber,
      branch: 'IT',
      section: '2',
      batch: '2024',
    });
  }

  return students;
}

function generateAttendanceHistory(students: Student[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  let id = 1;

  // Generate attendance for last 15 class days
  for (let dayOffset = 15; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    students.forEach(student => {
      // 80% attendance rate
      if (Math.random() < 0.8) {
        const hour = 9 + Math.floor(Math.random() * 2);
        const minute = Math.floor(Math.random() * 60);

        records.push({
          id: id++,
          studentId: student.id,
          date: dateStr,
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          status: dayOffset === 0 ? 'pending' : 'approved',
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          deviceId: `device-${Math.random().toString(36).substring(7)}`,
          proxyWarning: Math.random() < 0.05,
          branch: student.branch,
          section: student.section,
        });
      }
    });
  }

  return records;
}

function generateInitialAssignments(): Assignment[] {
  return [
    {
      id: 1,
      title: 'Binary Search Tree Implementation',
      description: 'Implement a balanced BST with insert, delete, and search operations.',
      deadline: '2026-04-30T23:59',
      createdAt: '2026-04-15',
      branch: 'IT',
      section: '1',
      subject: 'Data Structures',
    },
    {
      id: 2,
      title: 'Full Stack CRUD Application',
      description: 'Build a complete CRUD application using React and Node.js.',
      deadline: '2026-05-05T23:59',
      createdAt: '2026-04-18',
      branch: 'IT',
      section: '1',
      subject: 'Web Development',
    },
    {
      id: 3,
      title: 'Binary Search Tree Implementation',
      description: 'Implement a balanced BST with insert, delete, and search operations.',
      deadline: '2026-04-30T23:59',
      createdAt: '2026-04-15',
      branch: 'IT',
      section: '2',
      subject: 'Data Structures',
    },
    {
      id: 4,
      title: 'Full Stack CRUD Application',
      description: 'Build a complete CRUD application using React and Node.js.',
      deadline: '2026-05-05T23:59',
      createdAt: '2026-04-18',
      branch: 'IT',
      section: '2',
      subject: 'Web Development',
    },
  ];
}

function generateInitialSubmissions(students: Student[], assignments: Assignment[]): Submission[] {
  const submissions: Submission[] = [];

  students.forEach(student => {
    const studentAssignments = assignments.filter(
      a => a.branch === student.branch && a.section === student.section
    );

    studentAssignments.forEach(assignment => {
      const random = Math.random();
      if (random < 0.5) {
        submissions.push({
          assignmentId: assignment.id,
          studentId: student.id,
          status: 'submitted_file',
          fileName: `assignment_${student.rollNumber}.pdf`,
          submittedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } else {
        submissions.push({
          assignmentId: assignment.id,
          studentId: student.id,
          status: 'not_submitted',
        });
      }
    });
  });

  return submissions;
}

function generateInitialMarks(students: Student[]): Mark[] {
  const marks: Mark[] = [];
  let id = 1;

  const assessments = [
    { name: 'Mid-term Exam', total: 100, subject: 'Data Structures', frozen: true },
    { name: 'Quiz 1', total: 20, subject: 'Data Structures', frozen: true },
    { name: 'Quiz 2', total: 20, subject: 'Data Structures', frozen: false },
    { name: 'Assignment 1', total: 50, subject: 'Web Development', frozen: false },
  ];

  students.forEach(student => {
    assessments.forEach(assessment => {
      const markValue = assessment.frozen
        ? Math.floor(Math.random() * 40) + 50
        : Math.random() < 0.3 ? null : Math.floor(Math.random() * 40) + 50;

      marks.push({
        id: id++,
        studentId: student.id,
        assessment: assessment.name,
        marks: markValue,
        totalMarks: assessment.total,
        branch: student.branch,
        section: student.section,
        subject: assessment.subject,
        isFrozen: assessment.frozen,
      });
    });
  });

  return marks;
}
