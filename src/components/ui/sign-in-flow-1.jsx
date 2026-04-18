import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

/* ── Pure CSS Dot Matrix Background ─────────────────────────────── */
const DotMatrixBackground = ({ reverse = false, colors = [[255,255,255]], dotSize = 4, gap = 20 }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth * 2;
      canvas.height = window.innerHeight * 2;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    };
    resize();
    window.addEventListener("resize", resize);

    const PHI = 1.618033988;
    const random = (x, y) => {
      const val = Math.tan(Math.sqrt((x * PHI - y) ** 2 + (y * PHI - x) ** 2) * 0.5) * x;
      return val - Math.floor(val);
    };

    const draw = () => {
      const t = (Date.now() - startTime.current) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cols = Math.ceil(w / gap);
      const rows = Math.ceil(h / gap);
      const cx = cols / 2;
      const cy = rows / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);

      for (let gx = 0; gx < cols; gx++) {
        for (let gy = 0; gy < rows; gy++) {
          const r = random(gx + 1, gy + 1);
          const dist = Math.sqrt((gx - cx) ** 2 + (gy - cy) ** 2);

          // Timing based on distance from center
          const introOffset = dist * 0.04 + r * 0.6;
          const outroOffset = (maxDist - dist) * 0.04 + random(gx + 42, gy + 42) * 0.8;

          const speed = 0.5;
          let alpha;
          if (reverse) {
            alpha = t * speed > outroOffset ? 0 : 1;
          } else {
            alpha = t * speed > introOffset ? 1 : 0;
          }

          // Flicker
          const flicker = random(gx, gy * Math.floor(t / 5 + r + 5));
          const opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1.0];
          alpha *= opacities[Math.floor(flicker * 10)] || 0.5;

          if (alpha <= 0.01) continue;

          const color = colors[Math.floor(r * colors.length) % colors.length];
          ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
          ctx.fillRect(gx * gap, gy * gap, dotSize, dotSize);
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [reverse, colors, dotSize, gap]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

export const CanvasRevealEffect = ({
  animationSpeed = 10,
  colors = [[255, 255, 255]],
  containerClassName,
  dotSize = 4,
  showGradient = true,
  reverse = false,
}) => {
  return (
    <div className={cn("h-full relative w-full", containerClassName)}>
      <DotMatrixBackground
        reverse={reverse}
        colors={colors}
        dotSize={dotSize}
        gap={20}
      />
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      )}
    </div>
  );
};

/* ── Animated Nav Link ──────────────────────────────────────────── */
const AnimatedNavLink = ({ href, children }) => (
  <a href={href} className="group relative inline-block overflow-hidden h-5 flex items-center text-sm">
    <div className="flex flex-col transition-transform duration-400 ease-out transform group-hover:-translate-y-1/2">
      <span className="text-gray-300">{children}</span>
      <span className="text-white">{children}</span>
    </div>
  </a>
);

