// src/hooks/useAssessment.ts
"use client";

import { useState, useEffect } from 'react';
import { QUESTIONS, CATEGORIES, Q_PER_CATEGORY } from '../data/diagnosticLibrary';
import { syncDraftToSupabase } from '../lib/supabase';

export interface PersonalInfo {
  fullName: string;
  phone: string;
  email: string;
  businessName: string;
}

export interface AssessmentState {
  answers: { [questionId: number]: number };
  comments: { [questionId: number]: string };
  currentStep: number; // 0 = welcome, 1-18 = questions, 19 = final question, 20 = contact, 21 = report
  finalOneThing: string;
  personalInfo: PersonalInfo;
  isCompleted: boolean;
  sessionId: string;
  aiSummary?: string;
}


const DEFAULT_STATE: AssessmentState = {
  answers: {},
  comments: {},
  currentStep: 0,
  finalOneThing: "",
  personalInfo: {
    fullName: "",
    phone: "",
    email: "",
    businessName: "",
  },
  isCompleted: false,
  sessionId: "",
  aiSummary: "",
};


const STORAGE_KEY = "altrubiz_diagnostic_state_v3"; // Bump storage version due to full 42 statement migration

export function useAssessment() {
  const [state, setState] = useState<AssessmentState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Hydrate state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AssessmentState;
          setState(parsed);
        } catch (e) {
          console.error("Error parsing stored diagnostic state:", e);
        }
      } else {
        const newSessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        const newState = { ...DEFAULT_STATE, sessionId: newSessionId };
        setState(newState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      }
      setIsHydrated(true);
    }
  }, []);

  // 2. Helper to update state and persist
  const updateState = (updater: (prev: AssessmentState) => AssessmentState) => {
    setState((prev) => {
      const next = updater(prev);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }

      // Background sync to server if personal info exists
      if (next.personalInfo.fullName || next.personalInfo.email) {
        syncDraftToSupabase({
          sessionId: next.sessionId,
          fullName: next.personalInfo.fullName,
          phone: next.personalInfo.phone,
          email: next.personalInfo.email,
          businessName: next.personalInfo.businessName,
          answers: next.answers,
          comments: next.comments,
          finalOneThing: next.finalOneThing,
          completed: next.isCompleted,
        });
      }

      return next;
    });
  };

  const setAnswer = (questionId: number, value: number) => {
    updateState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: value }
    }));
  };

  const setComment = (questionId: number, value: string) => {
    updateState((prev) => ({
      ...prev,
      comments: { ...prev.comments, [questionId]: value }
    }));
  };

  const setCurrentStep = (step: number) => {
    updateState((prev) => ({
      ...prev,
      currentStep: step
    }));
  };

  const setFinalOneThing = (value: string) => {
    updateState((prev) => ({
      ...prev,
      finalOneThing: value
    }));
  };

  const setPersonalInfo = (info: Partial<PersonalInfo>) => {
    updateState((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, ...info }
    }));
  };

  const setIsCompleted = (value: boolean) => {
    updateState((prev) => ({
      ...prev,
      isCompleted: value
    }));
  };

  const setAiSummary = (summary: string) => {
    updateState((prev) => ({
      ...prev,
      aiSummary: summary
    }));
  };


  const resetAssessment = () => {
    const newSessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const freshState = {
      ...DEFAULT_STATE,
      sessionId: newSessionId
    };
    setState(freshState);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));
    }
  };

  const loadSessionData = (data: any) => {
    const loadedState = {
      answers: data.answers || {},
      comments: data.comments || {},
      currentStep: QUESTIONS.length + 3, // Skip to report
      finalOneThing: data.final_one_thing || "",
      personalInfo: {
        fullName: data.full_name || "",
        phone: data.phone || "",
        email: data.email || "",
        businessName: data.business_name || "",
      },
      isCompleted: true,
      sessionId: data.session_id,
      aiSummary: data.ai_summary || "",
    };
    setState(loadedState);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedState));
    }
  };



  // 3. Emotional progress phrase generator based on current question index (adapted for dynamic questions)
  const getProgressMessage = (): string => {
    const answeredCount = Object.keys(state.answers).length;
    const total = QUESTIONS.length;
    if (answeredCount === 0) return "יוצאים לדרך להבנת התמונה הרחבה...";
    if (answeredCount <= 5) return "אנחנו מתחילים להבין את התמונה הרחבה...";
    if (answeredCount <= 10) return "התמונה התפעולית של העסק שלך הולכת ומתבהרת...";
    if (answeredCount <= 15) return "הדפוסים התפעוליים והניהוליים מתחילים להתחבר...";
    if (answeredCount < total) return "כמעט אספנו מספיק מידע כדי לחשוף את צווארי הבקבוק הסמויים...";
    return "כל פיסות המידע התחברו. הניתוח מוכן לגילוי.";
  };

  // 4. Score engine for Q_PER_CATEGORY questions per category and 1-4 scale
  const calculateScores = () => {
    const categoryTotals: { [catId: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const categoryCounts: { [catId: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    QUESTIONS.forEach((q) => {
      const rawValue = state.answers[q.id] || 2; // Default to neutral/low agreement if unanswered
      // 1-4 scale: 5 - rawValue maps reverse questions
      const scoredValue = q.isReverse ? (5 - rawValue) : rawValue;
      categoryTotals[q.category] += scoredValue;
      categoryCounts[q.category] += 1;
    });

    const categoryMaturity: { [catId: number]: { score: number; percentage: number; level: number } } = {};

    Object.keys(CATEGORIES).forEach((catStr) => {
      const catId = parseInt(catStr);
      const total = categoryTotals[catId];
      const maxPossible = categoryCounts[catId] * 4; // Max possible points (Q_PER_CATEGORY * 4)
      const minPossible = categoryCounts[catId] * 1; // Min possible points (Q_PER_CATEGORY * 1)
      
      // Calculate 0-100 percentage based on scale limits
      const percentage = Math.round(((total - minPossible) / (maxPossible - minPossible)) * 100);
      
      // Map percentage to maturity levels 1 to 5
      let level = 3;
      if (percentage <= 35) level = 1;
      else if (percentage <= 55) level = 2;
      else if (percentage <= 75) level = 3;
      else if (percentage <= 90) level = 4;
      else level = 5;

      categoryMaturity[catId] = {
        score: total,
        percentage,
        level
      };
    });

    return categoryMaturity;
  };

  // Helper values for category-segmented progress tracking
  const currentCategoryIndex = state.currentStep >= 1 && state.currentStep <= QUESTIONS.length 
    ? Math.ceil(state.currentStep / Q_PER_CATEGORY) 
    : 1;

  const currentQuestionInCategoryIndex = state.currentStep >= 1 && state.currentStep <= QUESTIONS.length 
    ? ((state.currentStep - 1) % Q_PER_CATEGORY) + 1 
    : 1;

  return {
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
    totalQuestions: QUESTIONS.length,
    answeredCount: Object.keys(state.answers).length,
    currentCategoryIndex,
    currentQuestionInCategoryIndex
  };
}

