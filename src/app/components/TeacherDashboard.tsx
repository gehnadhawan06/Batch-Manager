import React, { useEffect, useState } from 'react';
import { CheckCircle, FileText, Award, MessageSquare, LogOut, Filter } from 'lucide-react';
import { AttendanceApproval } from './teacher/AttendanceApproval';
import { AssignmentManager } from './teacher/AssignmentManager';
import { MarksEntry } from './teacher/MarksEntry';
import { QueryInbox } from './teacher/QueryInbox';
import { useAppContext } from '../context/AppContext';

interface TeacherDashboardProps {
  teacherId: number;
  userName: string;
  branches: string[];
  onLogout: () => void;
}

export function TeacherDashboard({ teacherId, userName, branches, onLogout }: TeacherDashboardProps) {
  const { fetchUsers } = useAppContext();
  const [activeTab, setActiveTab] = useState<'attendance' | 'assignments' | 'marks' | 'queries'>('attendance');
  const [selectedBranch, setSelectedBranch] = useState(branches[0]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const tabs = [
    { id: 'attendance' as const, label: 'Attendance', icon: CheckCircle },
    { id: 'assignments' as const, label: 'Assignments', icon: FileText },
    { id: 'marks' as const, label: 'Marks', icon: Award },
    { id: 'queries' as const, label: 'Queries', icon: MessageSquare },
  ];

  const [branch, section] = selectedBranch.split('-');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
      <header className="bg-white shadow-md border-b-4 border-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                Teacher Portal
              </h1>
              <p className="text-sm text-gray-600 mt-1 font-medium">{userName}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-emerald-50 rounded-lg transition-colors border border-gray-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Branch Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-4 mb-6">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-emerald-600" />
            <label className="font-semibold text-gray-700">Select Branch & Section:</label>
            <div className="flex gap-2">
              {branches.map(branchOption => (
                <button
                  key={branchOption}
                  onClick={() => setSelectedBranch(branchOption)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedBranch === branchOption
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {branchOption}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-emerald-100">
          <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <nav className="flex space-x-1 p-3">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-lg font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'attendance' && <AttendanceApproval branch={branch} section={section} />}
            {activeTab === 'assignments' && <AssignmentManager branch={branch} section={section} />}
            {activeTab === 'marks' && <MarksEntry branch={branch} section={section} />}
            {activeTab === 'queries' && <QueryInbox branch={branch} section={section} />}
          </div>
        </div>
      </div>
    </div>
  );
}
