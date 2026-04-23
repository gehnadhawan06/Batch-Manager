import { useEffect, useState, useMemo } from 'react';
import { Award, MessageSquare, Send, TrendingUp, Target, CheckCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface MarksViewProps {
  studentId: number;
  branch: string;
  section: string;
}

export function MarksView({ studentId, branch, section }: MarksViewProps) {
  const { marks, queries, fetchMarks, fetchQueries, createQuery } = useAppContext();

  const [showQueryForm, setShowQueryForm] = useState<number | null>(null);
  const [queryText, setQueryText] = useState('');

  useEffect(() => {
    void fetchMarks({ branch, section, studentId });
    void fetchQueries({ studentId });
  }, [branch, section, studentId, fetchMarks, fetchQueries]);

  const studentMarks = useMemo(() => {
    return marks.filter(m => m.studentId === studentId);
  }, [marks, studentId]);

  const studentQueries = useMemo(() => {
    return queries.filter(q => q.studentId === studentId);
  }, [queries, studentId]);

  const submitQuery = (markId: number) => {
    if (!queryText.trim()) {
      alert('Please enter your query');
      return;
    }

    void createQuery({
      studentId,
      markId,
      queryText,
      status: 'open',
    });

    setQueryText('');
    setShowQueryForm(null);
  };

  const totalMarks = studentMarks.reduce((sum, m) => sum + (m.marks || 0), 0);
  const totalPossible = studentMarks.reduce((sum, m) => sum + m.totalMarks, 0);
  const percentage = totalPossible > 0 ? ((totalMarks / totalPossible) * 100).toFixed(1) : '0.0';

  const gradedMarks = studentMarks.filter(m => m.marks !== null);
  const pendingMarks = studentMarks.filter(m => m.marks === null);

  return (
    <div className="space-y-6">
      {/* Overall Performance Card */}
      <div className="bg-gradient-to-br from-emerald-100 via-teal-100 to-green-100 border-2 border-emerald-300 rounded-xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-7 h-7 text-emerald-700" />
          Overall Performance
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-5 border-2 border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Overall Score</p>
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-5xl font-bold text-emerald-600">{percentage}%</p>
            <p className="text-sm text-gray-600 mt-2">
              {totalMarks} / {totalPossible} marks
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Graded</p>
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-5xl font-bold text-blue-600">{gradedMarks.length}</p>
            <p className="text-sm text-gray-600 mt-2">assessments</p>
          </div>

          <div className="bg-white rounded-xl p-5 border-2 border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Pending</p>
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-5xl font-bold text-yellow-600">{pendingMarks.length}</p>
            <p className="text-sm text-gray-600 mt-2">assessments</p>
          </div>
        </div>
      </div>

      {/* Assessment Details */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-6 h-6 text-emerald-600" />
          Assessment Details
        </h3>
        <div className="space-y-3">
          {studentMarks.map(mark => {
            const markQuery = studentQueries.find(q => q.markId === mark.id);
            const percentage = mark.marks !== null ? ((mark.marks / mark.totalMarks) * 100).toFixed(0) : null;

            return (
              <div
                key={mark.id}
                className="border-2 border-gray-200 rounded-xl p-5 bg-white hover:border-emerald-300 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Award className="w-6 h-6 text-emerald-600" />
                      <h4 className="font-bold text-gray-900 text-lg">{mark.assessment}</h4>
                      {mark.isFrozen && (
                        <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full">
                          Frozen
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-emerald-700 font-semibold">{mark.subject}</p>

                    {mark.marks !== null ? (
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-3xl font-bold text-gray-900">
                          {mark.marks} / {mark.totalMarks}
                        </span>
                        <span className={`text-xl font-bold px-4 py-2 rounded-lg ${
                          Number(percentage) >= 80 ? 'text-emerald-700 bg-emerald-100' :
                          Number(percentage) >= 60 ? 'text-yellow-700 bg-yellow-100' :
                          'text-red-700 bg-red-100'
                        }`}>
                          {percentage}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500 italic font-medium">Not graded yet</span>
                    )}
                  </div>
                  {mark.marks !== null && !markQuery && (
                    <button
                      onClick={() => setShowQueryForm(mark.id)}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-all text-sm font-semibold"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Raise Query</span>
                    </button>
                  )}
                </div>

                {showQueryForm === mark.id && (
                  <div className="mt-4 pt-4 border-t-2 border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Query</label>
                    <textarea
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      placeholder="Describe your concern about this assessment..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => submitQuery(mark.id)}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md font-semibold"
                      >
                        <Send className="w-4 h-4" />
                        <span>Submit Query</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowQueryForm(null);
                          setQueryText('');
                        }}
                        className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {markQuery && (
                  <div className="mt-4 pt-4 border-t-2 border-gray-200 space-y-3">
                    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                      <p className="text-xs text-blue-600 mb-2 font-bold">Your Query:</p>
                      <p className="text-sm text-gray-800">{markQuery.queryText}</p>
                    </div>
                    {markQuery.response && (
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-lg border-2 border-emerald-200">
                        <p className="text-xs text-emerald-700 mb-2 font-bold">Teacher's Response:</p>
                        <p className="text-sm text-gray-800">{markQuery.response}</p>
                      </div>
                    )}
                    {markQuery.status === 'open' && (
                      <p className="text-xs text-yellow-700 bg-yellow-100 px-3 py-2 rounded-lg inline-block font-semibold">
                        Query is awaiting teacher response
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
