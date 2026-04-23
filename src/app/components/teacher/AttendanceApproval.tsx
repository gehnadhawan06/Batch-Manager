import { useEffect, useState, useMemo } from 'react';
import { Check, X, Trash2, AlertTriangle, TrendingUp, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface AttendanceApprovalProps {
  branch: string;
  section: string;
}

export function AttendanceApproval({ branch, section }: AttendanceApprovalProps) {
  const {
    students,
    attendanceRecords,
    approveAttendance,
    denyAttendance,
    cancelAttendance,
    fetchAttendanceRecords,
  } = useAppContext();

  const [selectedDate, setSelectedDate] = useState<string>('today');

  useEffect(() => {
    void fetchAttendanceRecords({ branch, section });
  }, [branch, section, fetchAttendanceRecords]);

  // Get unique dates from attendance records
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(
      attendanceRecords
        .filter(r => r.branch === branch && r.section === section)
        .map(r => r.date)
    )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return dates;
  }, [attendanceRecords, branch, section]);

  const todayDate = new Date().toISOString().split('T')[0];

  const filteredRecords = useMemo(() => {
    const dateToFilter = selectedDate === 'today' ? todayDate : selectedDate;

    return attendanceRecords.filter(
      r => r.branch === branch && r.section === section && r.date === dateToFilter
    );
  }, [attendanceRecords, branch, section, selectedDate, todayDate]);

  const approveAll = () => {
    const confirm = window.confirm('Are you sure you want to approve all pending attendance records for this date?');
    if (confirm) {
      filteredRecords
        .filter(r => r.status === 'pending')
        .forEach(r => {
          void approveAttendance(r.id);
        });
    }
  };

  const pendingRecords = filteredRecords.filter(r => r.status === 'pending');
  const approvedRecords = filteredRecords.filter(r => r.status === 'approved');
  const branchStudents = students.filter(s => s.branch === branch && s.section === section);

  const displayDate = selectedDate === 'today' ? todayDate : selectedDate;
  const todayApproved = approvedRecords.length;
  const attendancePercentage = branchStudents.length > 0
    ? ((todayApproved / branchStudents.length) * 100).toFixed(1)
    : '0';

  const getStudentName = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    return student ? `${student.name} (${student.rollNumber})` : 'Unknown Student';
  };

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-emerald-700" />
          <label className="font-bold text-gray-900">Filter by Date:</label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border-2 border-emerald-300 rounded-lg focus:border-emerald-500 focus:outline-none font-semibold bg-white"
          >
            <option value="today">Today ({todayDate})</option>
            {availableDates.filter(d => d !== todayDate).map(date => (
              <option key={date} value={date}>
                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">Pending</p>
              <p className="text-3xl font-bold text-yellow-900 mt-1">{pendingRecords.length}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-yellow-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-800">Attendance %</p>
              <p className="text-3xl font-bold text-emerald-900 mt-1">{attendancePercentage}%</p>
            </div>
            <TrendingUp className="w-10 h-10 text-emerald-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Present</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {todayApproved}/{branchStudents.length}
              </p>
            </div>
            <CalendarIcon className="w-10 h-10 text-blue-600" />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Pending Approval ({pendingRecords.length})
          </h2>
          {pendingRecords.length > 0 && (
            <button
              onClick={approveAll}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>Approve All</span>
            </button>
          )}
        </div>

        {pendingRecords.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
            <Check className="w-16 h-16 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No pending attendance records for this date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRecords.map(record => (
              <div
                key={record.id}
                className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                  record.proxyWarning
                    ? 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-md'
                    : 'border-gray-200 bg-white hover:shadow-md'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-bold text-gray-900">{getStudentName(record.studentId)}</p>
                    {record.proxyWarning && (
                      <div className="flex items-center gap-1 text-xs text-yellow-800 bg-yellow-200 px-3 py-1 rounded-full font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Proxy Warning: Same IP/Device detected</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 font-medium">{record.date} at {record.time}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    IP: {record.ipAddress} • Device: {record.deviceId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      void approveAttendance(record.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => {
                      void denyAttendance(record.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <X className="w-4 h-4" />
                    <span>Deny</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Approved Records ({approvedRecords.length})
        </h2>
        {approvedRecords.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-gray-200">
            <p className="text-gray-500">No approved records for this date</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {approvedRecords.map(record => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow"
              >
                <div>
                  <p className="font-semibold text-gray-900">{getStudentName(record.studentId)}</p>
                  <p className="text-sm text-gray-600">{record.date} at {record.time}</p>
                </div>
                <button
                  onClick={() => {
                    void cancelAttendance(record.id);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
