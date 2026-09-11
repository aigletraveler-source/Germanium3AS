import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../../packages/shared/supabase';

export default function Activation() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleActivate = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erreur', 'Saisis ton code DE3AS-XXXX');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('validate_reference_code', { input_code: trimmed });
      if (error) throw error;
      const row = data?.[0];
      if (!row?.is_valid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Code invalide', row?.message || 'Vérifie ton code ou contacte l\'admin');
        return;
      }
      await SecureStore.setItemAsync('germanium_code', trimmed);
      await SecureStore.setItemAsync('germanium_candidate_id', row.candidate_id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      scale.value = withSpring(1.05, {}, () => (scale.value = withSpring(1)));
      setTimeout(() => router.replace({ pathname: '/dashboard', params: { code: trimmed, candidateId: row.candidate_id } }), 700);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <Animated.View entering={FadeInUp.duration(800)} style={styles.header}>
        <Text style={styles.logo}>⬢</Text>
        <Text style={styles.title}>Germanium 3AS</Text>
        <Text style={styles.subtitle}>Candidat • Accès Luxe</Text>
        <Text style={styles.desc}>Programme Allemand 3AS LG • ELI5</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(800)} style={styles.card}>
        <Text style={styles.cardTitle}>Code de référence</Text>
        <Text style={styles.cardDesc}>Reçu de ton admin • Format DE3AS-7X9K</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={code}
            onChangeText={t => setCode(t.toUpperCase())}
            placeholder="DE3AS-XXXX"
            placeholderTextColor="#6B7280"
            autoCapitalize="characters"
            style={styles.input}
          />
        </View>
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={handleActivate}
            onPressIn={() => (scale.value = withSpring(0.97))}
            onPressOut={() => (scale.value = withSpring(1))}
            style={styles.button}
          >
            {loading ? <ActivityIndicator color="#052E16" /> : <Text style={styles.buttonText}>Déverrouiller →</Text>}
          </Pressable>
        </Animated.View>
        <Text style={styles.hint}>Glassmorphism • Reanimated 60 FPS • Haptics + Spring</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#052E16', padding: 24, justifyContent: 'center' },
  glow: { position: 'absolute', top: -80, right: -80, width: 280, height: 280, backgroundColor: '#D4AF37', opacity: 0.07, borderRadius: 140 },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 44, color: '#D4AF37', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '900', color: '#F5F5F5', letterSpacing: 1 },
  subtitle: { fontSize: 12, color: '#D4AF37', letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 },
  desc: { fontSize: 11, color: '#6B7280', marginTop: 6 },
  card: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(212,175,55,0.15)', borderWidth: 1, borderRadius: 24, padding: 20 },
  cardTitle: { color: '#F5F5F5', fontSize: 17, fontWeight: '700' },
  cardDesc: { color: '#9CA3AF', fontSize: 12, marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212', borderColor: 'rgba(212,175,55,0.2)', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 52 },
  input: { flex: 1, color: '#F5F5F5', fontSize: 18, letterSpacing: 2, fontWeight: '700', textAlign: 'center' },
  button: { backgroundColor: '#D4AF37', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 14 },
  buttonText: { color: '#052E16', fontWeight: '800', fontSize: 15 },
  hint: { textAlign: 'center', color: '#6B7280', fontSize: 10, marginTop: 14 }
});

