import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// A simple typewriter sound logic using Web Audio API
const createTypeSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    };
  } catch (e) {
    return () => {};
  }
};

const TypingTest = () => {
  const { testId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  
  const [typedText, setTypedText] = useState('');
  const [backspaceCount, setBackspaceCount] = useState(0);
  const [showThankYou, setShowThankYou] = useState(false);
  
  const paragraphRef = useRef(null);
  const inputRef = useRef(null);
  const playTypeSound = useRef(null);

  const [finalStats, setFinalStats] = useState({ wpm: 0, accuracy: 0, errors: 0 });

  useEffect(() => {
    playTypeSound.current = createTypeSound();
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const testDoc = await getDoc(doc(db, 'tests', testId));
        if (!testDoc.exists()) return navigate('/student');
        const tData = testDoc.data();
        if (!tData.typingParagraph) return navigate('/student'); // No typing test
        setTestData(tData);

        const attemptDoc = await getDoc(doc(db, 'attempts', `${currentUser.uid}_${testId}`));
        if (attemptDoc.exists()) {
          const attemptData = attemptDoc.data();
          if (attemptData.status === 'completed' || attemptData.status === 'typing_completed') {
            alert('Typing section already submitted!');
            return navigate('/student');
          }
        }

        setTimeLeft(tData.typingDuration || 60);
        setLoading(false);
        if (inputRef.current) inputRef.current.focus();
      } catch (err) {
        console.error(err);
      }
    };
    if (currentUser) init();
  }, [testId, currentUser, navigate]);

  // Timer Countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timeLeft === 0 && !isSubmittingRef.current && testData && !showThankYou) {
        submitTyping();
      }
      return;
    }
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, testData, showThankYou]);

  // Smooth scroll sync
  useEffect(() => {
    if (paragraphRef.current && inputRef.current) {
      // Very basic auto-scroll: we assume equal height lines for simplicity
      const linesCount = typedText.split('\n').length;
      paragraphRef.current.scrollTop = (linesCount - 1) * 24; // approx 24px per line
    }
  }, [typedText]);

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      setBackspaceCount(prev => prev + 1);
    }
    // Prevent cheating shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A)
    if (e.ctrlKey || e.metaKey) {
      if (['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    }
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setTypedText(val);
    if (playTypeSound.current) playTypeSound.current();
  };

  const calculateStats = () => {
    if (!testData) return { wpm: 0, accuracy: 0, errors: 0 };
    const original = testData.typingParagraph;
    const typed = typedText;
    
    let errors = 0;
    let correctChars = 0;
    for (let i = 0; i < typed.length; i++) {
      if (i < original.length) {
        if (typed[i] === original[i]) correctChars++;
        else errors++;
      } else {
        errors++; // Extra typed chars are errors
      }
    }

    // Un-typed characters are technically errors if the test finishes, but standard tests only count typed length vs original.
    // Let's stick to standard error count based on typed length
    const totalTyped = typed.length;
    const accuracy = totalTyped > 0 ? Math.max(0, Math.round((correctChars / totalTyped) * 100)) : 0;
    
    // Calculate actual time spent
    const totalSeconds = testData.typingDuration || 60;
    const timeSpentSeconds = totalSeconds - (timeLeft !== null ? timeLeft : 0);
    // Avoid division by zero if they submit immediately
    const minutes = Math.max(0.1, timeSpentSeconds / 60);

    // Standard WPM: (Total characters / 5) / minutes
    const grossWpm = (totalTyped / 5) / minutes;
    // Net WPM: (Total chars / 5 - errors) / minutes
    const netWpm = Math.max(0, Math.round(((totalTyped / 5) - errors) / minutes));

    return {
      wpm: netWpm,
      accuracy,
      errors,
      grossWpm: Math.round(grossWpm)
    };
  };

  const submitTyping = async () => {
    if (isSubmittingRef.current || showThankYou) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const stats = calculateStats();
      await setDoc(doc(db, 'attempts', `${currentUser.uid}_${testId}`), {
        typing: {
          typedText: typedText,
          wpm: stats.wpm,
          accuracy: stats.accuracy,
          errors: stats.errors,
          backspaceCount: backspaceCount,
          completedAt: Date.now()
        },
        status: 'completed',
        submittedAt: Date.now()
      }, { merge: true });

      setFinalStats(stats);
      setShowThankYou(true);
    } catch(err) {
      console.error(err);
      alert('Fail to submit. Try again.');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4">
      <div className="text-xl font-bold text-blue-600 animate-pulse">Loading Typing Module...</div>
    </div>
  );

  const originalText = testData?.typingParagraph || '';

  // Rendering characters for highlight
  const renderParagraph = () => {
    return originalText.split('').map((char, index) => {
      let colorClass = "text-gray-400"; // default un-typed
      let bgClass = "";
      
      if (index < typedText.length) {
        if (typedText[index] === char) {
          colorClass = "text-green-600 font-bold";
        } else {
          colorClass = "text-red-600 font-bold";
          bgClass = "bg-red-100";
        }
      } else if (index === typedText.length) {
        // Current character cursor
        bgClass = "bg-blue-100 border-b-2 border-blue-500";
        colorClass = "text-blue-800";
      }

      return (
        <span key={index} className={`${colorClass} ${bgClass}`}>
          {char === '\n' ? <br /> : char}
        </span>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col font-sans relative">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Section B: Typing Test</h1>
            <p className="text-gray-500 text-sm">Type the paragraph below exactly as shown.</p>
          </div>
          <div className={`flex items-center px-6 py-3 rounded-xl font-bold text-xl shadow-sm border
            ${timeLeft < 15 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-blue-50 text-blue-800 border-blue-100'}
          `}>
            <Clock className="w-5 h-5 mr-2" /> 
            {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>

        {/* Typing Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col relative overflow-hidden">
          
          {/* Read-only paragraph with highlights */}
          <div 
            ref={paragraphRef}
            className="flex-1 overflow-y-auto text-xl md:text-2xl leading-relaxed tracking-wide font-mono mb-6 pb-6 p-4 bg-gray-50 rounded-lg border border-gray-100 select-none whitespace-pre-wrap"
            style={{ maxHeight: '40vh' }}
          >
            {renderParagraph()}
          </div>

          {/* Hidden input to capture strokes, but we'll show a textarea for mobile compat and visibility */}
          <textarea
            ref={inputRef}
            value={typedText}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={e => e.preventDefault()}
            onCopy={e => e.preventDefault()}
            onCut={e => e.preventDefault()}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            className="w-full h-32 md:h-48 text-lg font-mono p-4 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none resize-none transition-all shadow-inner"
            placeholder="Start typing here..."
            disabled={isSubmitting || showThankYou}
          />
          
          <div className="mt-4 flex justify-between items-center text-sm text-gray-500 font-medium">
            <span>No copy/paste allowed. Sounds enabled.</span>
            <span>{typedText.length} / {originalText.length} chars</span>
          </div>

          <div className="mt-6 flex justify-end">
            <button 
              onClick={submitTyping}
              disabled={isSubmitting}
              className={`px-8 py-3 bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center ${isSubmitting ? 'opacity-70' : ''}`}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit Test'}
            </button>
          </div>
        </div>
      </div>

      {/* THANK YOU MODAL */}
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
               className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden"
             >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <motion.div 
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                  className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                   <CheckCircle className="w-10 h-10 text-green-500" />
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Test Complete!</h2>
                <p className="text-gray-600 mb-8">Your typing test has been submitted.</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-blue-800 font-semibold text-xs uppercase tracking-wide">Net WPM</p>
                    <p className="text-3xl font-black text-blue-900 mt-1">{finalStats.wpm}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <p className="text-green-800 font-semibold text-xs uppercase tracking-wide">Accuracy</p>
                    <p className="text-3xl font-black text-green-900 mt-1">{finalStats.accuracy}%</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 col-span-2">
                    <p className="text-red-800 font-semibold text-xs uppercase tracking-wide">Total Errors</p>
                    <p className="text-2xl font-black text-red-900 mt-1">{finalStats.errors}</p>
                  </div>
                </div>

                <button 
                  onClick={() => navigate('/student')}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition shadow-md"
                >
                  Return to Dashboard
                </button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TypingTest;
