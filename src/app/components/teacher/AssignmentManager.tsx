import { useEffect, useState, useMemo } from 'react';
import { Plus, FileText, Clock, CheckCircle, Edit, Upload } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface AssignmentManagerProps {
  branch: string;
  section: string;
}

export function AssignmentManager({ branch, section }: AssignmentManagerProps) {
  const {
    students,
    assignments,
    submissions,
    marks,
    fetchAssignments,
    fetchSubmissions,
    fetchMarks,
    createAssignment,
    markAsSubmittedManual,
    updateMark,
  } = useAppContext();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    deadline: '',
    subject: '',
    maxMarks: 100,
  });
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingMarkId, setEditingMarkId] = useState<number | null>(null);
  const [markDrafts, setMarkDrafts] = useState<Record<number, string>>({});

  const branchAssignments = useMemo(() => {
    return assignments.filter(a => a.branch === branch && a.section === section);
  }, [assignments, branch, section]);

  const branchStudents = useMemo(() => {
    return students.filter(s => s.branch === branch && s.section === section);
  }, [students, branch, section]);

  useEffect(() => {
    void fetchAssignments({ branch, section });
    void fetchSubmissions({});
    void fetchMarks({ branch, section });
  }, [branch, section, fetchAssignments, fetchSubmissions, fetchMarks]);

  useEffect(() => {
    if (branchAssignments.length > 0 && !selectedAssignment) {
      setSelectedAssignment(branchAssignments[0].id);
    }
  }, [branchAssignments, selectedAssignment]);

  const handleCreateAssignment = async () => {
    setCreateError(null);
    if (!newAssignment.title || !newAssignment.subject || !newAssignment.description || !newAssignment.deadline) {
      setCreateError('Please fill title, subject, description, and deadline');
      return;
    }

    if (newAssignment.description.trim().length < 3) {
      setCreateError('Description should be at least 3 characters');
      return;
    }

    const isoDeadline = new Date(newAssignment.deadline).toISOString();
    if (Number.isNaN(Date.parse(isoDeadline))) {
      setCreateError('Please choose a valid deadline');
      return;
    }

    try {
      await createAssignment({
        ...newAssignment,
        deadline: isoDeadline,
        branch,
        section,
      });
      void fetchAssignments({ branch, section });
      void fetchSubmissions({});
      void fetchMarks({ branch, section });
      setNewAssignment({ title: '', description: '', deadline: '', subject: '', maxMarks: 100 });
      setShowCreateForm(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create assignment');
    }
  };

  const selectedAssignmentData = branchAssignments.find(a => a.id === selectedAssignment);
  const assignmentSubmissions = useMemo(() => {
    return submissions.filter(s => s.assignmentId === selectedAssignment);
  }, [submissions, selectedAssignment]);

  const branchMarks = useMemo(() => marks.filter(m => m.branch === branch && m.section === section), [marks, branch, section]);

  const getAssignmentMark = (assignmentTitle: string, studentId: number) =>
    branchMarks.find(m => m.assessment === assignmentTitle && m.studentId === studentId);

  const getStudentName = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    return student ? `${student.name} (${student.rollNumber})` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assignment Manager</h2>
          <p className="text-sm text-gray-600 mt-1">{branch}-{section}</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Create Assignment</span>
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl border-2 border-emerald-200">
          <h3 className="font-bold text-gray-900 mb-4 text-lg">New Assignment</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                  placeholder="Enter assignment title"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  value={newAssignment.subject}
                  onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                  placeholder="e.g., Data Structures"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                value={newAssignment.description}
                onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                rows={3}
                placeholder="Enter assignment description"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Deadline *</label>
              <input
                type="datetime-local"
                value={newAssignment.deadline}
                onChange={(e) => setNewAssignment({ ...newAssignment, deadline: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Max Marks *</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={newAssignment.maxMarks}
                onChange={(e) => setNewAssignment({ ...newAssignment, maxMarks: Number(e.target.value) || 100 })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  void handleCreateAssignment();
                }}
                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md font-semibold"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
            {createError && <p className="text-sm font-medium text-red-600">{createError}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branchAssignments.map(assignment => {
          const isPast = new Date(assignment.deadline) < new Date();
          const submissionCount = submissions.filter(s => s.assignmentId === assignment.id && s.status !== 'not_submitted').length;
          const totalStudents = branchStudents.length;
          const percentage = totalStudents > 0 ? ((submissionCount / totalStudents) * 100).toFixed(0) : '0';

          return (
            <button
              key={assignment.id}
              onClick={() => setSelectedAssignment(assignment.id)}
              className={`p-5 text-left rounded-xl border-2 transition-all ${
                selectedAssignment === assignment.id
                  ? 'border-emerald-600 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <FileText className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 mb-1">{assignment.title}</h3>
                  <p className="text-xs text-emerald-700 font-semibold mb-2">{assignment.subject}</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{assignment.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                <Clock className="w-3 h-3" />
                <span>{new Date(assignment.deadline).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${isPast ? 'text-red-600' : 'text-emerald-600'}`}>
                  {submissionCount}/{totalStudents} submitted
                </span>
                <span className="text-xs font-semibold text-gray-500">{percentage}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedAssignmentData && (
        <div className="bg-white border-2 border-emerald-100 rounded-xl p-6 shadow-lg">
          <h3 className="font-bold text-gray-900 mb-4 text-lg">
            Submissions for "{selectedAssignmentData.title}"
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {branchStudents.map(student => {
              const submission = assignmentSubmissions.find(s => s.studentId === student.id);
              const mark = selectedAssignmentData ? getAssignmentMark(selectedAssignmentData.title, student.id) : undefined;
              const isSubmitted = submission?.status === 'submitted_file' || submission?.status === 'submitted_manual';
              const fileLooksLikeUrl = Boolean(submission?.fileName?.startsWith('http://') || submission?.fileName?.startsWith('https://'));

              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-300 transition-colors bg-white"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{student.name} ({student.rollNumber})</p>
                    {submission?.status === 'submitted_file' && (
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        {fileLooksLikeUrl ? (
                          <a className="text-emerald-700 underline" href={submission.fileName} target="_blank" rel="noreferrer">
                            Open submitted file
                          </a>
                        ) : (
                          <span>File: {submission.fileName}</span>
                        )}
                        <span>• {new Date(submission.submittedAt!).toLocaleString()}</span>
                      </p>
                    )}
                    {submission?.status === 'submitted_manual' && (
                      <p className="text-sm text-blue-600 font-medium mt-1">
                        Manual submission • {new Date(submission.submittedAt!).toLocaleString()}
                      </p>
                    )}
                    {submission?.status === 'not_submitted' && (
                      <p className="text-sm text-red-600 font-medium mt-1">Not submitted</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isSubmitted && mark && (
                      editingMarkId === mark.id ? (
                        <>
                          <input
                            type="number"
                            min={0}
                            max={mark.totalMarks}
                            value={markDrafts[mark.id] ?? (mark.marks?.toString() ?? '')}
                            onChange={(e) => setMarkDrafts((prev) => ({ ...prev, [mark.id]: e.target.value }))}
                            className="w-20 px-2 py-1 border-2 border-emerald-500 rounded-lg text-sm"
                          />
                          <button
                            onClick={() => {
                              const raw = (markDrafts[mark.id] ?? '').trim();
                              const val = raw === '' ? null : Number(raw);
                              if (val !== null && (!Number.isFinite(val) || val < 0 || val > mark.totalMarks)) return;
                              void updateMark(mark.id, val).then(() => {
                                setEditingMarkId(null);
                                void fetchMarks({ branch, section });
                              });
                            }}
                            className="px-3 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingMarkId(mark.id);
                            setMarkDrafts((prev) => ({ ...prev, [mark.id]: mark.marks?.toString() ?? '' }));
                          }}
                          className="px-3 py-1 text-xs font-semibold rounded-lg border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                        >
                          {mark.marks === null ? `Give Marks / ${mark.totalMarks}` : `Marks: ${mark.marks}/${mark.totalMarks}`}
                        </button>
                      )
                    )}
                    {submission?.status === 'not_submitted' ? (
                      <button
                        onClick={() => {
                          void markAsSubmittedManual(selectedAssignmentData.id, student.id);
                        }}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors text-sm font-semibold"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Mark Submitted</span>
                      </button>
                    ) : submission?.status === 'submitted_file' ? (
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm">File Uploaded</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-blue-700 font-semibold">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm">Manual</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
