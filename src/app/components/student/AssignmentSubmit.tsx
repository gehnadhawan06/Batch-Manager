import { useEffect, useMemo } from 'react';
import { Upload, FileText, Clock, CheckCircle, XCircle, Calendar, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface AssignmentSubmitProps {
  studentId: number;
  branch: string;
  section: string;
}

export function AssignmentSubmit({ studentId, branch, section }: AssignmentSubmitProps) {
  const { assignments, submissions, submitAssignment, fetchAssignments, fetchSubmissions } = useAppContext();

  useEffect(() => {
    void fetchAssignments({ branch, section });
    void fetchSubmissions({ studentId });
  }, [branch, section, studentId, fetchAssignments, fetchSubmissions]);

  const studentAssignments = useMemo(() => {
    return assignments.filter(a => a.branch === branch && a.section === section);
  }, [assignments, branch, section]);

  const studentSubmissions = useMemo(() => {
    return submissions.filter(s => s.studentId === studentId);
  }, [submissions, studentId]);

  const handleFileUpload = (assignmentId: number, file: File) => {
    void submitAssignment(assignmentId, studentId, file.name);
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();

    if (diff < 0) return { text: 'Past due', isPast: true, isUrgent: false };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 1) return { text: `${days} days left`, isPast: false, isUrgent: false };
    if (days === 1) return { text: '1 day left', isPast: false, isUrgent: true };
    if (hours > 1) return { text: `${hours} hours left`, isPast: false, isUrgent: true };
    return { text: 'Due soon!', isPast: false, isUrgent: true };
  };

  const submittedCount = studentSubmissions.filter(s => s.status !== 'not_submitted').length;
  const pendingCount = studentSubmissions.filter(s => s.status === 'not_submitted').length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Submitted</p>
              <p className="text-4xl font-bold text-emerald-900 mt-2">{submittedCount}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-yellow-800">Pending</p>
              <p className="text-4xl font-bold text-yellow-900 mt-2">{pendingCount}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-yellow-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800">Total</p>
              <p className="text-4xl font-bold text-blue-900 mt-2">{studentAssignments.length}</p>
            </div>
            <FileText className="w-10 h-10 text-blue-600" />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900">Assignments</h2>

      <div className="space-y-4">
        {studentAssignments.map(assignment => {
          const submission = studentSubmissions.find(s => s.assignmentId === assignment.id);
          const timeStatus = getTimeRemaining(assignment.deadline);

          return (
            <div
              key={assignment.id}
              className={`border-2 rounded-xl p-6 transition-all ${
                timeStatus.isUrgent && submission?.status === 'not_submitted'
                  ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-6 h-6 text-emerald-600" />
                    <h3 className="text-xl font-bold text-gray-900">{assignment.title}</h3>
                  </div>
                  <p className="text-sm text-emerald-700 font-semibold mb-3">{assignment.subject}</p>
                  <p className="text-sm text-gray-700 mb-4">{assignment.description}</p>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 font-medium">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {new Date(assignment.deadline).toLocaleString()}</span>
                    </div>
                    <div className={`flex items-center gap-2 font-bold ${
                      timeStatus.isPast ? 'text-red-600' : timeStatus.isUrgent ? 'text-yellow-600' : 'text-emerald-600'
                    }`}>
                      <Clock className="w-4 h-4" />
                      <span>{timeStatus.text}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-gray-200 pt-4">
                {submission?.status === 'not_submitted' && !timeStatus.isPast && (
                  <div>
                    <label
                      htmlFor={`file-upload-${assignment.id}`}
                      className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all cursor-pointer w-fit shadow-md hover:shadow-lg font-semibold"
                    >
                      <Upload className="w-5 h-5" />
                      <span>Upload File</span>
                    </label>
                    <input
                      id={`file-upload-${assignment.id}`}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(assignment.id, file);
                      }}
                    />
                  </div>
                )}

                {submission?.status === 'not_submitted' && timeStatus.isPast && (
                  <div className="flex items-center gap-3 text-red-600 p-4 bg-red-50 rounded-xl border-2 border-red-200">
                    <XCircle className="w-6 h-6" />
                    <div>
                      <p className="font-bold text-lg">Not Submitted</p>
                      <p className="text-sm">Deadline has passed - submission no longer accepted</p>
                    </div>
                  </div>
                )}

                {submission?.status === 'submitted_file' && (
                  <div className="flex items-center gap-3 text-emerald-600 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
                    <CheckCircle className="w-6 h-6" />
                    <div>
                      <p className="font-bold text-lg">Submitted Successfully</p>
                      <p className="text-sm font-medium">File: {submission.fileName}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Submitted on {new Date(submission.submittedAt!).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {submission?.status === 'submitted_manual' && (
                  <div className="flex items-center gap-3 text-blue-600 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                    <CheckCircle className="w-6 h-6" />
                    <div>
                      <p className="font-bold text-lg">Submitted (Manual)</p>
                      <p className="text-sm">Teacher marked as submitted</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(submission.submittedAt!).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
