import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { supabase, SUPPORT_COURS_URL, SUPPORT_RECLAMATION_URL } from '../../../packages/shared/supabase';

const UNITS = [
  { n: 1, de: 'Die deutschsprachigen Länder und Algerien', fr: 'Pays germanophones & Algérie', emoji: '🇩🇪', color: '#3B82F6' },
  { n: 2, de: 'Das Leben der Künstler', fr: 'Vie des artistes', emoji: '🎨', color: '#EF4444' },
  { n: 3, de: 'Der technische Fortschritt', fr: 'Progrès technique', emoji: '💻', color: '#10B981' },
  { n: 4, de: 'Umweltprobleme', fr: 'Environnement', emoji: '🌍', color: '#059669' },
  { n: 5, de: 'Massenmedien und Werbung', fr: 'Médias & Pub', emoji: '📺', color: '#F59E0B' },
  { n: 6, de: 'Korrespondenz und Kommunikation', fr: 'Correspondance', emoji: '✉️', color: '#8B5CF6' },
  { n: 7, de: 'Probleme der Jugend', fr: 'Problèmes jeunesse', emoji: '🧑‍🎓', color: '#EC4899' },
  { n: 8, de: 'Berufe und Professionen', fr: 'Métiers', emoji: '👨‍⚕️', color: '#06B6D4' },
];

export default function Dashboard() {
  const { code, candidateId } = useLocalSearchParams();
  const router = useRouter();
  const [cand, setCand] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!candidateId) return;
      const { data } = await supabase.from('candidates').select('*').eq('id', candidateId).single();
      if (data) setCand(data);
    };
    load();
  }, [candidateId]);

  const openUnit = (n) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/unit', params: { unit: String(n), candidateId } });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Animated.View entering={FadeInUp} style={styles.header}>
          <Text style={styles.welcome}>Marhba {cand ? `${cand.prenom} ${cand.nom}` : 'Candidat'} 👋</Text>
          <Text style={styles.code}>Code: {code}</Text>
          <Text style={styles.sub}>8 unités • Méthode ELI5 • Couleurs genres: der=💙 die=❤️ das=💚</Text>
        </Animated.View>

        <View style={styles.grid}>
          {UNITS.map(u => (
            <Pressable
              key={u.n}
              onPress={() => openUnit(u.n)}
              style={[styles.card, { borderColor: u.color + '40' }]}
            >
              <Text style={styles.cardEmoji}>{u.emoji}</Text>
              <Text style={styles.cardNum}>Unité {u.n}</Text>
              <Text style={styles.cardDe}>{u.de}</Text>
              <Text style={styles.cardFr}>{u.fr}</Text>
              <View style={[styles.dot, { backgroundColor: u.color }]} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.push({ pathname: '/chat', params: { candidateId } })} style={styles.chatBtn}>
          <Text style={styles.chatText}>💬 Messagerie éphémère — 24h</Text>
          <Text style={styles.chatSub}>Suppression auto après lecture / 24h</Text>
        </Pressable>

        <Text style={styles.hint}>Appuie sur une unité → Vocabulaire ELI5 + Exercices</Text>
      </ScrollView>

      <View style={styles.floating}>
        <Pressable onPress={() => Linking.openURL(SUPPORT_COURS_URL)} style={[styles.floatBtn, { backgroundColor: '#D4AF37' }]}>
          <Text style={styles.floatText}>📚 Cours</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(SUPPORT_RECLAMATION_URL)} style={[styles.floatBtn, { backgroundColor: '#1F2937', borderColor: '#D4AF37', borderWidth: 1 }]}>
          <Text style={[styles.floatText, { color: '#D4AF37' }]}>🛠️ Réclamation</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#052E16' },
  header: { padding: 16, backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 20, borderColor: 'rgba(212,175,55,0.15)', borderWidth: 1, marginBottom: 16 },
  welcome: { color: '#F5F5F5', fontSize: 18, fontWeight: '800' },
  code: { color: '#D4AF37', fontWeight: '700', marginTop: 4 },
  sub: { color: '#9CA3AF', fontSize: 11, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47.5%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 14, borderWidth: 1, minHeight: 140 },
  cardEmoji: { fontSize: 28 },
  cardNum: { color: '#D4AF37', fontSize: 11, fontWeight: '700', marginTop: 8, letterSpacing: 1 },
  cardDe: { color: '#F5F5F5', fontWeight: '700', fontSize: 12, marginTop: 4 },
  cardFr: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
  chatBtn: { marginTop: 16, backgroundColor: '#121212', borderRadius: 16, padding: 16, borderColor: 'rgba(212,175,55,0.15)', borderWidth: 1, alignItems: 'center' },
  chatText: { color: '#D4AF37', fontWeight: '800' },
  chatSub: { color: '#6B7280', fontSize: 11, marginTop: 4 },
  hint: { textAlign: 'center', color: '#6B7280', fontSize: 11, marginTop: 12, marginBottom: 80 },
  floating: { position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', gap: 10 },
  floatBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  floatText: { fontWeight: '800', fontSize: 13, color: '#052E16' }
});

