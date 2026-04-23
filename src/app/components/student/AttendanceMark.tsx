import { useEffect, useState, useMemo } from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface AttendanceMarkProps {
  studentId: number;
  branch: string;
  section: string;
}

export function AttendanceMark({ studentId, branch, section }: AttendanceMarkProps) {
  const { attendanceRecords, markAttendance, fetchAttendanceRecords } = useAppContext();
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    void fetchAttendanceRecords({ studentId, branch, section });
  }, [studentId, branch, section, fetchAttendanceRecords]);

  const records = useMemo(() => {
    return attendanceRecords.filter(r => r.studentId === studentId);
  }, [attendanceRecords, studentId]);

  const today = new Date().toISOString().split('T')[0];
  const todayRecord = records.find(r => r.date === today);

  const handleMarkPresent = () => {
    setIsMarking(true);
    setTimeout(() => {
      void markAttendance(studentId, branch, section).finally(() => {
        setIsMarking(false);
      });
    }, 1000);
  };

  // Calculate attendance stats
  const approvedRecords = records.filter(r => r.status === 'approved');
  const totalClasses = records.length;
  const attendancePercentage = totalClasses > 0
    ? ((approvedRecords.length / totalClasses) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Attendance %</p>
              <p className="text-4xl font-bold text-emerald-900 mt-2">{attendancePercentage}%</p>
            </div>
            <TrendingUp className="w-10 h-10 text-emerald-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800">Classes Attended</p>
              <p className="text-4xl font-bold text-blue-900 mt-2">{approvedRecords.length}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-800">Total Classes</p>
              <p className="text-4xl font-bold text-purple-900 mt-2">{totalClasses}</p>
            </div>
            <CalendarIcon className="w-10 h-10 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Mark Today's Attendance */}
      <div className="bg-gradient-to-br from-emerald-100 via-teal-100 to-green-100 border-2 border-emerald-300 rounded-xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-emerald-700" />
          Mark Today's Attendance
        </h2>
        <p className="text-sm text-gray-700 mb-6 font-medium">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        {!todayRecord ? (
          <button
            onClick={handleMarkPresent}
            disabled={isMarking}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 font-bold text-lg"
          >
            <CheckCircle className="w-6 h-6" />
            <span>{isMarking ? 'Marking Present...' : 'Mark Present'}</span>
          </button>
        ) : (
          <div className="flex items-start gap-4 p-5 bg-white rounded-xl border-2 border-gray-200">
            {todayRecord.status === 'pending' && (
              <>
                <Clock className="w-7 h-7 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-bold text-yellow-900 text-lg">Pending Approval</p>
                  <p className="text-sm text-yellow-700 mt-1">Your attendance is awaiting teacher approval</p>
                </div>
              </>
            )}
            {todayRecord.status === 'approved' && (
              <>
                <CheckCircle className="w-7 h-7 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900 text-lg">Approved</p>
                  <p className="text-sm text-emerald-700 mt-1">Your attendance has been approved by the teacher</p>
                </div>
              </>
            )}
            {todayRecord.status === 'denied' && (
              <>
                <XCircle className="w-7 h-7 text-red-600 mt-0.5" />
                <div>
                  <p className="font-bold text-red-900 text-lg">Denied</p>
                  <p className="text-sm text-red-700 mt-1">Your attendance was not approved</p>
                </div>
              </>
            )}
            {todayRecord.status === 'cancelled' && (
              <>
                <AlertCircle className="w-7 h-7 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-bold text-orange-900 text-lg">Cancelled</p>
                  <p className="text-sm text-orange-700 mt-1">Your attendance was cancelled by the teacher</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Attendance History */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-emerald-600" />
          Attendance History
        </h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {records.map(record => (
            <div
              key={record.id}
              className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl bg-white hover:border-emerald-300 transition-all"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Marked at {record.time}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {record.status === 'pending' && (
                  <span className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                    <Clock className="w-4 h-4" />
                    <span>Pending</span>
                  </span>
                )}
                {record.status === 'approved' && (
                  <span className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    <span>Approved</span>
                  </span>
                )}
                {record.status === 'denied' && (
                  <span className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                    <XCircle className="w-4 h-4" />
                    <span>Denied</span>
                  </span>
                )}
                {record.status === 'cancelled' && (
                  <span className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Cancelled</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
