import { useEffect, useState, useMemo } from 'react';
import { Save, Lock, Unlock, Download, Search, Filter } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface MarksEntryProps {
  branch: string;
  section: string;
}

export function MarksEntry({ branch, section }: MarksEntryProps) {
  const {
    students,
    marks,
    fetchMarks,
    updateMark,
    freezeAssessment,
    unfreezeAssessment,
  } = useAppContext();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [selectedAssessment, setSelectedAssessment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void fetchMarks({ branch, section });
  }, [branch, section, fetchMarks]);

  const branchStudents = useMemo(() => {
    return students.filter(s => s.branch === branch && s.section === section);
  }, [students, branch, section]);

  const branchMarks = useMemo(() => {
    return marks.filter(m => m.branch === branch && m.section === section);
  }, [marks, branch, section]);

  const assessments = useMemo(() => {
    return Array.from(new Set(branchMarks.map(m => m.assessment)));
  }, [branchMarks]);

  const filteredAssessments = selectedAssessment === 'all' ? assessments : [selectedAssessment];

  const startEditing = (id: number, currentValue: number | null) => {
    const mark = branchMarks.find(m => m.id === id);
    if (mark?.isFrozen) {
      alert('This assessment is frozen and cannot be edited!');
      return;
    }
    setEditingId(id);
    setTempValue(currentValue?.toString() || '');
  };

  const saveMarks = (id: number) => {
    const value = tempValue === '' ? null : Number(tempValue);
    void updateMark(id, value);
    setEditingId(null);
  };

  const handleFreezeAssessment = (assessment: string) => {
    const unfrozenCount = branchMarks.filter(m => m.assessment === assessment && !m.isFrozen).length;
    if (unfrozenCount === 0) {
      alert('This assessment is already frozen!');
      return;
    }

    const confirm = window.confirm(
      `Are you sure you want to freeze "${assessment}"?\n\nThis will lock all marks for this assessment and prevent further editing.`
    );

    if (confirm) {
      void freezeAssessment(assessment, branch, section);
    }
  };

  const handleUnfreezeAssessment = (assessment: string) => {
    const confirm = window.confirm(
      `Are you sure you want to unfreeze "${assessment}"?\n\nThis will allow editing of marks again.`
    );

    if (confirm) {
      void unfreezeAssessment(assessment, branch, section);
    }
  };

  const exportToCSV = () => {
    let csv = 'Student Name,Roll Number,';
    csv += assessments.join(',') + '\n';

    branchStudents.forEach(student => {
      csv += `${student.name},${student.rollNumber},`;
      assessments.forEach(assessment => {
        const mark = branchMarks.find(m => m.studentId === student.id && m.assessment === assessment);
        csv += `${mark?.marks !== null ? mark?.marks : 'N/A'} / ${mark?.totalMarks || 0},`;
      });
      csv += '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marks_${branch}_${section}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredStudents = branchStudents.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.rollNumber.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marks Entry & Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            {branch}-{section} • {branchStudents.length} students
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="bg-white border-2 border-emerald-100 rounded-xl p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or roll number..."
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={selectedAssessment}
              onChange={(e) => setSelectedAssessment(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Assessments</option>
              {assessments.map(assessment => (
                <option key={assessment} value={assessment}>{assessment}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {assessments.map(assessment => {
            const isFrozen = branchMarks.find(m => m.assessment === assessment)?.isFrozen;
            const totalMarks = branchMarks.find(m => m.assessment === assessment)?.totalMarks;

            return (
              <div
                key={assessment}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg border-2 ${
                  isFrozen
                    ? 'bg-gray-50 border-gray-300'
                    : 'bg-emerald-50 border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isFrozen ? (
                    <Lock className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-600" />
                  )}
                  <span className="font-semibold text-sm">
                    {assessment} ({totalMarks})
                  </span>
                </div>
                <button
                  onClick={() => isFrozen ? handleUnfreezeAssessment(assessment) : handleFreezeAssessment(assessment)}
                  className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                    isFrozen
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isFrozen ? 'Unfreeze' : 'Freeze'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border-2 border-emerald-100 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-emerald-100 to-teal-100 border-b-2 border-emerald-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 sticky left-0 bg-gradient-to-r from-emerald-100 to-teal-100">
                  Roll No.
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 sticky left-20 bg-gradient-to-r from-emerald-100 to-teal-100">
                  Student Name
                </th>
                {filteredAssessments.map(assessment => (
                  <th key={assessment} className="px-6 py-3 text-center text-sm font-bold text-gray-900 min-w-[120px]">
                    <div>{assessment}</div>
                    <div className="text-xs font-normal text-gray-600 mt-1">
                      {branchMarks.find(m => m.assessment === assessment)?.isFrozen && (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <Lock className="w-3 h-3" /> Frozen
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map((student, index) => (
                <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 sticky left-0 bg-inherit">
                    {student.rollNumber}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-20 bg-inherit">
                    {student.name}
                  </td>
                  {filteredAssessments.map(assessment => {
                    const mark = branchMarks.find(m => m.studentId === student.id && m.assessment === assessment);
                    if (!mark) return <td key={assessment} className="px-6 py-3"></td>;

                    const isEditing = editingId === mark.id;

                    return (
                      <td key={assessment} className="px-6 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveMarks(mark.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="w-16 px-2 py-1 border-2 border-emerald-500 rounded text-center focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                              min="0"
                              max={mark.totalMarks}
                              autoFocus
                            />
                            <span className="text-sm text-gray-600">/ {mark.totalMarks}</span>
                            <button
                              onClick={() => saveMarks(mark.id)}
                              className="p-1 text-white bg-emerald-600 hover:bg-emerald-700 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(mark.id, mark.marks)}
                            disabled={mark.isFrozen}
                            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                              mark.isFrozen
                                ? 'cursor-not-allowed text-gray-500'
                                : 'hover:bg-emerald-50 hover:border-emerald-300 border-2 border-transparent'
                            }`}
                          >
                            {mark.marks !== null ? (
                              <span className={mark.isFrozen ? 'text-gray-700' : 'text-gray-900'}>
                                {mark.marks} / {mark.totalMarks}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click on any marks cell to edit (if not frozen)</li>
          <li>• Press Enter to save or Escape to cancel</li>
          <li>• Use "Freeze" button to lock assessments and prevent further editing</li>
          <li>• Frozen assessments can be unfrozen if needed</li>
          <li>• Export to CSV to download all marks data</li>
        </ul>
      </div>
    </div>
  );
}