/* ── MiniNavbar ─────────────────────────────────────────────────── */
function MiniNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState("rounded-full");
  const shapeTimeoutRef = useRef(null);

  useEffect(() => {
    if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current);
    if (isOpen) {
      setHeaderShapeClass("rounded-xl");
    } else {
      shapeTimeoutRef.current = setTimeout(() => setHeaderShapeClass("rounded-full"), 300);
    }
    return () => { if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current); };
  }, [isOpen]);

  const navLinks = [
    { label: "Manifesto", href: "#1" },
    { label: "Careers", href: "#2" },
    { label: "Discover", href: "#3" },
  ];

  return (
    <header className={`fixed top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pl-6 pr-6 py-3 backdrop-blur-sm ${headerShapeClass} border border-[#333] bg-[#1f1f1f57] w-[calc(100%-2rem)] sm:w-auto transition-[border-radius] duration-0`}>
      <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-8">
        {/* Logo */}
        <div className="relative w-5 h-5 flex items-center justify-center">
          <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 top-0 left-1/2 -translate-x-1/2 opacity-80" />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 left-0 top-1/2 -translate-y-1/2 opacity-80" />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 right-0 top-1/2 -translate-y-1/2 opacity-80" />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 bottom-0 left-1/2 -translate-x-1/2 opacity-80" />
        </div>
        {/* Desktop Nav */}
        <nav className="hidden sm:flex items-center space-x-4 sm:space-x-6 text-sm">
          {navLinks.map((l) => <AnimatedNavLink key={l.href} href={l.href}>{l.label}</AnimatedNavLink>)}
        </nav>
        {/* Desktop Buttons */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          <button className="px-3 py-2 text-sm border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 rounded-full hover:border-white/50 hover:text-white transition-colors">LogIn</button>
          <div className="relative group">
            <div className="absolute inset-0 -m-2 rounded-full hidden sm:block bg-gray-100 opacity-40 blur-lg pointer-events-none group-hover:opacity-60 group-hover:blur-xl group-hover:-m-3 transition-all" />
            <button className="relative z-10 px-3 py-2 text-sm font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 rounded-full hover:from-gray-200 hover:to-gray-400 transition-all">Signup</button>
          </div>
        </div>
        {/* Mobile Toggle */}
        <button className="sm:hidden flex items-center justify-center w-8 h-8 text-gray-300" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Menu">
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>
      {/* Mobile Menu */}
      <div className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden ${isOpen ? "max-h-[500px] opacity-100 pt-4" : "max-h-0 opacity-0 pt-0 pointer-events-none"}`}>
        <nav className="flex flex-col items-center space-y-4 text-base w-full">
          {navLinks.map((l) => <a key={l.href} href={l.href} className="text-gray-300 hover:text-white transition-colors w-full text-center">{l.label}</a>)}
        </nav>
        <div className="flex flex-col items-center space-y-4 mt-4 w-full">
          <button className="px-4 py-2 text-sm border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 rounded-full hover:border-white/50 hover:text-white transition-colors w-full">LogIn</button>
          <button className="px-4 py-2 text-sm font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 rounded-full hover:from-gray-200 hover:to-gray-400 transition-all w-full">Signup</button>
        </div>
      </div>
    </header>
  );
}

/* ── Main Sign-In Page ──────────────────────────────────────────── */
export const SignInPage = ({ className }) => {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState("email");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const codeInputRefs = useRef([]);
  const [initialCanvasVisible, setInitialCanvasVisible] = useState(true);
  const [reverseCanvasVisible, setReverseCanvasVisible] = useState(false);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (email) setStep("code");
  };

  useEffect(() => {
    if (step === "code") setTimeout(() => codeInputRefs.current[0]?.focus(), 500);
  }, [step]);

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) codeInputRefs.current[index + 1]?.focus();

    if (index === 5 && value && newCode.every((d) => d.length === 1)) {
      setReverseCanvasVisible(true);
      setTimeout(() => setInitialCanvasVisible(false), 50);
      setTimeout(() => setStep("success"), 2000);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) codeInputRefs.current[index - 1]?.focus();
  };

  const handleBackClick = () => {
    setStep("email");
    setCode(["", "", "", "", "", ""]);
    setReverseCanvasVisible(false);
    setInitialCanvasVisible(true);
  };

  return (
    <div className={cn("flex w-full flex-col min-h-screen bg-black relative", className)}>
      {/* ── Animated Background ── */}
      <div className="absolute inset-0 z-0">
        {initialCanvasVisible && (
          <div className="absolute inset-0">
            <CanvasRevealEffect animationSpeed={3} containerClassName="bg-black" colors={[[255,255,255]]} dotSize={4} reverse={false} />
          </div>
        )}
        {reverseCanvasVisible && (
          <div className="absolute inset-0">
            <CanvasRevealEffect animationSpeed={4} containerClassName="bg-black" colors={[[255,255,255]]} dotSize={4} reverse={true} />
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,1)_0%,_transparent_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col flex-1">
        <MiniNavbar />

        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="flex-1 flex flex-col justify-center items-center px-4">
            <div className="w-full mt-[150px] max-w-sm">
              <AnimatePresence mode="wait">
                {/* ── Email Step ── */}
                {step === "email" && (
                  <motion.div key="email" initial={{ opacity: 0, x: -100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.4, ease: "easeOut" }} className="space-y-6 text-center">
                    <div className="space-y-1">
                      <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white">Welcome Developer</h1>
                      <p className="text-[1.8rem] text-white/70 font-light">Your sign in component</p>
                    </div>

                    <div className="space-y-4">
                      <button className="backdrop-blur-[2px] w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-full py-3 px-4 transition-colors">
                        <span className="text-lg">G</span>
                        <span>Sign in with Google</span>
                      </button>
                      <div className="flex items-center gap-4">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-white/40 text-sm">or</span>
                        <div className="h-px bg-white/10 flex-1" />
                      </div>
                      <form onSubmit={handleEmailSubmit}>
                        <div className="relative">
                          <input type="email" placeholder="info@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full backdrop-blur-[1px] bg-transparent text-white border border-white/10 rounded-full py-3 px-4 focus:outline-none focus:border-white/30 text-center" required />
                          <button type="submit" className="absolute right-1.5 top-1.5 text-white w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors group overflow-hidden">
                            <span className="relative w-full h-full block overflow-hidden">
                              <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-full">→</span>
                              <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 -translate-x-full group-hover:translate-x-0">→</span>
                            </span>
                          </button>
                        </div>
                      </form>
                    </div>
                    <p className="text-xs text-white/40 pt-10">
                      By signing up, you agree to the <Link to="#" className="underline text-white/40 hover:text-white/60">MSA</Link>, <Link to="#" className="underline text-white/40 hover:text-white/60">Product Terms</Link>, <Link to="#" className="underline text-white/40 hover:text-white/60">Policies</Link>, <Link to="#" className="underline text-white/40 hover:text-white/60">Privacy Notice</Link>, and <Link to="#" className="underline text-white/40 hover:text-white/60">Cookie Notice</Link>.
                    </p>
                  </motion.div>
                )}

                {/* ── Code Step ── */}
                {step === "code" && (
                  <motion.div key="code" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} transition={{ duration: 0.4, ease: "easeOut" }} className="space-y-6 text-center">
                    <div className="space-y-1">
                      <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white">We sent you a code</h1>
                      <p className="text-[1.25rem] text-white/50 font-light">Please enter it</p>
                    </div>
                    <div className="w-full">
                      <div className="rounded-full py-4 px-5 border border-white/10 bg-transparent">
                        <div className="flex items-center justify-center">
                          {code.map((digit, i) => (
                            <div key={i} className="flex items-center">
                              <div className="relative">
                                <input ref={(el) => { codeInputRefs.current[i] = el; }} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={1} value={digit} onChange={(e) => handleCodeChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} className="w-8 text-center text-xl bg-transparent text-white border-none focus:outline-none appearance-none" style={{ caretColor: "transparent" }} />
                                {!digit && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-xl text-white/30">0</span></div>}
                              </div>
                              {i < 5 && <span className="text-white/20 text-xl">|</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <motion.p className="text-white/50 hover:text-white/70 transition-colors cursor-pointer text-sm" whileHover={{ scale: 1.02 }}>Resend code</motion.p>
                    <div className="flex w-full gap-3">
                      <motion.button onClick={handleBackClick} className="rounded-full bg-white text-black font-medium px-8 py-3 hover:bg-white/90 transition-colors w-[30%]" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Back</motion.button>
                      <motion.button className={`flex-1 rounded-full font-medium py-3 border transition-all duration-300 ${code.every((d) => d) ? "bg-white text-black border-transparent hover:bg-white/90 cursor-pointer" : "bg-[#111] text-white/50 border-white/10 cursor-not-allowed"}`} disabled={!code.every((d) => d)}>Continue</motion.button>
                    </div>
                    <p className="text-xs text-white/40 pt-10">
                      By signing up, you agree to the <Link to="#" className="underline text-white/40 hover:text-white/60">MSA</Link>, <Link to="#" className="underline text-white/40 hover:text-white/60">Product Terms</Link>, and <Link to="#" className="underline text-white/40 hover:text-white/60">Policies</Link>.
                    </p>
                  </motion.div>
                )}

                {/* ── Success Step ── */}
                {step === "success" && (
                  <motion.div key="success" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }} className="space-y-6 text-center">
                    <div className="space-y-1">
                      <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white">You're in!</h1>
                      <p className="text-[1.25rem] text-white/50 font-light">Welcome</p>
                    </div>
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }} className="py-10">
                      <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-white to-white/70 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </motion.div>
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="w-full rounded-full bg-white text-black font-medium py-3 hover:bg-white/90 transition-colors">Continue to Dashboard</motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
