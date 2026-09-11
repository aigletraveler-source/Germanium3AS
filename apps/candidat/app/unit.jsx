import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../packages/shared/supabase';

export default function Unit() {
  const { unit } = useLocalSearchParams();
  const [lesson, setLesson] = useState(null);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('lessons').select('*').eq('unit_number', Number(unit)).single();
      if (data) setLesson(data);
    };
    load();
  }, [unit]);

  if (!lesson) return <View style={styles.loading}><Text style={styles.loadingText}>Chargement unité {unit}...</Text></View>;

  const handleAnswer = (idx, opt) => {
    const ex = lesson.exercises[idx];
    const correct = ex.answer === opt;
    Haptics.notificationAsync(correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    setAnswers(prev => ({ ...prev, [idx]: { opt, correct } }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.unit}>Unité {lesson.unit_number}</Text>
      <Text style={styles.titleDe}>{lesson.title_de}</Text>
      <Text style={styles.titleFr}>{lesson.title_fr} • {lesson.theme}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Vocabulaire ELI5 (couleurs genres)</Text>
        {lesson.vocab.map((v, i) => (
          <View key={i} style={[styles.vocabCard, { borderColor: v.color + '30' }]}>
            <Text style={styles.vocabDe}>{v.emoji} {v.de} <Text style={{ color: v.color }}>{v.de.startsWith('der') ? '💙 der' : v.de.startsWith('die') ? '❤️ die' : '💚 das'}</Text></Text>
            <Text style={styles.vocabFr}>{v.fr} • Ex: {v.example}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ Règle simplifiée — Comme si tu avais 5 ans</Text>
        <Text style={styles.rule}>{lesson.rule_eli5}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📖 Texte 3AS vulgarisé</Text>
        <Text style={styles.text}>{lesson.text_content}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Exercices interactifs</Text>
        {lesson.exercises.map((ex, idx) => (
          <View key={idx} style={styles.exCard}>
            <Text style={styles.exQ}>{idx + 1}. {ex.question}</Text>
            {ex.options.map((opt, oIdx) => {
              const answered = answers[idx];
              const isSelected = answered?.opt === oIdx;
              const isCorrect = ex.answer === oIdx;
              let bg = '#121212';
              if (answered) {
                if (isSelected) bg = answered.correct ? '#059669' : '#DC2626';
                else if (isCorrect) bg = '#059669';
              }
              return (
                <Pressable key={oIdx} onPress={() => handleAnswer(idx, oIdx)} style={[styles.opt, { backgroundColor: bg }]}>
                  <Text style={styles.optText}>{opt}</Text>
                </Pressable>
              );
            })}
            {answers[idx] && <Text style={styles.hint}>💡 {ex.hint_eli5} {answers[idx].correct ? '✅ Bravo !' : '❌ Essaie encore'}</Text>}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#052E16' },
  loading: { flex: 1, backgroundColor: '#052E16', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#D4AF37' },
  unit: { color: '#D4AF37', letterSpacing: 2, fontSize: 12, fontWeight: '700' },
  titleDe: { color: '#F5F5F5', fontSize: 20, fontWeight: '900', marginTop: 4 },
  titleFr: { color: '#9CA3AF', fontSize: 13, marginTop: 4 },
  section: { marginTop: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14, borderColor: 'rgba(212,175,55,0.12)', borderWidth: 1 },
  sectionTitle: { color: '#D4AF37', fontWeight: '800', marginBottom: 10, fontSize: 13 },
  vocabCard: { backgroundColor: '#121212', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1 },
  vocabDe: { color: '#F5F5F5', fontWeight: '700' },
  vocabFr: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  rule: { color: '#F5F5F5', lineHeight: 20, fontSize: 13 },
  text: { color: '#E5E7EB', lineHeight: 22, fontSize: 13 },
  exCard: { backgroundColor: '#121212', borderRadius: 12, padding: 12, marginBottom: 10, borderColor: 'rgba(212,175,55,0.1)', borderWidth: 1 },
  exQ: { color: '#F5F5F5', fontWeight: '700', marginBottom: 8 },
  opt: { borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  optText: { color: '#F5F5F5' },
  hint: { color: '#D4AF37', fontSize: 11, marginTop: 6 }
});

