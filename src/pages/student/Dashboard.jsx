import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, BarChart2 } from 'lucide-react';
import ReportModal from '../../components/ui/ReportModal';
import { AnimatePresence } from 'framer-motion';

const StudentDashboard = () => {
  const { currentUser, faceEnrolled } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && !faceEnrolled) {
      navigate('/student/enroll-face');
    }
  }, [currentUser, faceEnrolled, navigate]);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const testsSnap = await getDocs(collection(db, 'tests'));
        const testsList = testsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const withAttemptStatus = await Promise.all(testsList.map(async (t) => {
          const attemptDoc = await getDoc(doc(db, 'attempts', `${currentUser.uid}_${t.id}`));
          let attemptData = null;
          if (attemptDoc.exists()) {
            attemptData = attemptDoc.data();
          }
          return {
            ...t,
            status: attemptData ? attemptData.status : 'pending',
            result: attemptData
          };
        }));
        
        setTests(withAttemptStatus);
      } catch (error) {
         console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchTests();
  }, [currentUser]);

  if (loading) return <div className="p-10 flex justify-center text-gray-500">Loading your assessments...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg">
        <h2 className="text-3xl font-extrabold mb-2">Welcome!</h2>
        <p className="text-blue-100">Make sure you are in a quiet room before starting any assessment.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tests.map(test => (
          <div key={test.id} className="bg-white rounded-xl shadow border border-gray-100 p-6 flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{test.title}</h3>
            <div className="text-sm text-gray-500 space-y-2 mb-6">
              <div className="flex items-center"><Clock className="w-4 h-4 mr-2" />Duration: {test.duration} mins</div>
            </div>
            
            <div className="mt-auto">
              {test.status === 'completed' ? (
                <button onClick={() => setSelectedReport(test)} className="w-full py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg font-bold tracking-wide flex items-center justify-center transition-colors">
                  <BarChart2 className="w-5 h-5 mr-2" /> View Report
                </button>
              ) : test.status === 'started' ? (
                <button onClick={() => navigate(`/student/exam/${test.id}`)} className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium tracking-wide flex items-center justify-center">
                  <PlayCircle className="w-5 h-5 mr-2" /> Resume Test
                </button>
              ) : (
                <button onClick={() => navigate(`/student/exam/${test.id}`)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium tracking-wide flex items-center justify-center">
                  <PlayCircle className="w-5 h-5 mr-2" /> Start Test
                </button>
              )}
            </div>
          </div>
        ))}
        {tests.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-white">
             No active tests assigned to you at the moment.
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedReport && selectedReport.result && (
          <ReportModal 
            result={selectedReport.result} 
            testName={selectedReport.title}
            studentName={currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student'}
            onClose={() => setSelectedReport(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentDashboard;
