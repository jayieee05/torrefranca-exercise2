import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Question, useQuiz } from '@/contexts/QuizContext';

export default function QuizSettingsTab() {
  const { questions, setQuestions, timerDuration, setTimerDuration } = useQuiz();
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState<string>('');
  const [timerSeconds, setTimerSeconds] = useState<string>('');

  // I sync the timer inputs whenever the timer duration changes
  useEffect(() => {
    if (timerDuration > 0) {
      const mins = Math.floor(timerDuration / 60);
      const secs = timerDuration % 60;
      setTimerMinutes(mins.toString());
      setTimerSeconds(secs.toString());
    } else {
      setTimerMinutes('');
      setTimerSeconds('');
    }
  }, [timerDuration]);

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1,
      type: 'multiple',
      question: '',
      choices: { A: '', B: '', C: '', D: '' },
      answer: 'A',
    };
    setEditingQuestion(newQuestion);
    setIsAddingQuestion(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion({ ...question });
    setIsAddingQuestion(false);
  };

  const handleDeleteQuestion = (id: number) => {
    if (Platform.OS === 'web') {
      // On web, I use window.confirm since Alert doesn't work the same way
      if (typeof window !== 'undefined' && window.confirm('Are you sure you want to delete this question?')) {
        setQuestions(questions.filter(q => q.id !== id));
      }
    } else {
      // On mobile, I use the native Alert component
      Alert.alert(
        'Delete Question',
        'Are you sure you want to delete this question?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              setQuestions(questions.filter(q => q.id !== id));
            },
          },
        ]
      );
    }
  };

  const handleSaveQuestion = () => {
    if (!editingQuestion) return;

    // I validate the question before saving
    if (!editingQuestion.question.trim()) {
      Alert.alert('Error', 'Please enter a question.');
      return;
    }

    const choiceKeys = Object.keys(editingQuestion.choices);
    const hasEmptyChoices = choiceKeys.some(key => !editingQuestion.choices[key].trim());
    if (hasEmptyChoices) {
      Alert.alert('Error', 'Please fill in all choices.');
      return;
    }

    if (!editingQuestion.answer || (Array.isArray(editingQuestion.answer) && editingQuestion.answer.length === 0)) {
      Alert.alert('Error', 'Please select a correct answer.');
      return;
    }

    if (isAddingQuestion) {
      setQuestions([...questions, editingQuestion]);
    } else {
      setQuestions(questions.map(q => q.id === editingQuestion.id ? editingQuestion : q));
    }

    setEditingQuestion(null);
    setIsAddingQuestion(false);
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setIsAddingQuestion(false);
  };

  const handleUpdateTimer = () => {
    const mins = parseInt(timerMinutes, 10) || 0;
    const secs = parseInt(timerSeconds, 10) || 0;
    const totalSeconds = mins * 60 + secs;
    
    if (totalSeconds < 0) {
      Alert.alert('Error', 'Timer duration cannot be negative.');
      return;
    }

    setTimerDuration(totalSeconds);
    Alert.alert('Success', `Timer set to ${mins}m ${secs}s`);
  };

  const formatTimerDisplay = () => {
    if (timerDuration === 0) return 'No timer';
    const mins = Math.floor(timerDuration / 60);
    const secs = timerDuration % 60;
    return `${mins}m ${secs}s`;
  };

  if (editingQuestion) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.sectionTitle}>
            {isAddingQuestion ? 'Add Question' : 'Edit Question'}
          </ThemedText>

          {/* Question Type */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Question Type</ThemedText>
            <View style={styles.typeButtons}>
              {(['multiple', 'truefalse', 'checkbox'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    editingQuestion.type === type && styles.typeButtonSelected,
                  ]}
                  onPress={() => {
                    if (type === 'truefalse') {
                      // When switching to True/False, I automatically set the choices
                      setEditingQuestion({
                        ...editingQuestion,
                        type: 'truefalse',
                        choices: { A: 'True', B: 'False' },
                        answer: editingQuestion.answer === 'C' || editingQuestion.answer === 'D' ? 'A' : editingQuestion.answer,
                      });
                    } else if (type === 'checkbox') {
                      // For checkbox, I reset to empty choices so user can fill them in
                      setEditingQuestion({
                        ...editingQuestion,
                        type: 'checkbox',
                        choices: {
                          A: '',
                          B: '',
                          C: '',
                          D: '',
                        },
                        answer: [],
                      });
                    } else {
                      // For multiple choice, I also reset to empty choices
                      setEditingQuestion({
                        ...editingQuestion,
                        type: 'multiple',
                        choices: {
                          A: '',
                          B: '',
                          C: '',
                          D: '',
                        },
                        answer: 'A',
                      });
                    }
                  }}
                >
                  <ThemedText
                    style={[
                      styles.typeButtonText,
                      editingQuestion.type === type && styles.typeButtonTextSelected,
                    ]}
                  >
                    {type === 'multiple' ? 'Multiple Choice' : type === 'truefalse' ? 'True/False' : 'Checkbox'}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Question Text */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Question</ThemedText>
            <TextInput
              style={styles.textInput}
              value={editingQuestion.question}
              onChangeText={(text) => setEditingQuestion({ ...editingQuestion, question: text })}
              placeholder="Enter question text"
              multiline
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Choices */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Choices</ThemedText>
            {(editingQuestion.type === 'truefalse' 
              ? ['A', 'B'] 
              : Object.keys(editingQuestion.choices)
            ).map((key) => (
              <View key={key} style={styles.choiceInputRow}>
                <ThemedText style={styles.choiceKey}>{key}:</ThemedText>
                <TextInput
                  style={styles.choiceInput}
                  value={editingQuestion.choices[key] || ''}
                  onChangeText={(text) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      choices: { ...editingQuestion.choices, [key]: text },
                    })
                  }
                  placeholder={`Choice ${key}`}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            ))}
          </View>

          {/* Correct Answer */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Correct Answer</ThemedText>
            {editingQuestion.type === 'checkbox' ? (
              <View style={styles.checkboxAnswers}>
                {Object.keys(editingQuestion.choices).map((key) => {
                  const currentAnswers = Array.isArray(editingQuestion.answer) ? editingQuestion.answer : [];
                  const isSelected = currentAnswers.includes(key);
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.checkboxAnswerButton,
                        isSelected && styles.checkboxAnswerButtonSelected,
                      ]}
                      onPress={() => {
                        const currentAnswers = Array.isArray(editingQuestion.answer) ? editingQuestion.answer : [];
                        const newAnswers = isSelected
                          ? currentAnswers.filter(a => a !== key)
                          : [...currentAnswers, key];
                        setEditingQuestion({ ...editingQuestion, answer: newAnswers });
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.checkboxAnswerText,
                          isSelected && styles.checkboxAnswerTextSelected,
                        ]}
                      >
                        {key}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.answerButtons}>
                {(editingQuestion.type === 'truefalse' 
                  ? ['A', 'B'] 
                  : Object.keys(editingQuestion.choices)
                ).map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.answerButton,
                      editingQuestion.answer === key && styles.answerButtonSelected,
                    ]}
                    onPress={() => setEditingQuestion({ ...editingQuestion, answer: key })}
                  >
                    <ThemedText
                      style={[
                        styles.answerButtonText,
                        editingQuestion.answer === key && styles.answerButtonTextSelected,
                      ]}
                    >
                      {key}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelEdit}
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSaveQuestion}
            >
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Timer Section */}
        <View style={styles.section}>
          <View style={styles.timerHeader}>
            <View style={styles.timerIconContainer}>
              <View style={styles.timerIconCircle}>
                <View style={styles.timerIconHand} />
              </View>
            </View>
            <View style={styles.timerHeaderText}>
              <ThemedText type="subtitle" style={styles.timerTitle}>Quiz Timer</ThemedText>
              <ThemedText style={styles.timerStatusText}>Current: {formatTimerDisplay()}</ThemedText>
            </View>
          </View>
          
          <View style={styles.timerInputs}>
            <View style={styles.timerInputGroup}>
              <ThemedText style={styles.timerLabel}>Minutes</ThemedText>
              <TextInput
                style={styles.timerInput}
                value={timerMinutes}
                onChangeText={setTimerMinutes}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.timerDivider}>
              <ThemedText style={styles.timerDividerText}>:</ThemedText>
            </View>
            <View style={styles.timerInputGroup}>
              <ThemedText style={styles.timerLabel}>Seconds</ThemedText>
              <TextInput
                style={styles.timerInput}
                value={timerSeconds}
                onChangeText={setTimerSeconds}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
          <TouchableOpacity style={styles.timerButton} onPress={handleUpdateTimer} activeOpacity={0.8}>
            <ThemedText style={styles.timerButtonText}>Update Timer</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Questions List Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Quiz Items</ThemedText>
            <TouchableOpacity style={styles.addButton} onPress={handleAddQuestion}>
              <ThemedText style={styles.addButtonText}>+ Add Question</ThemedText>
            </TouchableOpacity>
          </View>

          {questions.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyIcon}>📋</ThemedText>
              <ThemedText style={styles.emptyText}>No questions yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>Tap "Add Question" to create your first question</ThemedText>
            </View>
          ) : (
            questions.map((question, index) => (
              <View key={question.id} style={styles.questionItem}>
                <View style={styles.questionNumber}>
                  <ThemedText style={styles.questionNumberText}>{index + 1}</ThemedText>
                </View>
                <View style={styles.questionItemContent}>
                  <View style={styles.questionItemHeader}>
                    <View style={[styles.typeBadge, question.type === 'truefalse' && styles.typeBadgeTrueFalse, question.type === 'checkbox' && styles.typeBadgeCheckbox]}>
                      <ThemedText style={[
                        styles.typeBadgeText,
                        question.type === 'truefalse' && styles.typeBadgeTextTrueFalse,
                        question.type === 'checkbox' && styles.typeBadgeTextCheckbox
                      ]}>
                        {question.type === 'multiple' ? 'MC' : question.type === 'truefalse' ? 'T/F' : 'CB'}
                      </ThemedText>
                    </View>
                    <View style={styles.questionItemActions}>
                      <TouchableOpacity
                        style={[styles.actionIconButton, styles.editButton]}
                        onPress={() => handleEditQuestion(question)}
                        activeOpacity={0.7}
                      >
                        <ThemedText style={[styles.actionIconButtonText, styles.editIconText]}>✎</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionIconButton, styles.deleteButton]}
                        onPress={() => handleDeleteQuestion(question.id)}
                        activeOpacity={0.7}
                      >
                        <ThemedText style={[styles.actionIconButtonText, styles.deleteIconText]}>×</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <ThemedText style={styles.questionItemText} numberOfLines={2}>
                    {question.question}
                  </ThemedText>
                </View>
              </View>
            ))
          )}
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
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    backgroundColor: 'transparent',
  },
  typeButtonSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  choiceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  choiceKey: {
    fontSize: 16,
    fontWeight: '700',
    width: 30,
    color: '#6366f1',
  },
  choiceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  answerButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  checkboxAnswers: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  checkboxAnswerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    backgroundColor: 'transparent',
  },
  checkboxAnswerButtonSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  checkboxAnswerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  checkboxAnswerTextSelected: {
    color: '#fff',
  },
  answerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerButtonSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  answerButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
  },
  answerButtonTextSelected: {
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  cancelButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#6366f1',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timerIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  timerIconHand: {
    width: 2.5,
    height: 8,
    backgroundColor: '#6366f1',
    position: 'absolute',
    top: 3,
    borderRadius: 1.5,
  },
  timerHeaderText: {
    flex: 1,
  },
  timerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 0,
  },
  timerStatusText: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
    marginTop: 4,
  },
  timerInputs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 16,
  },
  timerInputGroup: {
    flex: 1,
  },
  timerDivider: {
    width: 20,
    paddingBottom: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerDividerText: {
    fontSize: 20,
    fontWeight: '600',
    opacity: 0.4,
    color: '#6366f1',
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
    letterSpacing: 0.3,
  },
  timerInput: {
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 14,
    padding: 14,
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: '#fff',
    textAlign: 'center',
    color: '#6366f1',
    minHeight: 52,
  },
  timerButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  timerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  questionItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  questionNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  questionNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  questionItemContent: {
    flex: 1,
  },
  questionItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  typeBadgeTrueFalse: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  typeBadgeCheckbox: {
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
    letterSpacing: 0.5,
  },
  typeBadgeTextTrueFalse: {
    color: '#8b5cf6',
  },
  typeBadgeTextCheckbox: {
    color: '#ec4899',
  },
  questionItemText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: '#111827',
  },
  questionItemActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  actionIconButtonText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
  },
  editIconText: {
    color: '#6366f1',
  },
  deleteIconText: {
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.7,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
  },
});
