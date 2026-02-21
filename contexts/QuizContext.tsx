import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { questions as defaultQuestions } from '@/data/questions';

export interface Question {
  id: number;
  type: 'multiple' | 'truefalse' | 'checkbox';
  question: string;
  choices: Record<string, string>;
  answer: string | string[];
}

interface QuizContextType {
  questions: Question[];
  setQuestions: (questions: Question[]) => void;
  timerDuration: number; // in seconds
  setTimerDuration: (duration: number) => void;
  loadQuestions: () => Promise<void>;
  saveQuestions: () => Promise<void>;
  loadTimer: () => Promise<void>;
  saveTimer: () => Promise<void>;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

const QUESTIONS_KEY = '@quiz_questions';
const TIMER_KEY = '@quiz_timer_duration';

export function QuizProvider({ children }: { children: React.ReactNode }) {
  const [questions, setQuestionsState] = useState<Question[]>(defaultQuestions);
  const [timerDuration, setTimerDurationState] = useState<number>(0); // 0 means no timer

  const loadQuestions = async () => {
    try {
      const stored = await AsyncStorage.getItem(QUESTIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setQuestionsState(parsed);
      } else {
        setQuestionsState(defaultQuestions);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      setQuestionsState(defaultQuestions);
    }
  };

  const saveQuestions = async () => {
    try {
      await AsyncStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
    } catch (error) {
      console.error('Error saving questions:', error);
    }
  };

  const loadTimer = async () => {
    try {
      const stored = await AsyncStorage.getItem(TIMER_KEY);
      if (stored) {
        setTimerDurationState(parseInt(stored, 10));
      }
    } catch (error) {
      console.error('Error loading timer:', error);
    }
  };

  const saveTimer = async () => {
    try {
      await AsyncStorage.setItem(TIMER_KEY, timerDuration.toString());
    } catch (error) {
      console.error('Error saving timer:', error);
    }
  };

  const setQuestions = (newQuestions: Question[]) => {
    setQuestionsState(newQuestions);
  };

  const setTimerDuration = (duration: number) => {
    setTimerDurationState(duration);
  };

  useEffect(() => {
    loadQuestions();
    loadTimer();
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      saveQuestions();
    }
  }, [questions]);

  useEffect(() => {
    saveTimer();
  }, [timerDuration]);

  return (
    <QuizContext.Provider
      value={{
        questions,
        setQuestions,
        timerDuration,
        setTimerDuration,
        loadQuestions,
        saveQuestions,
        loadTimer,
        saveTimer,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
}
