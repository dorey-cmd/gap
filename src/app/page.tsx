// src/app/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  MessageSquare, 
  CheckCircle2, 
  Users, 
  TrendingUp, 
  Settings, 
  Brain, 
  ShieldCheck, 
  Gauge, 
  Download, 
  FileText,
  RefreshCw,
  HelpCircle,
  AlertCircle,
  Calendar,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { useAssessment } from "../hooks/useAssessment";
import { QUESTIONS, CATEGORIES } from "../data/diagnosticLibrary";
import { weaveReport, WeavedReport } from "../utils/reportWeaver";
import { fetchDraftFromSupabase } from "../lib/supabase";


const cleanSummaryText = (text: string) => {
  if (!text) return "";
  return text.replace(/\*/g, "");
};

export default function Home() {
  const {
    state,
    isHydrated,
    setAnswer,
    setComment,
    setCurrentStep,
    setFinalOneThing,
    setPersonalInfo,
    setIsCompleted,
    setAiSummary,
    resetAssessment,
    loadSessionData,
    getProgressMessage,
    calculateScores,
    totalQuestions,
    answeredCount,
    currentCategoryIndex,
    currentQuestionInCategoryIndex
  } = useAssessment();



  // Local state for UI flow
  const [commentOpen, setCommentOpen] = useState<{ [qId: number]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<number>(1);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Load remote session if "session" parameter is present in URL
  useEffect(() => {
    if (typeof window !== 'undefined' && isHydrated) {
      const params = new URLSearchParams(window.location.search);
      const urlSessionId = params.get('session');
      if (urlSessionId) {
        setIsSubmitting(true);
        fetchDraftFromSupabase(urlSessionId).then((data) => {
          if (data) {
            loadSessionData(data);
          } else {
            console.warn("No diagnostic session found for ID:", urlSessionId);
          }
          setIsSubmitting(false);
        }).catch((err) => {
          console.error("Error loading remote session:", err);
          setIsSubmitting(false);
        });
      }
    }
  }, [isHydrated]);


  // Category Transition Screen State
  const [showTransition, setShowTransition] = useState(false);
  const [pendingNextStep, setPendingNextStep] = useState<number | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadingPhrases = [
    "מנתח את הדפוסים התפעוליים ששיתפת...",
    "משקלל רמות בגרות ועצמאות תהליכית...",
    "בודק ערוצי זליגת הכנסות סמויים בעסק...",
    "מנסח תובנות מפתח אסטרטגיות למנהלים...",
    "מכין את מראת העסק האישית שלך..."
  ];

  // Rotate loading phrases
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSubmitting) {
      interval = setInterval(() => {
        setLoadingPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isSubmitting]);

  // Handle rating (simply sets the answer, allowing the user to reflect and proceed at their own pace)
  const handleRate = (questionId: number, rating: number) => {
    setAnswer(questionId, rating);
  };

  // Safe wrapper to handle Next step with category transitions
  const handleNextStep = () => {
    if (state.currentStep < totalQuestions) {
      // Check if we are at the end of a category (questions 7, 14, 21, 28, 35)
      if (state.currentStep % 7 === 0) {
        setPendingNextStep(state.currentStep + 1);
        setShowTransition(true);
      } else {
        setCurrentStep(state.currentStep + 1);
      }
    } else {
      setCurrentStep(43); // Go to final challenge question
    }
  };

  // Toggle comment field visibility
  const toggleComment = (qId: number) => {
    setCommentOpen(prev => ({ ...prev, [qId]: !prev[qId] }));
    
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
    }
  };

  // Handle Submit details
  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      alert("אנא אשר את תנאי השימוש וקבלת התכנים כדי להמשיך.");
      return;
    }
    if (!state.personalInfo.fullName || !state.personalInfo.phone || !state.personalInfo.email || !state.personalInfo.businessName) {
      alert("אנא מלא את כל פרטי החובה כדי לקבל את האבחון.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          answers: state.answers,
          comments: state.comments,
          finalOneThing: state.finalOneThing,
          personalInfo: state.personalInfo,
          sessionId: state.sessionId
        })
      });

      if (!response.ok) {
        throw new Error("Failed to process business diagnostic.");
      }

      const data = await response.json();
      if (data.report?.executiveSummary) {
        setAiSummary(data.report.executiveSummary);
      }
    } catch (err) {
      console.warn("Server-side diagnostic failed, falling back to client-side weaver:", err);
    } finally {
      setIsCompleted(true);
      setIsSubmitting(false);
      setCurrentStep(45); // Reveal report
    }
  };


  const handlePrintPdf = () => {
    setIsPdfGenerating(true);
    setTimeout(() => {
      window.print();
      setIsPdfGenerating(false);
    }, 500);
  };

  // Category Icons mapping for transitions
  const categoryIcons: { [key: number]: any } = {
    1: Users,
    2: TrendingUp,
    3: Settings,
    4: Brain,
    5: ShieldCheck,
    6: Gauge
  };

  const CurrentIcon = categoryIcons[currentCategoryIndex];
  const NextIcon = categoryIcons[Math.min(currentCategoryIndex + 1, 6)];

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-navy text-white">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-16 h-16 border-4 border-brand-secondary border-t-transparent rounded-full"
          />
          <p className="text-xl font-light tracking-wide text-brand-soft/80">טוען אבחון עסקי מבית AltruBiz...</p>
        </div>
      </div>
    );
  }

  const report: WeavedReport | null = state.isCompleted ? weaveReport(state) : null;
  if (report && state.aiSummary) {
    report.executiveSummary = state.aiSummary;
  }


  return (
    <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden bg-gradient-to-b from-[#f8fafc] to-[#ebf0f6] text-slate-800 font-sans selection:bg-brand-primary/10">
      
      {/* Visual background ambient glowing mesh */}
      <div className="absolute top-[-10%] left-[-15%] w-[600px] h-[600px] rounded-full bg-brand-primary/10 blur-[130px] pointer-events-none -z-10 animate-pulse duration-5000" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[700px] h-[700px] rounded-full bg-brand-secondary/8 blur-[160px] pointer-events-none -z-10" />

      {/* Global Branded Header */}
      <header className="w-full py-4 px-4 md:px-16 flex justify-between items-center border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-40 print:hidden">
        <div className="flex items-center gap-4">
          <img 
            src="https://storage.googleapis.com/msgsndr/O8tlYEQIUn4z3qPCt1FX/media/688019c09a4c2d4b4398bf3c.png" 
            alt="AltruBiz Logo" 
            className="h-12 md:h-20 w-auto object-contain hover:scale-105 transition-transform cursor-pointer"
            onClick={() => {
              if (confirm("האם ברצונך לאתחל את האבחון ולהתחיל מהתחלה?")) {
                resetAssessment();
                setCurrentStep(0);
              }
            }}
          />
          <div className="h-8 w-px bg-slate-300" />
          <span className="text-sm font-semibold tracking-wide text-brand-navy">אבחון חסמי צמיחה</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center max-w-5xl w-full mx-auto px-4 py-8 md:py-16 z-10">
        <AnimatePresence mode="wait">
          
          {/* CATEGORY TRANSITION SCREEN */}
          {showTransition && pendingNextStep && (
            <motion.div
              key="category-transition"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl w-full mx-auto text-center bg-white border border-slate-200/80 shadow-2xl rounded-3xl p-8 md:p-12 text-right"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-6 shadow-inner shadow-brand-primary/20">
                  {React.createElement(NextIcon, { className: "w-10 h-10 animate-bounce" })}
                </div>
                
                <span className="text-xs font-black text-brand-secondary tracking-widest uppercase mb-2">עברנו בהצלחה את השלב הקודם</span>
                <h2 className="text-3xl md:text-4xl font-black text-brand-navy mb-4">
                  סיימנו את נושא: {CATEGORIES[currentCategoryIndex]}
                </h2>
                
                <p className="text-base md:text-lg text-slate-500 max-w-lg mb-8 font-light leading-relaxed">
                  הבנו את הדפוסים התפעוליים שלך בקטגוריה זו. כעת, המראה התפעולית מעמיקה אל הנושא הבא: <br />
                  <strong className="text-brand-primary font-extrabold">{CATEGORIES[currentCategoryIndex + 1]}</strong>
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(pendingNextStep);
                    setShowTransition(false);
                    setPendingNextStep(null);
                  }}
                  className="py-4 px-10 bg-brand-navy hover:bg-[#061827] text-white font-bold rounded-2xl shadow-xl shadow-brand-navy/20 flex items-center gap-3 transition-bezier cursor-pointer text-base group"
                >
                  <span>המשך לנושא הבא</span>
                  <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 0: Landing / Welcome Screen */}
          {!showTransition && state.currentStep === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center flex flex-col items-center max-w-4xl mx-auto w-full px-2"
            >
              <img 
                src="https://storage.googleapis.com/msgsndr/O8tlYEQIUn4z3qPCt1FX/media/688019c09a4c2d4b4398bf3c.png" 
                alt="AltruBiz Logo" 
                className="h-20 md:h-28 w-auto object-contain mb-4 md:mb-6 hover:scale-105 transition-transform"
              />
              <div className="mb-2.5 py-1.5 px-4 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] md:text-xs font-black inline-flex items-center gap-2 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-brand-accent animate-pulse" />
                <span>מראה תפעולית עסקית אסטרטגית</span>
              </div>
              
              <h1 className="text-3xl md:text-5xl font-black text-brand-navy leading-tight tracking-tight mb-4">
                הפער שאף אחד <br />
                <span className="bg-gradient-to-l from-brand-primary to-brand-secondary bg-clip-text text-transparent">לא מדבר עליו</span>
              </h1>
              
              <p className="text-sm md:text-lg text-slate-600 leading-relaxed max-w-2xl font-light mb-6">
                אבחון עסקי אישי מבית <span className="font-extrabold text-brand-navy">AltruBiz</span> שחושף את חסמי הצמיחה שפוגעים בביצועים, יוצרים עומס תפעולי מנטלי ומונעים מהעסק להפוך לסיסטם יציב, מסודר ורווחי יותר.
              </p>

              {/* Pillars grid with extremely compact and responsive layout */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full mb-8">
                {[
                  { name: "ניהול לידים ולקוחות", icon: Users },
                  { name: "מעקב מכירות", icon: TrendingUp },
                  { name: "אוטומציה של תהליכים", icon: Settings },
                  { name: "שימוש ב-AI", icon: Brain },
                  { name: "תלות בבעלים", icon: ShieldCheck },
                  { name: "מוכנות לצמיחה", icon: Gauge }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.4 }}
                    className="p-3 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex items-center gap-3 text-right hover:border-brand-primary/30 transition-bezier group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-brand-primary/5 text-brand-primary flex items-center justify-center shrink-0 group-hover:bg-brand-primary group-hover:text-white transition-bezier">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-xs md:text-sm text-brand-navy leading-tight">{item.name}</span>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentStep(1)}
                className="py-3 px-10 bg-brand-primary hover:bg-[#0052a3] text-white font-bold rounded-xl shadow-lg shadow-brand-primary/20 flex items-center gap-3 transition-bezier cursor-pointer text-sm md:text-base group"
              >
                <span>התחל באבחון העסקי</span>
                <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
              </motion.button>
              
              <span className="text-xs md:text-sm text-slate-400 mt-5 font-light">
                מבנה שאלון מנותק ממתח: 42 שאלות המחולקות לפרקים • שמירה אוטומטית מלאה בכל רגע
              </span>
            </motion.div>
          )}

          {/* STEP 1-42: Questionnaire Screen with Segmented Progress */}
          {!showTransition && state.currentStep >= 1 && state.currentStep <= 42 && (
            <motion.div
              key={`question-${state.currentStep}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
              className="max-w-3xl w-full mx-auto px-2"
            >
              {/* Category-Segmented Progress Indicator */}
              <div className="mb-4 bg-white/80 border border-slate-200/50 p-3 md:p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-end mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                      {React.createElement(CurrentIcon, { className: "w-4 h-4" })}
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-brand-primary tracking-wider uppercase block">
                        נושא {currentCategoryIndex} מתוך 6
                      </span>
                      <h2 className="text-sm md:text-lg font-black text-brand-navy">
                        {CATEGORIES[currentCategoryIndex]}
                      </h2>
                    </div>
                  </div>
                  <span className="text-[10px] md:text-xs text-slate-500 font-bold">
                    שאלה {currentQuestionInCategoryIndex} מתוך 7
                  </span>
                </div>
                
                {/* Discrete Category Progress Segments (7 questions) */}
                <div className="grid grid-cols-7 gap-2.5 mb-3">
                  {[1, 2, 3, 4, 5, 6, 7].map((stepIdx) => {
                    const isCompleted = stepIdx < currentQuestionInCategoryIndex;
                    const isActive = stepIdx === currentQuestionInCategoryIndex;
                    return (
                      <div 
                        key={stepIdx}
                        className={`h-2.5 rounded-full overflow-hidden transition-bezier ${
                          isCompleted 
                            ? "bg-brand-primary" 
                            : isActive 
                              ? "bg-brand-primary/40" 
                              : "bg-slate-200"
                        }`}
                      />
                    );
                  })}
                </div>
                
                <p className="text-xs md:text-sm text-brand-primary font-semibold italic">
                  {getProgressMessage()}
                </p>
              </div>

              {/* The Statement Card with Elevated Visuals and Bigger Text */}
              <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-5 md:p-12 mb-4 md:mb-6 text-right relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-brand-primary" />
                
                {/* Question Statement (Larger Font) */}
                <h3 className="text-lg md:text-2xl font-black text-brand-navy leading-snug mb-6 md:mb-8">
                  {QUESTIONS[state.currentStep - 1].text}
                </h3>

                {/* Rating 1-4 Agreeability Grid (Capsule styling) - 2x2 grid on mobile for perfect fit */}
                <div className="mb-6 md:mb-8">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-4 mb-3">
                    {[
                      { val: 1, label: "כלל לא נכון" },
                      { val: 2, label: "לא כל כך נכון" },
                      { val: 3, label: "די נכון" },
                      { val: 4, label: "נכון מאוד" }
                    ].map((pill) => {
                      const isSelected = state.answers[state.currentStep] === pill.val;
                      return (
                        <button
                          key={pill.val}
                          type="button"
                          onClick={() => handleRate(state.currentStep, pill.val)}
                          className={`py-3 md:py-4.5 px-2 md:px-4 rounded-xl md:rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-bezier border font-bold ${
                            isSelected 
                              ? "bg-brand-navy border-brand-navy text-white shadow-lg shadow-brand-navy/15 scale-102" 
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:border-brand-primary/30 hover:bg-brand-primary/5 hover:scale-[1.01]"
                          }`}
                        >
                          <span className="text-base md:text-xl font-black mb-0.5">{pill.val}</span>
                          <span className="text-[10px] md:text-xs font-semibold">{pill.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment Box toggler and Expandable Area */}
                <div className="border-t border-slate-100 pt-8">
                  <button
                    type="button"
                    onClick={() => toggleComment(state.currentStep)}
                    className="text-sm text-slate-500 hover:text-brand-primary inline-flex items-center gap-2 font-bold transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-brand-primary" />
                    <span>{commentOpen[state.currentStep] || state.comments[state.currentStep] ? "💬 סגור הערה חופשית" : "💬 חשוב לי להוסיף... (אופציונלי)"}</span>
                  </button>

                  <AnimatePresence>
                    {(commentOpen[state.currentStep] || state.comments[state.currentStep]) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="overflow-hidden"
                      >
                        <textarea
                          placeholder="שתף כאן עובדות, קשיים, תחושות מנטליות או דוגמאות מתוך העסק... (זה יעזור לנו לדייק את הדוח שלך)"
                          value={state.comments[state.currentStep] || ""}
                          onChange={(e) => setComment(state.currentStep, e.target.value)}
                          className="w-full p-5 text-sm md:text-base border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:border-brand-primary focus:bg-white min-h-[100px] resize-y leading-relaxed text-slate-800"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Navigation controls */}
              <div className="flex justify-between items-center gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(state.currentStep - 1)}
                  className="py-3.5 px-8 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>הקודם</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="py-3.5 px-8 rounded-2xl bg-brand-primary hover:bg-[#0052a3] text-white font-bold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-brand-primary/10"
                >
                  <span>הבא</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 43: Final open-ended challenge question */}
          {!showTransition && state.currentStep === 43 && (
            <motion.div
              key="final-question"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="max-w-3xl w-full mx-auto"
            >
              <div className="mb-6">
                <span className="text-xs font-bold text-brand-primary tracking-wider uppercase">שלב סופי בשאלון</span>
                <h2 className="text-2xl md:text-3xl font-black text-brand-navy">האתגר המרכזי ביותר שלך</h2>
              </div>

              <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 md:p-14 mb-8 text-right relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-brand-primary" />
                <h3 className="text-xl md:text-2xl font-black text-brand-navy mb-4 leading-normal">
                  אם היית יכול לפתור רק בעיה אחת בתוך העסק ב-90 הימים הקרובים - מה היא הייתה?
                </h3>
                <p className="text-sm text-slate-500 mb-8 font-light leading-relaxed">
                  חשוב עמוק: היכן החיכוך הגדול ביותר שלך כיום? האם מדובר בגיוס לקוחות, שחיקה אישית, עבודות ידניות מתישות, או חוסר סנכרון בצוות?
                </p>

                <textarea
                  placeholder="כתוב כאן בצורה חופשית את הבעיה שהכי דחוף לך לפתור..."
                  value={state.finalOneThing}
                  onChange={(e) => setFinalOneThing(e.target.value)}
                  className="w-full p-5 text-sm md:text-base border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:border-brand-primary focus:bg-white min-h-[150px] resize-y leading-relaxed text-slate-800"
                />
              </div>

              <div className="flex justify-between items-center gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(42)}
                  className="py-3.5 px-8 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>הקודם</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(44)}
                  className="py-3.5 px-8 rounded-2xl bg-brand-primary hover:bg-[#0052a3] text-white font-bold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-brand-primary/10"
                >
                  <span>המשך ליצירת הדוח</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 44: Contact Capture with checkbox and processing screen */}
          {!showTransition && state.currentStep === 44 && (
            <motion.div
              key="contact-capture"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-lg w-full mx-auto"
            >
              {!isSubmitting ? (
                <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 md:p-10 text-right">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-brand-success/10 text-brand-success flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 animate-pulse" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-brand-navy mb-3">אבחון העסק מוכן!</h2>
                    <p className="text-sm text-slate-500 font-light leading-relaxed">
                      השלמנו את איסוף המידע האסטרטגי. אנו בונים כעת את דוח המראה התפעולי שלך.
                    </p>
                  </div>

                  <form onSubmit={handleSubmitContact} className="space-y-5">
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2">שם מלא *</label>
                      <input
                        type="text"
                        required
                        placeholder="ישראל ישראלי"
                        value={state.personalInfo.fullName}
                        onChange={(e) => setPersonalInfo({ fullName: e.target.value })}
                        className="w-full py-3 px-4 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-brand-primary focus:bg-white text-slate-800"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2">שם העסק / החברה *</label>
                      <input
                        type="text"
                        required
                        placeholder="העסק שלי בע״מ"
                        value={state.personalInfo.businessName}
                        onChange={(e) => setPersonalInfo({ businessName: e.target.value })}
                        className="w-full py-3 px-4 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-brand-primary focus:bg-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2">מספר טלפון נייד *</label>
                      <input
                        type="tel"
                        required
                        placeholder="050-0000000"
                        value={state.personalInfo.phone}
                        onChange={(e) => setPersonalInfo({ phone: e.target.value })}
                        className="w-full py-3 px-4 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-brand-primary focus:bg-white text-slate-800 text-left"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2">כתובת אימייל *</label>
                      <input
                        type="email"
                        required
                        placeholder="name@business.co.il"
                        value={state.personalInfo.email}
                        onChange={(e) => setPersonalInfo({ email: e.target.value })}
                        className="w-full py-3 px-4 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-brand-primary focus:bg-white text-slate-800 text-left"
                        dir="ltr"
                      />
                    </div>

                    {/* REQUIRED TERMS OPT-IN CHECKBOX */}
                    <div className="pt-3">
                      <label className="flex items-start gap-3 cursor-pointer text-xs md:text-sm text-slate-600 select-none">
                        <input
                          type="checkbox"
                          required
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-1 w-4 h-4 border border-slate-300 rounded accent-brand-primary"
                        />
                        <span className="leading-relaxed">
                          אני מאשר קבלת תכנים אסטרטגיים ומקצועיים, ניתוחים, הצעות ועדכונים מ-<strong>AltruBiz</strong> ואישור תנאי השימוש ומדיניות הפרטיות.
                        </span>
                      </label>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={!termsAccepted}
                        className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-bezier text-sm cursor-pointer ${
                          termsAccepted 
                            ? "bg-brand-primary hover:bg-[#0052a3] shadow-brand-primary/20" 
                            : "bg-slate-300 shadow-none cursor-not-allowed"
                        }`}
                      >
                        הפקת דוח אבחון עסקי אישי
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Luxurious processing screen */
                <div className="bg-brand-navy text-white rounded-3xl shadow-2xl p-8 md:p-16 text-center min-h-[420px] flex flex-col justify-center items-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-20 h-20 border-4 border-brand-secondary border-t-transparent rounded-full mb-8 shadow-md"
                  />
                  
                  <h3 className="text-2xl md:text-3xl font-black mb-3">מעבד את האבחון העסקי</h3>
                  
                  <div className="h-8 overflow-hidden relative w-full mb-6">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={loadingPhraseIndex}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="text-base font-light text-brand-secondary/90 w-full absolute"
                      >
                        {loadingPhrases[loadingPhraseIndex]}
                      </motion.p>
                    </AnimatePresence>
                  </div>

                  <p className="text-xs md:text-sm text-brand-soft/60 max-w-xs font-light leading-relaxed">
                    סורק דפוסי תלות במייסד ורמת בשלות לצמיחה על פי 42 מדדים...
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 45: Full Premium Report (The Digital Mirror) */}
          {!showTransition && state.currentStep === 45 && report && (
            <motion.div
              key="report-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="w-full flex flex-col text-right gap-8"
            >
              
              {/* Report Header Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white border border-slate-200/50 p-6 rounded-3xl shadow-sm print:hidden">
                <div>
                  <h1 className="text-2xl font-black text-brand-navy">הדוח מוכן! מראה אסטרטגית עבור {report.fullName}</h1>
                  <p className="text-sm text-slate-500 font-light">נפתח לצפייה וניתן לייצוא כקובץ ייעוץ אסטרטגי פרימיום</p>
                </div>
                
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={handlePrintPdf}
                    disabled={isPdfGenerating}
                    className="py-3 px-6 bg-brand-primary hover:bg-[#0052a3] text-white font-bold text-xs md:text-sm rounded-xl shadow-md shadow-brand-primary/10 inline-flex items-center justify-center gap-2 transition-bezier cursor-pointer flex-1 sm:flex-none"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isPdfGenerating ? "מייצא..." : "הורד כ-PDF"}</span>
                  </button>
                </div>
              </div>

              {/* REPORT CONTAINER FOR PRINT */}
              <div 
                ref={reportRef}
                className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-5 md:p-16 print:border-none print:shadow-none print:p-0 print:m-0"
              >
                
                {/* SECTION 1 - Branded Cover Page */}
                <div className="cover-page border-b-4 border-brand-primary pb-12 mb-12 flex flex-col justify-between min-h-[350px] print:min-h-0 print:border-b-2">
                  <div className="flex justify-between items-start">
                    <img 
                      src="https://storage.googleapis.com/msgsndr/O8tlYEQIUn4z3qPCt1FX/media/688019c09a4c2d4b4398bf3c.png" 
                      alt="AltruBiz Logo" 
                      className="h-24 md:h-36 w-auto object-contain print:h-28"
                    />
                    <div className="text-left">
                      <span className="text-xs text-slate-400 font-bold tracking-widest uppercase block mb-1">אבחון אסטרטגי מסווג</span>
                      <p className="text-xs text-slate-400 font-light">{report.date}</p>
                    </div>
                  </div>

                  <div className="my-10 text-right">
                    <span className="text-xs md:text-sm font-black text-brand-primary tracking-wider uppercase mb-3 block">דוח אבחון אישי מורחב</span>
                    <h1 className="text-4xl md:text-6xl font-black text-brand-navy leading-tight mb-4">
                      המציאות התפעולית <br />
                      של עסקך: <span className="bg-gradient-to-l from-brand-primary to-brand-secondary bg-clip-text text-transparent">מבט במראה</span>
                    </h1>
                    <div className="w-24 h-1.5 bg-brand-accent rounded-full" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 border border-slate-100 p-5 rounded-2xl print:bg-white print:border-slate-200">
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">שם בעל העסק</span>
                      <span className="text-sm font-bold text-brand-navy">{report.fullName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">שם העסק</span>
                      <span className="text-sm font-bold text-brand-navy">{report.businessName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">נקודת עוגן מרכזית</span>
                      <span className="text-sm font-bold text-brand-success">{report.strongestCategoryName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">צוואר בקבוק ראשי</span>
                      <span className="text-sm font-bold text-brand-error">{report.weakestCategoryName}</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 2 - Executive Summary ("The Big Picture") */}
                <div className="executive-summary mb-16 bg-gradient-to-br from-brand-soft/40 to-transparent border border-brand-soft/50 p-8 md:p-12 rounded-3xl shadow-sm text-right print:bg-white print:border-slate-200">
                  <h2 className="text-2xl md:text-3xl font-black text-brand-navy mb-6 flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-brand-accent" />
                    <span>התמונה הגדולה: סיכום מנהלים אסטרטגי</span>
                  </h2>
                  <div className="text-base md:text-lg text-slate-700 leading-relaxed font-light whitespace-pre-wrap">
                    {cleanSummaryText(report.executiveSummary)}
                  </div>
                </div>

                {/* SECTION 3 - Tabbed Interactive Category Breakdown */}
                <div className="mb-16">
                  <h2 className="text-2xl md:text-3xl font-black text-brand-navy mb-8 flex items-center gap-3 print:hidden">
                    <FileText className="w-6 h-6 text-brand-primary" />
                    <span>ניתוח מעמיק לפי קטגוריות עסקיות</span>
                  </h2>
                  
                  {/* Tabs Selector for Web Screen - beautifully scrollable horizontally on mobile */}
                  <div className="flex flex-nowrap overflow-x-auto pb-4 scrollbar-none gap-2 mb-8 border-b border-slate-200 print:hidden -mx-4 px-4 sm:flex-wrap sm:overflow-x-visible sm:pb-0 sm:mx-0 sm:px-0">
                    {report.categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveReportTab(cat.id)}
                        className={`py-3 px-5 rounded-2xl text-xs md:text-sm font-bold transition-bezier cursor-pointer flex-shrink-0 sm:flex-shrink ${
                          activeReportTab === cat.id
                            ? "bg-brand-navy text-white shadow-md"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents - Shown one at a time on web, but ALL at once on print */}
                  <div className="space-y-10">
                    {report.categories.map((cat) => {
                      const isTabActive = activeReportTab === cat.id;
                      
                      return (
                        <div
                          key={cat.id}
                          className={`category-card ${isTabActive ? "block" : "hidden"} print:block bg-white border border-slate-200 rounded-3xl p-5 md:p-12 shadow-sm print:shadow-none print:border-slate-200 print:mb-12 break-inside-avoid`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-6 mb-8">
                            <div>
                              <h3 className="text-xl md:text-2xl font-extrabold text-brand-navy">{cat.name}</h3>
                            </div>
                            
                            {/* Maturity indicator segments */}
                            <div className="flex items-center gap-3 mt-3 sm:mt-0 bg-slate-50 border border-slate-200/50 py-2 px-4 rounded-full">
                              <span className="text-xs text-slate-400 font-bold ml-1">רמת בגרות:</span>
                              <div className="flex gap-1.5">
                                {[1, 2, 3, 4, 5].map((lvl) => (
                                  <div 
                                    key={lvl}
                                    className={`w-4 h-4 rounded-full border ${
                                      lvl <= cat.level 
                                        ? "bg-gradient-to-tr from-brand-primary to-brand-secondary border-brand-primary shadow-sm" 
                                        : "bg-slate-200 border-slate-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mb-6">
                            <h4 className="text-lg md:text-xl font-extrabold text-brand-navy leading-normal bg-slate-50 border border-slate-200/50 p-4.5 rounded-2xl">
                              &ldquo;{cat.emotionalTitle}&rdquo;
                            </h4>
                          </div>

                          {/* Beautifully Structured Qualitative Results */}
                          <div className="space-y-6 text-base md:text-lg text-slate-600 leading-relaxed font-light">
                            {/* Diagnosis Block */}
                            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl text-right">
                              <span className="text-xs font-black text-brand-navy tracking-wider block mb-1.5 uppercase opacity-60">
                                📊 המצב הנוכחי בעסק
                              </span>
                              <p className="text-slate-700 font-light">{cat.diagnosisText}</p>
                            </div>
                            
                            {/* Business Cost Block (Pain) */}
                            <div className="bg-red-50/50 border border-red-100 p-5 rounded-2xl text-right">
                              <span className="text-xs font-black text-brand-error tracking-wider block mb-1.5 uppercase">
                                🛑 משמעות ועלויות תפעוליות
                              </span>
                              <p className="text-slate-700 font-light">{cat.businessCostText}</p>
                            </div>

                            
                            {/* Emotional Reflection Block (Mental Pain) */}
                            <div className="bg-amber-50/40 border border-amber-100 p-5 rounded-2xl text-right">
                              <span className="text-xs font-black text-amber-700 tracking-wider block mb-1.5 uppercase">
                                🧠 עומס מנטלי והשפעה רגשית
                              </span>
                              <p className="text-slate-700 font-light">{cat.emotionalReflectionText}</p>
                            </div>

                            {/* Dynamically Weaved User Comments for this category */}
                            {cat.userCommentsWeaved.length > 0 && (
                              <div className="p-6 border-r-4 border-brand-accent bg-slate-50 text-slate-700 italic font-normal text-sm md:text-base rounded-l-2xl">
                                <span className="font-bold text-brand-navy block not-italic mb-2 text-xs md:text-sm">🗣️ מתוך ההערות שכתבת במהלך האבחון:</span>
                                <div className="space-y-2">
                                  {cat.userCommentsWeaved.map((comment, idx) => (
                                    <p key={idx}>{comment}</p>
                                  ))}
                                </div>
                                <span className="text-[10px] md:text-xs text-slate-400 block mt-2.5 not-italic font-light">
                                  • דפוס זה מראה באופן חד-משמעי כיצד העומס הניהולי שציינת תלוי ישירות בחסרון של סיסטם תפעולי מסודר.
                                </span>
                              </div>
                            )}

                            {/* Future Vision Block (Hope) */}
                            <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl text-right">
                              <span className="text-xs font-black text-emerald-700 tracking-wider block mb-1.5 uppercase">
                                🌟 חזון ההצלחה העתידי
                              </span>
                              <p className="text-slate-700 font-light">{cat.futureVisionText}</p>
                            </div>

                            {/* Improvement Opportunity Block (Solution) */}
                            <div className="bg-brand-primary/5 border border-brand-primary/10 p-5 rounded-2xl text-right">
                              <span className="text-xs font-black text-brand-primary tracking-wider block mb-1.5 uppercase">
                                💡 ההזדמנות והדרך לפתרון
                              </span>
                              <p className="text-slate-700 font-bold">{cat.improvementOpportunityText}</p>
                            </div>
                          </div>

                          {/* Reflection Question Frame */}
                          <div className="mt-8 p-5 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                              <HelpCircle className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-xs text-brand-primary font-bold block mb-1">שאלת השראה ורפלקציה</span>
                              <p className="text-sm md:text-base font-bold text-brand-navy leading-normal">
                                {cat.reflectionQuestion}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION 4 - Final Summary Table */}
                <div className="roadmap-card mb-16 border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm break-inside-avoid">
                  <h2 className="text-2xl md:text-3xl font-black text-brand-navy mb-8 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-brand-success" />
                    <span>סיכום מפת דרכים אסטרטגית</span>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
                    <div className="p-6 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-400 block mb-1">העוגן התפעולי החזק</span>
                        <h4 className="font-extrabold text-base text-brand-navy mb-3">{report.strongestCategoryName}</h4>
                      </div>
                      <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
                        זוהי היכולת המובילה בעסק שלך כרגע. עליך לשמר אותה ולהשתמש בה כמנוף לביסוס שאר התהליכים.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-brand-error/5 border border-brand-error/10 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-400 block mb-1">נקודת החיכוך המרכזית</span>
                        <h4 className="font-extrabold text-base text-brand-error mb-3">{report.weakestCategoryName}</h4>
                      </div>
                      <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
                        {report.biggestFriction}
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-brand-accent/5 border border-brand-accent/10 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-400 block mb-1">ההזדמנות הגדולה ביותר</span>
                        <h4 className="font-extrabold text-base text-brand-navy mb-3">{report.weakestCategoryName}</h4>
                      </div>
                      <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
                        {report.biggestOpportunity}
                      </p>
                    </div>
                  </div>

                  {report.finalOneThing && (
                    <div className="mt-8 p-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-4">
                      <AlertCircle className="w-6 h-6 text-brand-primary shrink-0" />
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">מיקוד הבעיה ל-90 הימים הבאים</span>
                        <p className="text-sm md:text-base font-bold text-brand-navy mb-2 leading-normal">
                          &ldquo;{report.finalOneThing}&rdquo;
                        </p>
                        <p className="text-xs md:text-sm text-slate-500 font-light leading-relaxed">
                          פיתוח והטמעה של סיסטם תפעולי חכם שיענה על הבעיה הזו צפוי לשחרר למעלה מ-20 שעות עבודה שבועיות ולתמוך בצמיחה יציבה.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 5 - Premium Soft CTA (Consultation Invitation with cal.altrubiz.co.il) */}
                <div className="cta-card border-t border-slate-200 pt-12 text-center max-w-3xl mx-auto break-inside-avoid">
                  <h3 className="text-2xl md:text-3xl font-black text-brand-navy mb-6 leading-normal">
                    מתי בפעם האחרונה לקחת צעד אחורה והסתכלת על העסק שלך כסיסטם?
                  </h3>
                  
                  <p className="text-base md:text-lg text-slate-600 leading-relaxed font-light mb-8">
                    בעלי עסקים רבים מגלים שהפערים שנחשפו באבחון זה אינם דורשים מהם לעבוד קשה יותר. ברוב המקרים, הם דורשים בנייה של תהליכים ברורים יותר, שקיפות תפעולית רחבה ומערכות חכמות שיודעות לנהל את הדברים במקומם.
                  </p>
                  
                  <p className="text-base md:text-lg text-slate-600 leading-relaxed font-light mb-10">
                    לפעמים, שינויים תפעוליים קטנים במבנה העסק יוצרים רמה של שקט, שליטה וצמיחה שקשה מאוד להשיג באמצעות מאמץ אישי בלבד.
                  </p>

                  <div className="bg-brand-navy text-white p-8 md:p-12 rounded-3xl shadow-xl shadow-brand-navy/15 text-right mb-8 print:bg-white print:border print:border-slate-300 print:text-slate-800">
                    <h4 className="font-extrabold text-lg md:text-2xl mb-3 text-brand-secondary print:text-brand-navy">אנו מזמינים אותך לשיחת ייעוץ אסטרטגית שקטה (ללא מכירות)</h4>
                    <p className="text-xs md:text-sm font-light text-brand-soft/80 mb-8 leading-relaxed print:text-slate-600">
                      בשיחה קצרה של 25 דקות נשמח לעזור לך לפרק את הממצאים שקיבלת כאן, לזהות היכן בדיוק מתרחשת זליגת הכספים הגדולה ביותר אצלך, ולראות אילו שינויים קטנים במבנה התפעולי יכולים ליצור את השינוי הגדול ביותר אצלך בעסק.
                    </p>
                    
                    <div className="flex flex-col md:flex-row gap-5 items-stretch md:items-center justify-between border-t border-white/10 pt-8 print:border-slate-200">
                      <div>
                        <span className="text-[10px] md:text-xs text-brand-soft/50 block mb-1">יומן לקביעת פגישה מיידית</span>
                        <span className="text-xs md:text-sm font-extrabold text-white print:text-slate-800">cal.altrubiz.co.il</span>
                      </div>
                      
                      {/* UPDATED CTA BUTTON LEADING TO cal.altrubiz.co.il */}
                      <a
                        href="https://cal.altrubiz.co.il"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-3 px-8 bg-brand-primary hover:bg-[#0052a3] text-white font-extrabold text-xs md:text-sm rounded-xl shadow-md text-center inline-flex items-center justify-center gap-2 transition-bezier cursor-pointer print:border print:border-brand-primary print:text-brand-primary print:bg-transparent"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>תיאום שיחת אסטרטגיה ביומן</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 font-light block">
                    דוח זה נוצר באופן אוטומטי ומסווג על ידי מנוע האבחון של AltruBiz עבור {report.fullName}. כל הזכויות שמורות © {new Date().getFullYear()}.
                  </span>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Branded Footer */}
      <footer className="w-full py-6 text-center border-t border-slate-200/50 bg-white/40 text-xs text-slate-400 font-light print:hidden mt-auto">
        <span>הפער שאף אחד לא מדבר עליו • מבית AltruBiz • כל הזכויות שמורות © {new Date().getFullYear()}</span>
      </footer>

      {/* Styled print styles for premium A4 consulting-grade layout */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.2cm 1.2cm 1.2cm 1.2cm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            font-size: 10pt !important;
            line-height: 1.45 !important;
          }
          header, footer, button, .print\:hidden, .tabs-selector {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .bg-white {
            background-color: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          /* Forced Page Breaks and Exact Cenetering on A4 Pages */
          .cover-page {
            page-break-after: always !important;
            break-after: page !important;
            height: 26.5cm !important;
            min-height: 26.5cm !important;
            max-height: 26.5cm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            border-bottom: 2px solid #0066cc !important;
            margin: 0 !important;
            padding: 0 0 1.5cm 0 !important;
            box-sizing: border-box !important;
          }
          
          .executive-summary {
            page-break-after: always !important;
            break-after: page !important;
            height: 26.5cm !important;
            min-height: 26.5cm !important;
            max-height: 26.5cm !important;
            margin: 0 !important;
            padding: 1.5cm 0 !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            border: none !important;
            background: transparent !important;
          }
          
          .category-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            height: 26.5cm !important;
            min-height: 26.5cm !important;
            max-height: 26.5cm !important;
            margin: 0 !important;
            padding: 1cm 0 !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            border: none !important;
          }
          
          .category-card:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .roadmap-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            height: 26.5cm !important;
            min-height: 26.5cm !important;
            max-height: 26.5cm !important;
            margin: 0 !important;
            padding: 1.5cm 0 !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            border: none !important;
          }
          
          .cta-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            height: 26.5cm !important;
            min-height: 26.5cm !important;
            max-height: 26.5cm !important;
            margin: 0 !important;
            padding: 2cm 0 !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
          }
          
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .print\:block {
            display: block !important;
          }
          .print\:border {
            border: 1px solid #cbd5e1 !important;
          }
          .print\:border-slate-200 {
            border: 1px solid #e2e8f0 !important;
          }
          .print\:text-brand-navy {
            color: #0a2e4d !important;
          }
          .print\:text-slate-800 {
            color: #1e293b !important;
          }
        }
      `}</style>
    </div>
  );
}
