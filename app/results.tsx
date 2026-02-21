import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQuiz } from '@/contexts/QuizContext';

const HIGHEST_SCORE_KEY = '@quiz_highest_score';

export default function ResultsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { questions } = useQuiz();
  const currentScore = parseInt(params.currentScore as string, 10) || 0;
  const [highestScore, setHighestScore] = useState(0);
  const totalQuestions = questions.length;
  const percentage = totalQuestions > 0 ? Math.round((currentScore / totalQuestions) * 100) : 0;
  const isNewRecord = currentScore === highestScore && currentScore > 0;

  // I load the highest score from storage and make sure it's up to date
  useEffect(() => {
    const loadHighestScore = async () => {
      try {
        const storedHighest = await AsyncStorage.getItem(HIGHEST_SCORE_KEY);
        const stored = storedHighest ? parseInt(storedHighest, 10) : 0;
        // I use the maximum to handle any edge cases where storage might be out of sync
        const actualHighest = Math.max(stored, currentScore);
        setHighestScore(actualHighest);
        
        // If the current score is higher, I update the storage
        if (currentScore > stored) {
          await AsyncStorage.setItem(HIGHEST_SCORE_KEY, currentScore.toString());
        }
      } catch (error) {
        console.error('Error loading highest score:', error);
        // If there's an error, I just use the current score as fallback
        setHighestScore(currentScore);
      }
    };
    loadHighestScore();
  }, [currentScore]);

  // I handle the back button to go back to home
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.push('/');
        return true; // I prevent the default back behavior
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => backHandler.remove();
    }, [router])
  );

  // I also handle the header back button the same way
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // I prevent the default navigation
      e.preventDefault();
      // And navigate to home instead
      router.push('/');
    });

    return unsubscribe;
  }, [navigation, router]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <ThemedText style={styles.iconEmoji}>
              {percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : '📚'}
            </ThemedText>
          </View>
        </View>

        <ThemedText type="title" style={styles.title}>
          Quiz Complete!
        </ThemedText>

        {isNewRecord && (
          <View style={styles.recordBadge}>
            <ThemedText style={styles.recordBadgeText}>🏆 New Record!</ThemedText>
          </View>
        )}

        <View style={styles.scoreContainer}>
          <View style={styles.scoreBox}>
            <View style={styles.scoreBoxHeader}>
              <ThemedText style={styles.scoreLabel}>Your Score</ThemedText>
            </View>
            <ThemedText type="title" style={styles.scoreValue}>
              {currentScore}
            </ThemedText>
            <ThemedText style={styles.scoreSubtext}>
              out of {totalQuestions}
            </ThemedText>
            <View style={styles.percentageContainer}>
              <View style={styles.percentageBar}>
                <View 
                  style={[
                    styles.percentageFill, 
                    { width: `${percentage}%` }
                  ]} 
                />
              </View>
              <ThemedText style={styles.percentageText}>{percentage}%</ThemedText>
            </View>
          </View>

          <View style={[styles.scoreBox, styles.highestScoreBox]}>
            <View style={styles.scoreBoxHeader}>
              <ThemedText style={styles.scoreLabel}>Highest Score</ThemedText>
            </View>
            <ThemedText type="title" style={styles.scoreValue}>
              {highestScore}
            </ThemedText>
            <ThemedText style={styles.scoreSubtext}>
              Best attempt
            </ThemedText>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/')}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.buttonText}>Back to Home</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => router.push('/quiz')}
            activeOpacity={0.8}
          >
            <ThemedText style={[styles.buttonText, styles.buttonTextSecondary]}>
              Try Again
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  iconEmoji: {
    fontSize: 50,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  recordBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  recordBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    marginBottom: 32,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: '#6366f1',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 140,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  highestScoreBox: {
    backgroundColor: '#8b5cf6',
  },
  scoreBoxHeader: {
    marginBottom: 12,
  },
  scoreLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 4,
  },
  scoreSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 12,
  },
  percentageContainer: {
    width: '100%',
    marginTop: 8,
  },
  percentageBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  percentageFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  percentageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6366f1',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonTextSecondary: {
    color: '#6366f1',
  },
});
