import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
import { login as loginApi, registerStudentAccount } from '../api/auth';
import {
  freezeAssessment as freezeAssessmentApi,
  getMarks,
  unfreezeAssessment as unfreezeAssessmentApi,
  updateMark as updateMarkApi,
} from '../api/marks';
import { createQuery as createQueryApi, getQueries, respondToQuery as respondToQueryApi } from '../api/queries';
import { getSubmissions, markSubmissionManual } from '../api/submissions';
import { listStudents, listTeachers } from '../api/users';

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
  fetchUsers: () => Promise<void>;
  registerStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  registerTeacher: (teacher: Omit<Teacher, 'id'>) => Promise<void>;
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

  const extractRollNumber = (email: string) => {
    const prefix = email.split('@')[0] ?? '';
    const digits = prefix.match(/\d+/)?.[0];
    return digits ?? '';
  };

  const fetchUsers = useCallback(async () => {
    try {
      const [studentUsers, teacherUsers] = await Promise.all([listStudents(), listTeachers()]);
      setStudents(
        studentUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          password: '',
          rollNumber: extractRollNumber(user.email),
          branch: user.branch ?? 'IT',
          section: user.section ?? '1',
          batch: user.batch ?? '2024',
        }))
      );
      setTeachers(
        teacherUsers.map(user => {
          const branchLabel = user.branch && user.section ? `${user.branch}-${user.section}` : 'IT-1';
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            password: '',
            branches: [branchLabel],
            department: 'Information Technology',
          };
        })
      );
    } catch (error) {
      console.error('Failed to load users', error);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const registerStudent = async (student: Omit<Student, 'id'>) => {
    await registerStudentAccount({
      name: student.name,
      email: student.email,
      password: student.password,
      branch: student.branch,
      section: student.section,
      batch: student.batch,
    });
    await fetchUsers();
  };

  const registerTeacher = async (_teacher: Omit<Teacher, 'id'>) => {
    throw new Error('Teacher signup is disabled. Ask an admin to create teacher accounts.');
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
        rollNumber: extractRollNumber(user.email),
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
        fetchUsers,
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
