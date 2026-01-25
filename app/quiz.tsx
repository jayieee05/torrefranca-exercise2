import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { questions } from '@/data/questions';

const HIGHEST_SCORE_KEY = '@quiz_highest_score';
const { width } = Dimensions.get('window');

export default function QuizScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [score, setScore] = useState(0);

  // Reset quiz state when component mounts
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setScore(0);
  }, []);

  // Handle back button to navigate to home
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.push('/');
        return true; // Prevent default back behavior
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => backHandler.remove();
    }, [router])
  );

  // Handle header back button
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent default behavior
      e.preventDefault();
      // Navigate to home
      router.push('/');
    });

    return unsubscribe;
  }, [navigation, router]);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswerSelect = (choice: string) => {
    const currentAnswer = answers[currentQuestionIndex];
    
    if (currentQuestion.type === 'checkbox') {
      // Handle multiple choice (checkbox)
      const currentAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
      const newAnswers = currentAnswers.includes(choice)
        ? currentAnswers.filter(a => a !== choice)
        : [...currentAnswers, choice];
      setAnswers({ ...answers, [currentQuestionIndex]: newAnswers });
    } else {
      // Handle single choice
      setAnswers({ ...answers, [currentQuestionIndex]: choice });
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

  const calculateScore = async () => {
    let newScore = 0;
    
    questions.forEach((question, index) => {
      const userAnswer = answers[index];
      const correctAnswer = question.answer;
      
      if (Array.isArray(correctAnswer)) {
        // For checkbox questions, check if arrays match
        const userAnswers = Array.isArray(userAnswer) ? userAnswer.sort() : [];
        const correctAnswers = [...correctAnswer].sort();
        if (JSON.stringify(userAnswers) === JSON.stringify(correctAnswers)) {
          newScore++;
        }
      } else {
        // For single choice questions
        if (userAnswer === correctAnswer) {
          newScore++;
        }
      }
    });

    setScore(newScore);

    // Get and update highest score
    try {
      const storedHighest = await AsyncStorage.getItem(HIGHEST_SCORE_KEY);
      const currentHighestScore = storedHighest ? parseInt(storedHighest, 10) : 0;
      
      // Update highest score if current score is higher
      if (newScore > currentHighestScore) {
        await AsyncStorage.setItem(HIGHEST_SCORE_KEY, newScore.toString());
      }

      // Navigate to results with current score
      // Highest score will be loaded from storage in results screen
      router.push({
        pathname: '/results',
        params: {
          currentScore: newScore.toString(),
        },
      });
    } catch (error) {
      console.error('Error saving score:', error);
      Alert.alert('Error', 'Failed to save score');
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

  return (
    <ThemedView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <ThemedText style={styles.progressText}>
          {currentQuestionIndex + 1} / {questions.length}
        </ThemedText>
      </View>

      <View style={styles.content}>
        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <View style={styles.questionBadge}>
              <ThemedText style={styles.questionBadgeText}>
                Question {currentQuestionIndex + 1}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="subtitle" style={styles.question} numberOfLines={3}>
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
                    numberOfLines={2}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
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
    flex: 1,
    padding: 16,
    paddingBottom: 16,
  },
  questionCard: {
    flex: 1,
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
    justifyContent: 'space-between',
    minHeight: 0,
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
    marginBottom: 16,
    flexShrink: 1,
  },
  choicesContainer: {
    flex: 1,
    gap: 10,
    justifyContent: 'flex-start',
    minHeight: 0,
    marginBottom: 16,
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
    flexShrink: 1,
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
});
