import { useEffect, useState, useMemo } from 'react';
import { MessageSquare, Send, CheckCircle, Clock } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface QueryInboxProps {
  branch: string;
  section: string;
}

export function QueryInbox({ branch, section }: QueryInboxProps) {
  const { students, marks, queries, fetchMarks, fetchQueries, respondToQuery } = useAppContext();
  const [responseText, setResponseText] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    void fetchMarks({ branch, section });
    void fetchQueries({});
  }, [branch, section, fetchMarks, fetchQueries]);

  const branchQueries = useMemo(() => {
    const branchStudentIds = students
      .filter(s => s.branch === branch && s.section === section)
      .map(s => s.id);

    return queries.filter(q => branchStudentIds.includes(q.studentId));
  }, [queries, students, branch, section]);

  const handleRespondToQuery = (queryId: number) => {
    const response = responseText[queryId];
    if (!response) {
      alert('Please enter a response');
      return;
    }

    void respondToQuery(queryId, response);
    setResponseText({ ...responseText, [queryId]: '' });
  };

  const openQueries = branchQueries.filter(q => q.status === 'open');
  const closedQueries = branchQueries.filter(q => q.status === 'closed');

  const getStudentName = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    return student ? `${student.name} (${student.rollNumber})` : 'Unknown Student';
  };

  const getMarkDetails = (markId: number) => {
    const mark = marks.find(m => m.id === markId);
    return mark ? `${mark.assessment} • ${mark.marks}/${mark.totalMarks}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-yellow-800">Open Queries</p>
              <p className="text-4xl font-bold text-yellow-900 mt-2">{openQueries.length}</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Resolved</p>
              <p className="text-4xl font-bold text-emerald-900 mt-2">{closedQueries.length}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Open Queries ({openQueries.length})</h2>
        {openQueries.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
            <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No open queries</p>
          </div>
        ) : (
          <div className="space-y-4">
            {openQueries.map(query => (
              <div key={query.id} className="border-2 border-yellow-200 rounded-xl p-5 bg-gradient-to-br from-white to-yellow-50 shadow-md">
                <div className="flex items-start gap-3 mb-4">
                  <MessageSquare className="w-6 h-6 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-gray-900">{getStudentName(query.studentId)}</p>
                      <span className="text-xs text-gray-500 font-medium">
                        {new Date(query.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-emerald-700 font-semibold mb-3">
                      {getMarkDetails(query.markId)}
                    </p>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-800">{query.queryText}</p>
                    </div>
                  </div>
                </div>
                <div className="ml-9 space-y-3">
                  <textarea
                    value={responseText[query.id] || ''}
                    onChange={(e) => setResponseText({ ...responseText, [query.id]: e.target.value })}
                    placeholder="Type your response..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-sm"
                    rows={3}
                  />
                  <button
                    onClick={() => handleRespondToQuery(query.id)}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md font-semibold"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send & Close Query</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Closed Queries ({closedQueries.length})</h2>
        <div className="space-y-3">
          {closedQueries.map(query => (
            <div key={query.id} className="border-2 border-gray-200 rounded-xl p-5 bg-gray-50">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-gray-900">{getStudentName(query.studentId)}</p>
                    <span className="text-xs text-gray-500 font-medium">
                      {new Date(query.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-emerald-700 font-semibold mb-3">
                    {getMarkDetails(query.markId)}
                  </p>
                  <div className="space-y-3">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                      <p className="text-xs text-gray-500 font-semibold mb-1">Student Query:</p>
                      <p className="text-sm text-gray-800">{query.queryText}</p>
                    </div>
                    {query.response && (
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-lg border-2 border-emerald-200">
                        <p className="text-xs text-emerald-700 font-semibold mb-1">Your Response:</p>
                        <p className="text-sm text-gray-800">{query.response}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
