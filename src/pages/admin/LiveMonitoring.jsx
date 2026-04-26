import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { AlertTriangle, Clock } from 'lucide-react';

const LiveMonitoring = () => {
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'attempts'), (snap) => {
      const ongoing = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'started' || data.status === 'mcq_completed') {
           ongoing.push({ id: doc.id, ...data });
        }
      });
      setAttempts(ongoing);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-end">
         <h2 className="text-2xl font-bold text-gray-900">Live Exam Monitoring</h2>
         <span className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></span> System Active
         </span>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {attempts.map(att => {
           const timeSincePing = Date.now() - (att.lastPing || 0);
           const isOffline = timeSincePing > 20000; 
           const violationsCount = typeof att.violations === 'number' ? att.violations : (att.violations?.length || 0);
           const violationsLogs = att.logs || (Array.isArray(att.violations) ? att.violations : []);
           
           const getProctorStatus = (count) => {
             if (count >= 3) return { text: 'TERMINATED', color: 'bg-red-100 text-red-700' };
             if (count > 0) return { text: 'WARNING', color: 'bg-yellow-100 text-yellow-700' };
             return { text: 'SAFE', color: 'bg-green-100 text-green-700' };
           };
           const pStatus = getProctorStatus(violationsCount);

           return (
             <div key={att.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative overflow-hidden transition-all hover:shadow-md">
                <div className={`absolute top-0 left-0 w-1 h-full ${violationsCount > 0 ? 'bg-red-500' : isOffline ? 'bg-gray-400' : 'bg-green-500'}`}></div>
                <div className="flex justify-between items-center mb-4 pl-3">
                  <div className="font-bold text-gray-800 text-sm truncate bg-gray-100 px-2 py-1 rounded font-mono">ID: {att.userId.substring(0, 8)}</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide ${pStatus.color}`}>
                      {pStatus.text}
                    </span>
                    {isOffline ? (
                      <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide">Offline</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide animate-pulse">Live</span>
                    )}
                  </div>
                </div>
                
                <div className="pl-3 space-y-3">
                  <div className="text-sm font-medium text-gray-600 flex items-center bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg">
                    <Clock className="w-4 h-4 mr-2 text-blue-500" />
                    Started: {new Date(att.startTime).toLocaleTimeString()}
                  </div>
                  
                  {violationsCount > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                      <div className="text-red-700 text-xs font-bold uppercase mb-2 flex items-center tracking-wider">
                         <AlertTriangle className="w-4 h-4 mr-2 text-red-600" /> Web Proctor Alerts ({violationsCount})
                      </div>
                      <ul className="list-disc pl-5 text-xs text-red-600 space-y-1 font-medium">
                        {violationsLogs.map((v, i) => (
                           <li key={i}>{v.reason} <span className="text-red-400 text-[10px] ml-1 opacity-70">({new Date(v.timestamp).toLocaleTimeString()})</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
             </div>
           );
         })}
         
         {attempts.length === 0 && (
           <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 font-medium bg-gray-50 rounded-xl border border-dashed border-gray-300">
             <AlertTriangle className="w-12 h-12 text-gray-300 mb-4" />
             No active examinations right now. Students currently offline.
           </div>
         )}
       </div>
    </div>
  );
};
export default LiveMonitoring;
