import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQuiz } from '@/contexts/QuizContext';

const HIGHEST_SCORE_KEY = '@quiz_highest_score';

export default function PreviewQuizTab() {
  const router = useRouter();
  const { questions, timerDuration } = useQuiz();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset everything when questions change - I want a fresh start each time
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setScore(0);
    setIsTimerActive(false);
    setTimeRemaining(null);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  }, [questions]);

  // I start the timer automatically when the user selects their first answer
  useEffect(() => {
    if (timerDuration > 0 && !isTimerActive && Object.keys(answers).length > 0 && timeRemaining === null) {
      setIsTimerActive(true);
      setTimeRemaining(timerDuration);
    }
  }, [answers, timerDuration, isTimerActive, timeRemaining]);

  // My score calculation logic - handles both single and multiple choice answers
  const calculateScore = useCallback(async () => {
    let newScore = 0;
    
    questions.forEach((question, index) => {
      const userAnswer = answers[index];
      const correctAnswer = question.answer;
      
      if (Array.isArray(correctAnswer)) {
        // Checkbox questions need array comparison - I sort both to make sure order doesn't matter
        const userAnswers = Array.isArray(userAnswer) ? userAnswer.sort() : [];
        const correctAnswers = [...correctAnswer].sort();
        if (JSON.stringify(userAnswers) === JSON.stringify(correctAnswers)) {
          newScore++;
        }
      } else {
        // Simple comparison for single choice questions
        if (userAnswer === correctAnswer) {
          newScore++;
        }
      }
    });

    setScore(newScore);
    
    // I save the highest score so users can see their best attempt
    try {
      const highestScore = await AsyncStorage.getItem(HIGHEST_SCORE_KEY);
      const highest = highestScore ? parseInt(highestScore, 10) : 0;
      if (newScore > highest) {
        await AsyncStorage.setItem(HIGHEST_SCORE_KEY, newScore.toString());
      }
    } catch (error) {
      console.error('Error saving highest score:', error);
    }

    // Navigate to the results screen with the score
    router.push({
      pathname: '/results',
      params: {
        score: newScore.toString(),
        total: questions.length.toString(),
      },
    });
  }, [questions, answers, router]);

  // When timer hits zero, I automatically submit the quiz
  const handleAutoSubmit = useCallback(async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsTimerActive(false);
    await calculateScore();
  }, [calculateScore]);

  // My timer countdown logic - runs every second
  useEffect(() => {
    if (isTimerActive && timeRemaining !== null && timeRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            setIsTimerActive(false);
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            // Time's up! Auto-submit
            handleAutoSubmit();
            return 0;
          }
          
          return prev - 1;
        });
      }, 1000);
    } else if (timeRemaining === 0) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerActive, timeRemaining, handleAutoSubmit]);

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.emptyText}>No questions available. Please add questions in Quiz Settings.</ThemedText>
      </ThemedView>
    );
  }

  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswerSelect = (choice: string) => {
    const questionType = questions[currentQuestionIndex]?.type;
    
    if (questionType === 'checkbox') {
      // For checkbox questions, I allow multiple selections - toggle on/off
      setAnswers((prevAnswers) => {
        const currentAnswer = prevAnswers[currentQuestionIndex];
        const currentAnswers = Array.isArray(currentAnswer) ? [...currentAnswer] : [];
        
        // Toggle the selection - if it's already selected, remove it
        const choiceIndex = currentAnswers.indexOf(choice);
        let newAnswers: string[];
        
        if (choiceIndex > -1) {
          // Already selected, so I remove it
          newAnswers = currentAnswers.filter(a => a !== choice);
        } else {
          // Not selected yet, so I add it
          newAnswers = [...currentAnswers, choice];
        }
        
        return { ...prevAnswers, [currentQuestionIndex]: newAnswers };
      });
    } else {
      // Single choice - just replace the answer
      setAnswers((prevAnswers) => ({
        ...prevAnswers,
        [currentQuestionIndex]: choice,
      }));
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      calculateScore();
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const isSelected = (choice: string) => {
    const currentAnswer = answers[currentQuestionIndex];
    if (Array.isArray(currentAnswer)) {
      return currentAnswer.includes(choice);
    }
    return currentAnswer === choice;
  };

  const isCurrentQuestionAnswered = () => {
    const currentAnswer = answers[currentQuestionIndex];
    if (!currentAnswer) {
      return false;
    }
    if (Array.isArray(currentAnswer)) {
      return currentAnswer.length > 0;
    }
    return true;
  };

  const handleNextWithValidation = () => {
    if (!isCurrentQuestionAnswered()) {
      Alert.alert('Please Answer', 'You must answer this question before proceeding.');
      return;
    }
    handleNext();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ThemedView style={styles.container}>
      {/* Timer Display */}
      {timerDuration > 0 && timeRemaining !== null && (
        <View style={styles.timerContainer}>
          <View style={[styles.timerBadge, timeRemaining <= 10 && styles.timerBadgeWarning]}>
            <View style={styles.timerIconContainer}>
              <View style={[styles.timerIconCircle, timeRemaining <= 10 && styles.timerIconCircleWarning]}>
                <View style={styles.timerIconHand} />
              </View>
            </View>
            <ThemedText style={styles.timerText}>
              {formatTime(timeRemaining)}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <ThemedText style={styles.progressText}>
          {currentQuestionIndex + 1} / {questions.length}
        </ThemedText>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <View style={styles.questionBadge}>
                <ThemedText style={styles.questionBadgeText}>
                  Question {currentQuestionIndex + 1}
                </ThemedText>
              </View>
            </View>

            <ThemedText type="subtitle" style={styles.question}>
              {currentQuestion.question}
            </ThemedText>

            <View style={styles.choicesContainer}>
              {Object.entries(currentQuestion.choices).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.choiceButton,
                    isSelected(key) && styles.choiceButtonSelected,
                  ]}
                  onPress={() => handleAnswerSelect(key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.choiceContent}>
                    <View style={[
                      styles.choiceIndicator,
                      isSelected(key) && styles.choiceIndicatorSelected,
                    ]}>
                      <ThemedText style={[
                        styles.choiceKey,
                        isSelected(key) && styles.choiceKeySelected,
                      ]}>
                        {key}
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={[
                        styles.choiceText,
                        isSelected(key) && styles.choiceTextSelected,
                      ]}
                    >
                      {value}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.navigationContainer}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  styles.navButtonSecondary,
                  isFirstQuestion && styles.navButtonDisabled,
                ]}
                onPress={handlePrevious}
                disabled={isFirstQuestion}
                activeOpacity={0.7}
              >
                <ThemedText style={[
                  styles.navButtonText,
                  styles.navButtonTextSecondary,
                ]}>
                  Previous
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  styles.navButtonPrimary,
                  !isCurrentQuestionAnswered() && styles.navButtonDisabled,
                ]}
                onPress={handleNextWithValidation}
                disabled={!isCurrentQuestionAnswered()}
                activeOpacity={0.8}
              >
                <ThemedText
                  style={[
                    styles.navButtonText,
                    !isCurrentQuestionAnswered() && styles.navButtonTextDisabled,
                  ]}
                >
                  {isLastQuestion ? 'Finish' : 'Next'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  timerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  timerBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBadgeWarning: {
    backgroundColor: '#ef4444',
  },
  timerIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerIconCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  timerIconCircleWarning: {
    borderColor: '#fff',
  },
  timerIconHand: {
    width: 2,
    height: 6,
    backgroundColor: '#fff',
    position: 'absolute',
    top: 2,
    borderRadius: 1,
  },
  timerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  progressBar: {
    height: 5,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    opacity: 0.6,
    textAlign: 'center',
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 16,
  },
  questionCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  questionHeader: {
    marginBottom: 12,
  },
  questionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#6366f1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  questionBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  question: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  choicesContainer: {
    gap: 12,
    marginBottom: 20,
  },
  choiceButton: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 56,
    justifyContent: 'center',
  },
  choiceButtonSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  choiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  choiceIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    flexShrink: 0,
  },
  choiceIndicatorSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  choiceKey: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  choiceKeySelected: {
    color: '#6366f1',
  },
  choiceText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
  choiceTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  navigationContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 16,
    marginTop: 8,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: 'rgba(99, 102, 241, 0.1)',
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButtonPrimary: {
    backgroundColor: '#6366f1',
  },
  navButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  navButtonDisabled: {
    backgroundColor: '#e5e7eb',
    borderColor: '#e5e7eb',
    shadowOpacity: 0,
    elevation: 0,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  navButtonTextSecondary: {
    color: '#6366f1',
  },
  navButtonTextDisabled: {
    color: '#9ca3af',
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
    opacity: 0.7,
  },
});
