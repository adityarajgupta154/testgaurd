import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { Users, FileText, CheckCircle, Search, Filter, AlertTriangle, Eye, X, BrainCircuit, Camera, ShieldCheck, ShieldX } from 'lucide-react';
import { generateViolationSummary } from '../../services/ai/geminiAnalyzer';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, tests: 0, completed: 0 });
  const [results, setResults] = useState([]);
  const [filteredTestId, setFilteredTestId] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'score'
  const [uniqueTests, setUniqueTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [students, setStudents] = useState([]);
  const [showFaceRecords, setShowFaceRecords] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const uSnap = await getDocs(collection(db, 'users'));
        const usersMap = {};
        uSnap.docs.forEach(d => {
           usersMap[d.id] = d.data();
        });

        const tSnap = await getDocs(collection(db, 'tests'));
        const testsMap = {};
        const testsList = [];
        tSnap.docs.forEach(d => {
           const data = d.data();
           testsMap[d.id] = data;
           testsList.push({ id: d.id, ...data });
        });
        setUniqueTests(testsList);

        const attSnap = await getDocs(query(collection(db, 'attempts'), where('status', '==', 'completed')));
        
        const resultsArray = attSnap.docs.map(docSnap => {
           const data = docSnap.data();
           return {
             id: docSnap.id,
             studentEmail: usersMap[data.userId]?.email || 'Unknown Student',
             testName: testsMap[data.testId]?.title || 'Unknown Test',
             score: data.score || 0,
             correctCount: data.correctCount || 0,
             wrongCount: data.wrongCount || 0,
             violationsCount: data.violations ? data.violations.length : 0,
             violations: data.violations || [],
             submittedAt: data.submittedAt || 0,
             testId: data.testId,
             answers: data.answers || []
           };
        });

        setResults(resultsArray);

        // Build students list with face info
        const studentsList = Object.entries(usersMap)
          .filter(([, u]) => u.role === 'student')
          .map(([uid, u]) => ({
            uid,
            email: u.email || 'N/A',
            faceEnrolled: !!u.faceEnrolled,
            faceImageUrl: u.faceImageUrl || null,
            faceEnrolledAt: u.faceEnrolledAt || null
          }));
        setStudents(studentsList);

        setStats({
          users: studentsList.length,
          tests: tSnap.size,
          completed: resultsArray.length
        });
      } catch(e) {
        console.error("Error fetching admin data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredResults = results.filter(r => filteredTestId === 'all' || r.testId === filteredTestId);
  const sortedResults = [...filteredResults].sort((a, b) => {
     if (sortBy === 'score') return b.score - a.score;
     return (b.submittedAt || 0) - (a.submittedAt || 0);
  });

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-full mr-4">
             <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Students</p>
            <h3 className="text-3xl font-bold text-gray-900">{stats.users}</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-full mr-4">
             <FileText className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Tests</p>
            <h3 className="text-3xl font-bold text-gray-900">{stats.tests}</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
          <div className="p-4 bg-green-50 text-green-600 rounded-full mr-4">
             <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Exams Completed</p>
            <h3 className="text-3xl font-bold text-gray-900">{stats.completed}</h3>
          </div>
        </div>
      </div>

      {/* ===== STUDENT FACE RECORDS ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowFaceRecords(prev => !prev)}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mr-4">
              <Camera className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-gray-900">Student Face Records</h3>
              <p className="text-sm text-gray-500">{students.filter(s => s.faceEnrolled).length}/{students.length} students enrolled</p>
            </div>
          </div>
          <span className="text-gray-400 text-xl">{showFaceRecords ? '▲' : '▼'}</span>
        </button>
        
        {showFaceRecords && (
          <div className="border-t border-gray-100 p-6">
            {students.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No students found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {students.map(s => (
                  <div key={s.uid} className={`border rounded-xl overflow-hidden ${s.faceEnrolled ? 'border-green-200' : 'border-red-200'}`}>
                    {/* Face Image */}
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {s.faceImageUrl ? (
                        <img src={s.faceImageUrl} alt={`Face of ${s.email}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                          <Camera className="w-10 h-10 mb-1" />
                          <span className="text-xs">No Image</span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-900 truncate" title={s.email}>{s.email}</p>
                      <div className="mt-2 flex items-center">
                        {s.faceEnrolled ? (
                          <span className="flex items-center text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Enrolled
                          </span>
                        ) : (
                          <span className="flex items-center text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-full">
                            <ShieldX className="w-3.5 h-3.5 mr-1" /> Not Enrolled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <h3 className="text-xl font-bold text-gray-900">Student Results</h3>
           <div className="flex flex-col sm:flex-row gap-3">
             <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <Filter className="w-4 h-4 text-gray-500 mr-2" />
                <select 
                  className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
                  value={filteredTestId}
                  onChange={(e) => setFilteredTestId(e.target.value)}
                >
                  <option value="all">All Tests</option>
                  {uniqueTests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
             </div>
             <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-500 mr-2" />
                <select 
                  className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="date">Sort by Date</option>
                  <option value="score">Sort by Score</option>
                </select>
             </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm tracking-wider uppercase border-b border-gray-200">
                 <th className="p-4 font-medium">Student Email</th>
                 <th className="p-4 font-medium">Test Name</th>
                 <th className="p-4 font-medium">Score</th>
                 <th className="p-4 font-medium">Violations</th>
                 <th className="p-4 font-medium">Submitted time</th>
                 <th className="p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {loading ? (
                 <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading results...</td></tr>
               ) : sortedResults.length === 0 ? (
                 <tr><td colSpan="6" className="p-8 text-center text-gray-500">No completed exams found.</td></tr>
               ) : sortedResults.map(r => (
                 <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 text-gray-900 font-medium">{r.studentEmail}</td>
                    <td className="p-4 text-gray-600">{r.testName}</td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-900">{r.score}</span>
                        <span className="text-sm text-gray-500">({r.correctCount} ✔, {r.wrongCount} ✖)</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {r.violationsCount > 0 ? (
                        <div className="flex items-center text-red-600 font-medium bg-red-50 px-2 py-1 rounded inline-flex">
                           <AlertTriangle className="w-4 h-4 mr-1" /> {r.violationsCount}
                        </div>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                       {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-4">
                      <button onClick={() => setSelectedResult(r)} className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition">
                        <Eye className="w-4 h-4 mr-1" /> View
                      </button>
                    </td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                 <div>
                   <h3 className="text-xl font-bold text-gray-900">Exam Details</h3>
                   <p className="text-sm text-gray-500 mt-1">{selectedResult.studentEmail} - {selectedResult.testName}</p>
                 </div>
                 <button onClick={() => { setSelectedResult(null); setAiSummary(''); }} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              
              {/* Gemini AI Summary Section */}
              {selectedResult.violationsCount > 0 && (
                 <div className="bg-indigo-50 border-b border-indigo-100 p-4 shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="flex items-center font-bold text-indigo-900 mb-1">
                        <BrainCircuit className="w-4 h-4 mr-2" /> AI Proctoring Summary
                      </h4>
                      {aiSummary ? (
                        <p className="text-sm font-medium text-indigo-800 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">{aiSummary}</p>
                      ) : (
                        <p className="text-sm text-indigo-700/80">Generate an AI summary of {selectedResult.violationsCount} violation(s) recorded.</p>
                      )}
                    </div>
                    {!aiSummary && (
                      <button 
                         onClick={async () => {
                           setGeneratingAi(true);
                           const summary = await generateViolationSummary(selectedResult.violations);
                           setAiSummary(summary);
                           setGeneratingAi(false);
                         }}
                         disabled={generatingAi}
                         className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                         {generatingAi ? "Analyzing..." : "Generate AI Summary"}
                      </button>
                    )}
                 </div>
              )}
              
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                 {selectedResult.answers && selectedResult.answers.length > 0 ? (
                   selectedResult.answers.map((ans, idx) => (
                     <div key={idx} className={`p-4 border rounded-xl ${ans.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <p className="font-medium text-gray-900 mb-2">Q{idx + 1}. {ans.questionText}</p>
                        <div className="flex flex-col sm:flex-row gap-4 text-sm mt-3">
                           <div className="flex-1">
                             <span className="text-gray-500 block mb-1">Student's Answer:</span>
                             <span className={`font-semibold ${ans.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                               {ans.studentAnswer || "Not Answered"}
                             </span>
                           </div>
                           <div className="flex-1">
                             <span className="text-gray-500 block mb-1">Correct Answer:</span>
                             <span className="font-semibold text-green-700">{ans.correctAnswer}</span>
                           </div>
                        </div>
                     </div>
                   ))
                 ) : (
                    <p className="text-gray-500 text-center py-4">No detailed answer data available for this attempt.</p>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
export default AdminDashboard;
