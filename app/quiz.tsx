import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, StyleSheet, TouchableOpacity, View } from 'react-native';

import PreviewQuizTab from '@/components/PreviewQuizTab';
import QuizSettingsTab from '@/components/QuizSettingsTab';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function QuizScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');

  // I handle the back button to always go back to home instead of the default behavior
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
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        // I prevent the default navigation behavior
        e.preventDefault();
        // And navigate to home instead
        router.push('/');
      });

      return unsubscribe;
    }, [navigation, router])
  );

  return (
    <ThemedView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'preview' && styles.tabActive]}
          onPress={() => setActiveTab('preview')}
          activeOpacity={0.7}
        >
          <ThemedText
            style={[styles.tabText, activeTab === 'preview' && styles.tabTextActive]}
          >
            Preview Quiz
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.7}
        >
          <ThemedText
            style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}
          >
            Quiz Settings
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'preview' ? <PreviewQuizTab /> : <QuizSettingsTab />}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.6,
  },
  tabTextActive: {
    opacity: 1,
    color: '#6366f1',
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
});
