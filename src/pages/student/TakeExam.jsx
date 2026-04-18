import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase/config';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useProctoring } from '../../hooks/useProctoring';
import { AlertCircle, Clock, CheckCircle, X, Menu, Video, VideoOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TakeExam = () => {
  const { testId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [testData, setTestData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const submitExamRef = useRef(null);
  
  const desktopVideoRef = useRef(null);
  const mobileVideoRef = useRef(null);

  // Mobile responsive state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(true);

  const handleAutoSubmit = useCallback(() => {
    alert("Maximum violations reached. Auto-submitting exam.");
    if (submitExamRef.current) submitExamRef.current();
  }, []);

  const { videoRef, startProctoring, stopProctoring, violations, stream, permissionDenied } = useProctoring(testId, currentUser?.uid, handleAutoSubmit);

  // Sync stream to custom refs when they mount
  useEffect(() => {
    if (stream) {
      if (videoRef.current) videoRef.current.srcObject = stream;
      if (desktopVideoRef.current) desktopVideoRef.current.srcObject = stream;
      if (mobileVideoRef.current) mobileVideoRef.current.srcObject = stream;
    }
  }, [stream, cameraVisible, sidebarOpen, videoRef]);

   useEffect(() => {
    const initializeExam = async () => {
      try {
        // GUARD: Check face enrollment before allowing exam access
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && !userDoc.data().faceEnrolled) {
          alert('Please complete face enrollment first.');
          return navigate('/student/enroll-face', { replace: true });
        }

        const testDoc = await getDoc(doc(db, 'tests', testId));
        if (!testDoc.exists()) return navigate('/student');
        const tData = testDoc.data();
        setTestData(tData);

        const qSnap = await getDocs(query(collection(db, 'questions'), where('testId', '==', testId)));
        let qList = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (tData.shuffle) {
          qList = qList.sort(() => Math.random() - 0.5);
        }
        setQuestions(qList);

        const attemptRef = doc(db, 'attempts', `${currentUser.uid}_${testId}`);
        const attemptDoc = await getDoc(attemptRef);
        
        let serverStartTime = Date.now(); 
        if (attemptDoc.exists()) {
          const attemptData = attemptDoc.data();
          if (attemptData.status === 'completed') {
            alert('Already submitted!');
            return navigate('/student');
          }
          setAnswers(attemptData.answers?.reduce((acc, a) => ({...acc, [a.questionId]: { value: a.studentAnswer }}), {}) || {});
          serverStartTime = attemptData.startTime; 
        } else {
           await setDoc(attemptRef, {
             userId: currentUser.uid,
             testId: testId,
             answers: [],
             status: 'started',
             startTime: serverStartTime,
             violations: [],
             lastPing: Date.now()
           });
        }

        const diffInMs = Date.now() - serverStartTime;
        const totalMs = tData.duration * 60 * 1000;
        const remain = Math.max(0, totalMs - diffInMs);
        setTimeLeft(Math.floor(remain / 1000));

        try {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.warn(err));
          }
        } catch(e){}
        startProctoring();

        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };
    if (currentUser) initializeExam();
    
    return () => stopProctoring();
  }, [testId, currentUser]); 

  // Timer Countdown Effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timeLeft === 0 && !isSubmitting && testData && !showThankYou) submitExam();
      return;
    }
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, isSubmitting, testData, showThankYou]);

  // Network Ping
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(async () => {
      try {
        await setDoc(doc(db, 'attempts', `${currentUser.uid}_${testId}`), {
          lastPing: Date.now()
        }, { merge: true });
      } catch(e) {}
    }, 15000);
    return () => clearInterval(interval);
  }, [loading, currentUser, testId]);

  const handleAnswerChange = async (qId, optionObj) => {
    const newAnswers = { ...answers, [qId]: optionObj };
    setAnswers(newAnswers);

    try {
      const attemptRef = doc(db, 'attempts', `${currentUser.uid}_${testId}`);
      const formattedAnswers = questions.map(q => {
        const studentAnswer = newAnswers[q.id]?.value || null;
        return {
          questionId: q.id,
          questionText: q.question,
          studentAnswer: studentAnswer,
          correctAnswer: q.correctAnswer,
          isCorrect: studentAnswer === q.correctAnswer
        };
      });
      await setDoc(attemptRef, { answers: formattedAnswers }, { merge: true });
    } catch(err) {
      console.error("Auto-save failed", err);
    }
  };

  const submitExam = async () => {
    if (isSubmitting || showThankYou) return;
    setIsSubmitting(true);
    stopProctoring();
    if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});

    try {
      let score = 0;
      let correctCount = 0;
      let wrongCount = 0;
      
      const formattedAnswers = questions.map(q => {
        const studentAnswer = answers[q.id]?.value || null;
        if (studentAnswer === q.correctAnswer) {
          score += 1;
          correctCount += 1;
        } else if (studentAnswer) {
          wrongCount += 1;
        } else {
          wrongCount += 1;
        }
        return {
          questionId: q.id,
          questionText: q.question,
          studentAnswer: studentAnswer,
          correctAnswer: q.correctAnswer,
          isCorrect: studentAnswer === q.correctAnswer
        };
      });

      await setDoc(doc(db, 'attempts', `${currentUser.uid}_${testId}`), {
        userId: currentUser.uid,
        testId: testId,
        answers: formattedAnswers,
        score: score,
        correctCount: correctCount,
        wrongCount: wrongCount,
        status: 'completed',
        submittedAt: Date.now()
      }, { merge: true });

      setFinalScore(score);
      setShowThankYou(true);
    } catch(err) {
      console.error(err);
      alert('Fail to submit. Try again.');
      setIsSubmitting(false);
    }
  };

  // Keep ref in sync so handleAutoSubmit always calls the latest submitExam
  submitExamRef.current = submitExam;

  useEffect(() => {
    if (showThankYou) {
      const t = setTimeout(() => {
        navigate('/student');
      }, 4500);
      return () => clearTimeout(t);
    }
  }, [showThankYou, navigate]);

  if (loading) return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="font-bold text-lg sm:text-2xl text-blue-600 bg-white p-6 sm:p-8 rounded-2xl shadow-xl flex items-center text-center"
      >
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-3 sm:mr-4 flex-shrink-0"></div>
        Initializing Secure Environment...
      </motion.div>
    </div>
  );

  if (permissionDenied) return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center border-t-4 border-red-500">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Camera Access Required</h2>
        <p className="text-gray-600 mb-6">You must allow camera and microphone access to take this proctored exam. Please update your browser permissions and reload.</p>
        <button onClick={() => window.location.reload()} className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition w-full">
          Reload Page
        </button>
      </div>
    </div>
  );

  const currentQ = questions[currentQIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col md:flex-row h-screen w-full fixed inset-0 z-50 bg-gray-50 font-sans"
    >
      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto relative">

        {/* --- STICKY HEADER: Timer + Violations + Hamburger --- */}
        <motion.div 
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="sticky top-0 z-20 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-200 px-3 py-2.5 sm:px-4 sm:py-3"
        >
          <div className="flex items-center justify-between gap-2">
            {/* Left: Title (truncated on mobile) */}
            <h2 className="text-sm sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 truncate min-w-0 flex-1">
              {testData?.title}
            </h2>

            {/* Right: Violations + Timer + Hamburger */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="flex items-center text-red-700 bg-red-100 px-2 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold shadow-inner">
                <AlertCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" /> 
                <span className="hidden sm:inline">Violations: </span>{violations}/3
              </div>
              <div className={`flex items-center px-2.5 py-1.5 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg shadow-sm border
                ${timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-blue-800 border-blue-100'}
              `}>
                <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" /> 
                {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>

              {/* Hamburger — mobile only */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 active:scale-95 transition-transform"
                aria-label="Open question map"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress bar + answered count — always visible under header */}
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Q {currentQIndex + 1}/{questions.length}
              </span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {answeredCount}/{questions.length} answered
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 overflow-hidden shadow-inner">
              <motion.div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>

        {/* --- QUESTION AREA --- */}
        <div className="p-3 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full flex-1 flex flex-col relative pb-32 sm:pb-8">
           <AnimatePresence mode="wait">
             <motion.div 
               key={currentQIndex}
               initial={{ x: 30, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               exit={{ x: -15, opacity: 0 }}
               transition={{ duration: 0.2, ease: 'easeOut' }}
               className="flex-1 bg-white p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col"
             >
               <h3 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 lg:mb-8 leading-snug break-words">
                 {currentQ?.question}
               </h3>
               
               <div className="space-y-2.5 sm:space-y-4 flex-1">
                 {currentQ?.options?.map((opt, idx) => {
                   const isSelected = answers[currentQ.id]?.value === opt;
                   return (
                     <motion.label 
                       key={idx}
                       whileTap={{ scale: 0.98 }}
                       className={`flex items-center p-3.5 sm:p-5 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 border-2 min-h-[48px]
                         ${isSelected 
                           ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500/20' 
                           : 'border-gray-100 bg-gray-50 hover:border-blue-300 hover:bg-white active:bg-blue-50/50'}
                       `}
                     >
                       <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0 transition-colors
                         ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                         {isSelected && <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white" />}
                       </div>
                       <input 
                         type="radio" 
                         name={currentQ.id} 
                         value={opt}
                         checked={isSelected}
                         onChange={() => handleAnswerChange(currentQ.id, { value: opt })}
                         className="hidden"
                       />
                       <span className={`text-sm sm:text-base lg:text-lg transition-colors break-words ${isSelected ? 'text-blue-900 font-bold' : 'text-gray-700 font-medium'}`}>
                         {opt}
                       </span>
                     </motion.label>
                   )
                 })}
               </div>
             </motion.div>
           </AnimatePresence>
        </div>

        {/* --- NAV BUTTONS: Fixed bottom bar on mobile, inline on desktop --- */}
        <div className="fixed bottom-0 left-0 right-0 md:static bg-white/95 backdrop-blur-md border-t border-gray-200 md:border-0 md:bg-transparent p-3 sm:px-8 sm:pb-6 z-30 md:max-w-4xl md:mx-auto md:w-full">
          <div className="flex justify-between items-center gap-3">
             <motion.button 
               whileTap={{ scale: 0.95 }}
               onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
               disabled={currentQIndex === 0}
               className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-3 bg-white border border-gray-200 rounded-xl font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-colors text-sm sm:text-base min-h-[48px]"
             >
               ← Prev
             </motion.button>
             
             {currentQIndex === questions.length - 1 ? (
               <motion.button 
                 whileTap={{ scale: 0.95 }}
                 onClick={submitExam} 
                 disabled={isSubmitting} 
                 className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold flex items-center justify-center shadow-lg transition-all text-sm sm:text-base min-h-[48px] ${isSubmitting ? 'opacity-70' : ''}`}
               >
                 <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" /> {isSubmitting ? 'Submitting...' : 'Submit'}
               </motion.button>
             ) : (
               <motion.button 
                 whileTap={{ scale: 0.95 }}
                 onClick={() => setCurrentQIndex(prev => prev + 1)}
                 className="flex-1 sm:flex-none px-4 sm:px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center group text-sm sm:text-base min-h-[48px]"
               >
                 Next <span className="ml-1.5 sm:ml-2 group-hover:translate-x-1 transition-transform">→</span>
               </motion.button>
             )}
          </div>
        </div>
      </div>

      {/* ===== SIDEBAR: Hidden on mobile (overlay), inline on desktop ===== */}

      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <div className={`
        fixed top-0 right-0 h-full w-[280px] sm:w-[320px]
        md:static md:w-80 md:h-auto
        bg-white border-l border-gray-100 flex flex-col shadow-[-10px_0_20px_rgba(0,0,0,0.05)] md:shadow-[-10px_0_20px_rgba(0,0,0,0.02)]
        z-[70] md:z-40
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0
      `}>
        {/* Mobile close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 md:hidden">
          <span className="font-bold text-gray-800 text-sm">Question Map</span>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop camera — hidden on mobile (moved to floating PiP) */}
        <div className="hidden md:block px-6 pt-6 mb-6">
          <div className="w-full h-44 bg-gray-900 rounded-2xl overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] border-2 border-gray-100">
             <video ref={desktopVideoRef} autoPlay playsInline muted className="object-cover w-full h-full transform scale-x-[-1]" />
             <div className="absolute top-3 right-3 flex items-center text-xs font-bold text-white bg-black/60 px-2.5 py-1.5 rounded-full backdrop-blur-md border border-white/10">
               <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div> Live
             </div>
          </div>
        </div>

        {/* Question Map title — desktop only (mobile has it in the close bar) */}
        <div className="hidden md:block px-6 border-b border-gray-100 pb-4 mb-4">
           <h4 className="font-bold text-gray-800 uppercase text-xs tracking-widest text-center flex items-center justify-center">
             <span className="w-8 h-px bg-gray-200 mr-3"></span>
             Question Map
             <span className="w-8 h-px bg-gray-200 ml-3"></span>
           </h4>
        </div>
        
        {/* Question grid */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 pt-3 md:pt-0">
           <div className="grid grid-cols-5 sm:grid-cols-4 gap-2 sm:gap-3">
             {questions.map((q, i) => {
               const isAttempted = !!answers[q.id];
               const isCurrent = i === currentQIndex;
               return (
                 <motion.button 
                   key={i} 
                   whileTap={{ scale: 0.9 }}
                   onClick={() => { setCurrentQIndex(i); setSidebarOpen(false); }}
                   className={`aspect-square rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all focus:outline-none shadow-sm min-h-[40px]
                     ${isCurrent ? 'ring-2 ring-blue-600 ring-offset-1 sm:ring-offset-2 scale-105 z-10' : ''}
                     ${isAttempted 
                        ? 'bg-gradient-to-br from-green-400 to-green-500 text-white border-0' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 active:bg-blue-50'}
                   `}
                 >
                   {i + 1}
                 </motion.button>
               )
             })}
           </div>
           
           <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4 bg-gray-50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100/80">
             <div className="flex items-center text-xs sm:text-sm text-gray-700 font-semibold">
               <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-green-400 to-green-500 rounded-md mr-2 sm:mr-3 shadow-sm border border-green-500/20"></div> Attempted ({answeredCount})
             </div>
             <div className="flex items-center text-xs sm:text-sm text-gray-700 font-semibold">
               <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white border-2 border-gray-200 rounded-md mr-2 sm:mr-3 shadow-sm"></div> Not Visited ({questions.length - answeredCount})
             </div>
           </div>
        </div>
      </div>

      {/* ===== FLOATING CAMERA PiP — Mobile only ===== */}
      <div className="md:hidden fixed top-24 right-3 z-[55] flex flex-col items-end gap-2">
        {/* Toggle button */}
        <button
          onClick={() => setCameraVisible(prev => !prev)}
          className="w-9 h-9 rounded-full bg-gray-900/80 backdrop-blur-md text-white flex items-center justify-center shadow-lg border border-white/10 active:scale-90 transition-transform"
          aria-label={cameraVisible ? 'Hide camera' : 'Show camera'}
        >
          {cameraVisible ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        </button>
        
        {/* Floating camera preview */}
        <AnimatePresence>
          {cameraVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2 }}
              className="w-[100px] h-[75px] sm:w-[120px] sm:h-[90px] bg-gray-900 rounded-xl overflow-hidden relative shadow-2xl border-2 border-white/20"
            >
              <video ref={mobileVideoRef} autoPlay playsInline muted className="object-cover w-full h-full transform scale-x-[-1]" />
              <div className="absolute top-1 right-1 flex items-center text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded-full backdrop-blur-md">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse mr-1"></div>
                Live
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== THANK YOU MODAL ===== */}
      <AnimatePresence>
        {showThankYou && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
             <motion.div 
               initial={{ scale: 0.8, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.8, opacity: 0 }}
               className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden mx-4"
             >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                <button 
                  onClick={() => navigate('/student')}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-700 transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                   <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <motion.div 
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                  className="w-16 h-16 sm:w-24 sm:h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-inner"
                >
                   <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 text-green-500" />
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight">Thank You! 🙌</h2>
                <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 leading-relaxed">
                  Thank you for giving the test, <br/><span className="font-extrabold text-gray-900 text-lg sm:text-xl">{currentUser?.displayName || 'Aditya'}</span>
                </p>
                <div className="bg-blue-50/80 p-3 sm:p-4 rounded-xl border border-blue-100 inline-block mb-6 sm:mb-8 shadow-sm">
                  <p className="text-blue-800 font-semibold text-xs sm:text-sm uppercase tracking-wide">Final Score</p>
                  <p className="text-2xl sm:text-3xl font-black text-blue-900 mt-1">{finalScore} <span className="text-lg sm:text-xl text-blue-600/70">/ {questions.length}</span></p>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 font-medium animate-pulse">Redirecting to Dashboard...</p>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TakeExam;
