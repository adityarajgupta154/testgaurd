import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, BarChart2, Star, CheckCircle, AlertCircle, Clock, Zap, Target, Trophy } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ReportModal = ({ result, onClose, testName, studentName }) => {
  const chartRef = useRef(null);
  const soundPlayed = useRef(false);
  const [showAchievement, setShowAchievement] = useState(false);

  const totalQuestions = (result.correctCount || 0) + (result.wrongCount || 0);
  const accuracy = totalQuestions > 0 ? Math.round(((result.correctCount || 0) / totalQuestions) * 100) : 0;
  const isPassed = accuracy >= 60;

  const timeSpentSeconds = result.submittedAt && result.startTime ? Math.floor((result.submittedAt - result.startTime) / 1000) : 0;
  const timeSpentStr = timeSpentSeconds > 0 ? `${Math.floor(timeSpentSeconds / 60)}m ${timeSpentSeconds % 60}s` : 'N/A';

  // Performance Status Tag
  let performanceStatus = "Risky";
  let statusColor = "text-red-400 bg-red-400/10 border-red-400/30";
  let chartColors = ['rgba(239, 68, 68, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(245, 158, 11, 0.8)'];
  let glowColor = "rgba(239, 68, 68, 0.4)";
  
  if (accuracy >= 90) {
    performanceStatus = "Excellent";
    statusColor = "text-green-400 bg-green-400/10 border-green-400/30";
    chartColors = ['rgba(34, 197, 94, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(245, 158, 11, 0.8)'];
    glowColor = "rgba(34, 197, 94, 0.4)";
  } else if (accuracy >= 60) {
    performanceStatus = "Average";
    statusColor = "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
    chartColors = ['rgba(234, 179, 8, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(245, 158, 11, 0.8)'];
    glowColor = "rgba(234, 179, 8, 0.4)";
  }

  // Gamification
  const stars = accuracy === 100 ? 5 : accuracy >= 80 ? 4 : accuracy >= 60 ? 3 : accuracy >= 40 ? 2 : 1;

  // Sound + Particles Effect
  useEffect(() => {
    if (!isPassed || soundPlayed.current) return;
    soundPlayed.current = true;

    // Advanced Audio Synthesis (Cracker + Pop)
    const playCelebrationSound = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') ctx.resume();

        // White noise crackle buffer
        const bufferSize = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        
        // Main Firecracker Burst
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 1500;
        const noiseEnv = ctx.createGain();
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseEnv);
        noiseEnv.connect(ctx.destination);
        
        noiseEnv.gain.setValueAtTime(0, ctx.currentTime);
        noiseEnv.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.01);
        noiseEnv.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + 0.5);

        // Sub/Thump sound (pop)
        const osc = ctx.createOscillator();
        const oscEnv = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
        
        oscEnv.gain.setValueAtTime(0, ctx.currentTime);
        oscEnv.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.01);
        oscEnv.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        osc.connect(oscEnv);
        oscEnv.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);

        // Secondary subtle pop (layering)
        setTimeout(() => {
          if (ctx.state === 'closed') return;
          const pop = ctx.createOscillator();
          const pEnv = ctx.createGain();
          pop.type = 'triangle';
          pop.frequency.setValueAtTime(400, ctx.currentTime);
          pop.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
          pEnv.gain.setValueAtTime(0.3, ctx.currentTime);
          pEnv.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          pop.connect(pEnv);
          pEnv.connect(ctx.destination);
          pop.start(ctx.currentTime);
          pop.stop(ctx.currentTime + 0.1);
        }, 150);

      } catch (e) { console.warn("Audio error", e); }
    };

    // Load canvas-confetti
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
    script.async = true;
    script.onload = () => {
      if (window.confetti) {
        playCelebrationSound();
        const isMobile = window.innerWidth < 768;
        const count = isMobile ? 60 : 150;

        // Fireworks burst - Central top fall
        window.confetti({
          particleCount: count,
          spread: 120,
          startVelocity: 45,
          gravity: 1.1,
          origin: { y: -0.1, x: 0.5 },
          colors: ['#6a5af9', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
          disableForReducedMotion: true
        });

        // Left Firework Burst
        setTimeout(() => {
          window.confetti({
            particleCount: Math.floor(count * 0.6),
            spread: 90,
            startVelocity: 35,
            gravity: 0.8,
            origin: { x: 0.15, y: 0.8 },
            colors: ['#f59e0b', '#ef4444', '#fff']
          });
        }, 200);

        // Right Firework Burst
        setTimeout(() => {
          window.confetti({
            particleCount: Math.floor(count * 0.6),
            spread: 90,
            startVelocity: 35,
            gravity: 0.8,
            origin: { x: 0.85, y: 0.8 },
            colors: ['#6a5af9', '#3b82f6', '#fff']
          });
        }, 400);
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [isPassed]);

  // Achievement Unlock Trigger
  useEffect(() => {
    if (accuracy === 100) {
      const timer1 = setTimeout(() => setShowAchievement(true), 1200);
      const timer2 = setTimeout(() => setShowAchievement(false), 5000);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
  }, [accuracy]);

  // Interactive Graph Data
  const chartDataConfig = {
    labels: ['Correct', 'Mistakes', 'Violations'],
    datasets: [
      {
        label: 'Count',
        data: [result.correctCount || 0, result.wrongCount || 0, result.violations || 0],
        backgroundColor: chartColors,
        borderRadius: 6,
        barThickness: 40,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1500,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { size: 14, family: 'sans-serif' },
        bodyFont: { size: 14, family: 'sans-serif' },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: 'rgba(255,255,255,0.6)', stepSize: 1 },
        grid: { color: 'rgba(255,255,255,0.05)' }
      },
      x: {
        ticks: { color: 'rgba(255,255,255,0.6)' },
        grid: { display: false }
      }
    }
  };

  const generateCertificate = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFillColor(240, 248, 255);
    doc.rect(0, 0, 297, 210, 'F');
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(4);
    doc.rect(10, 10, 277, 190);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1);
    doc.rect(14, 14, 269, 182);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.setTextColor(30, 64, 175);
    doc.text("CERTIFICATE OF ACHIEVEMENT", 148.5, 45, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.setTextColor(100, 116, 139);
    doc.text("This certificate is proudly presented to", 148.5, 70, { align: "center" });
    doc.setFont("times", "bolditalic");
    doc.setFontSize(36);
    doc.setTextColor(15, 23, 42);
    doc.text(studentName.toUpperCase(), 148.5, 95, { align: "center" });
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(70, 105, 227, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.setTextColor(71, 85, 105);
    doc.text(`For successfully completing the examination:`, 148.5, 120, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.text(testName, 148.5, 135, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`Score: ${accuracy}%`, 148.5, 150, { align: "center" });
    const dateStr = new Date().toLocaleDateString();
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(dateStr, 60, 175, { align: "center" });
    doc.line(40, 180, 80, 180);
    doc.text("Date", 60, 186, { align: "center" });
    doc.setFont("times", "italic");
    doc.text("ExamGuard Platform", 237, 175, { align: "center" });
    doc.line(207, 180, 267, 180);
    doc.setFont("helvetica", "normal");
    doc.text("Authorized Signature", 237, 186, { align: "center" });
    doc.setFillColor(30, 64, 175);
    doc.circle(148.5, 175, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("VERIFIED", 148.5, 176, { align: "center" });
    doc.save(`${studentName}_Certificate.pdf`);
  };

  return (
    <>
      {/* Dynamic Inline Styles for Shimmer */}
      <style>{`
        @keyframes shimmer-shine {
          0% { transform: translateX(-150%) skewX(-15deg); }
          100% { transform: translateX(250%) skewX(-15deg); }
        }
        .animate-shimmer-shine {
          animation: shimmer-shine 2.5s infinite linear;
        }
      `}</style>

      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex justify-center items-center p-4 sm:p-6"
      >
        <motion.div 
          initial={{ y: 0, scale: 0.8, opacity: 0, filter: 'blur(10px)' }} 
          animate={{ y: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }} 
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-slate-700/50 w-full max-w-6xl max-h-[95vh] overflow-y-auto text-white custom-scrollbar"
        >
          {/* Header */}
          <div className="sticky top-0 z-20 p-6 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl flex justify-between items-center rounded-t-3xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <BarChart2 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                  Performance Report
                </h2>
                <p className="text-sm text-slate-400 font-medium">{testName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>
          
          <div className="p-6 md:p-8 space-y-8">
            
            {/* Top Section: Progress Ring & Status */}
            <div className="flex flex-col md:flex-row gap-8 items-center justify-between bg-white/5 border border-white/10 p-6 rounded-2xl relative overflow-visible shadow-lg">
              
              {/* Perfect Score Badge */}
              {accuracy === 100 && (
                <motion.div 
                  initial={{ rotate: -15, scale: 0 }}
                  animate={{ rotate: 12, scale: 1 }}
                  transition={{ type: 'spring', delay: 0.6, bounce: 0.5 }}
                  className="absolute -top-6 -right-4 md:-top-8 md:-right-6 bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-500 text-yellow-950 font-black px-8 py-3 rounded-xl shadow-[0_0_40px_rgba(250,204,21,0.8)] transform rotate-12 z-30 border-2 border-yellow-100 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/50 w-8 animate-shimmer-shine" />
                  <span className="drop-shadow-[0_2px_2px_rgba(255,255,255,0.8)] tracking-wider">PERFECT SCORE!</span>
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 w-full md:w-auto">
                  {/* Progress Ring */}
                  <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0" style={{ filter: `drop-shadow(0 0 15px ${glowColor})` }}>
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" className="stroke-slate-700/50" strokeWidth="8" fill="none" />
                      <motion.circle 
                        cx="50" cy="50" r="40" 
                        className={`stroke-current ${accuracy >= 90 ? 'text-green-400' : accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'}`}
                        strokeWidth="8" fill="none" strokeLinecap="round"
                        initial={{ strokeDasharray: "0 251.2" }}
                        animate={{ strokeDasharray: `${(accuracy / 100) * 251.2} 251.2` }}
                        transition={{ duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        className="text-4xl font-black drop-shadow-md"
                      >
                        {accuracy}%
                      </motion.span>
                    </div>
                  </div>

                  <div className="text-center sm:text-left">
                    <h3 className="text-lg text-slate-400 font-semibold mb-3">Overall Status</h3>
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                      className={`inline-flex items-center px-5 py-2 rounded-full font-bold border ${statusColor} shadow-lg backdrop-blur-md`}
                    >
                      <Target className="w-5 h-5 mr-2" /> {performanceStatus}
                    </motion.div>
                    
                    <div className="flex justify-center sm:justify-start mt-4 gap-1.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <motion.div
                          key={star}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.8 + (star * 0.1), type: 'spring' }}
                        >
                          <Star className={`w-7 h-7 ${star <= stars ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]' : 'fill-slate-700/50 text-slate-700/50'}`} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
              </div>

              {/* Certificate Action */}
              <div className="text-center md:text-right mt-6 md:mt-0 w-full md:w-auto">
                {isPassed ? (
                    <motion.button 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.2 }}
                      whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(168, 85, 247, 0.8)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={generateCertificate}
                      className="flex items-center justify-center w-full md:w-auto px-8 py-4 bg-[linear-gradient(45deg,#6a5af9,#a855f7)] text-white font-bold rounded-xl shadow-[0_0_20px_rgba(106,90,249,0.5)] transition-all group border border-purple-400/50 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                      <Download className="w-5 h-5 mr-3 group-hover:-translate-y-1 transition-transform relative z-10" />
                      <span className="relative z-10 text-lg">Claim Certificate</span>
                    </motion.button>
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-xl backdrop-blur-sm">
                      <p className="text-red-400 font-bold mb-1 flex items-center justify-center md:justify-end text-lg">
                        <AlertCircle className="w-5 h-5 mr-2" /> Not Eligible
                      </p>
                      <p className="text-sm text-slate-400">Score ≥ 60% required to claim.</p>
                    </div>
                  )}
              </div>
            </div>

            {/* Stat Cards - Responsive Grid with Hover Glow */}
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              {[
                { label: "Score", value: result.score || 0, icon: <CheckCircle className="text-blue-400 w-6 h-6" />, color: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/20", shadow: "hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]" },
                { label: "Accuracy", value: `${accuracy}%`, icon: <Target className="text-green-400 w-6 h-6" />, color: "from-green-500/10 to-green-600/5", border: "border-green-500/20", shadow: "hover:shadow-[0_0_25px_rgba(34,197,94,0.3)]" },
                { label: "Mistakes", value: result.wrongCount || 0, icon: <AlertCircle className="text-red-400 w-6 h-6" />, color: "from-red-500/10 to-red-600/5", border: "border-red-500/20", shadow: "hover:shadow-[0_0_25px_rgba(239,68,68,0.3)]" },
                { label: "Violations", value: result.violations || 0, icon: <AlertCircle className="text-orange-400 w-6 h-6" />, color: "from-orange-500/10 to-orange-600/5", border: "border-orange-500/20", shadow: "hover:shadow-[0_0_25px_rgba(249,115,22,0.3)]" },
                { label: "Time Spent", value: timeSpentStr, icon: <Clock className="text-purple-400 w-6 h-6" />, color: "from-purple-500/10 to-purple-600/5", border: "border-purple-500/20", shadow: "hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]" },
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + (i * 0.1) }}
                  whileHover={{ scale: 1.05 }}
                  className={`bg-gradient-to-br ${stat.color} bg-white/5 backdrop-blur-md border ${stat.border} p-5 rounded-2xl flex flex-col items-center justify-center text-center group transition-all duration-300 ${stat.shadow}`}
                >
                  <div className="p-3 bg-white/5 rounded-full mb-3 group-hover:bg-white/10 transition-colors shadow-inner">
                    {stat.icon}
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5">{stat.label}</p>
                  <p className="text-3xl font-black text-white tracking-tight">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Detailed Analysis & Graph */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Interactive Graph */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-lg h-[24rem] flex flex-col group hover:bg-white/10 transition-colors duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
              >
                  <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center">
                    <BarChart2 className="w-5 h-5 mr-2 text-indigo-400 group-hover:animate-pulse" /> Performance Distribution
                  </h3>
                  <div className="flex-1 relative w-full h-full">
                    <Bar data={chartDataConfig} options={chartOptions} ref={chartRef} />
                  </div>
              </motion.div>

              {/* Detailed Analysis Section */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.3 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-lg flex flex-col h-[24rem] overflow-hidden group hover:bg-white/10 transition-colors duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
              >
                  <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center flex-shrink-0">
                    <Zap className="w-5 h-5 mr-2 text-yellow-400 group-hover:animate-bounce" /> Detailed Analysis
                  </h3>
                  
                  <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 space-y-5">
                    {/* MCQ Breakdowns */}
                    {result.answers && result.answers.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2 sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">MCQ Performance</h4>
                        {result.answers.map((ans, idx) => (
                          <div 
                            key={idx} 
                            className="flex flex-col text-sm bg-black/30 p-4 rounded-xl border border-white/5 hover:border-white/20 transition-colors"
                          >
                            <span className="font-semibold text-slate-200 mb-2 leading-snug">Q: {ans.questionText}</span>
                            <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                              <span className="text-slate-400">Your Answer: <span className={ans.isCorrect ? 'text-green-400 font-bold ml-1' : 'text-red-400 font-bold ml-1'}>{ans.studentAnswer || 'Skipped'}</span></span>
                              {!ans.isCorrect && <span className="text-green-400 font-medium">Correct: {ans.correctAnswer}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic text-sm text-center py-8">No MCQ data available.</p>
                    )}

                    {/* Typing Breakdown */}
                    {result.typing && (
                      <div className="space-y-3 pt-4 border-t border-white/10">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-1">Typing Performance</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex flex-col items-center justify-center shadow-inner">
                            <span className="text-slate-400 font-semibold mb-1">Net WPM</span>
                            <span className="text-3xl font-black text-blue-400 drop-shadow-sm">{result.typing.wpm}</span>
                          </div>
                          <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex flex-col items-center justify-center shadow-inner">
                            <span className="text-slate-400 font-semibold mb-1">Errors</span>
                            <span className="text-3xl font-black text-red-400 drop-shadow-sm">{result.typing.errors}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
              </motion.div>
            </div>

          </div>
        </motion.div>
      </motion.div>

      {/* 8. Achievement Popup (Perfect Score Toast) */}
      <AnimatePresence>
        {showAchievement && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.5 }}
            animate={{ y: 20, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-600 text-yellow-950 px-8 py-4 rounded-full shadow-[0_10px_40px_rgba(250,204,21,0.6)] font-bold flex items-center gap-4 z-[300] border-2 border-yellow-200"
          >
            <div className="bg-white/20 p-2 rounded-full">
              <Trophy className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-yellow-900/80">Achievement Unlocked</span>
              <span className="text-white text-2xl drop-shadow-md">Perfect Score!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ReportModal;
