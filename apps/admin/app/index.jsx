import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../packages/shared/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleLogin = async () => {
    if (!email || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erreur', 'Email et mot de passe requis');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      scale.value = withSpring(1.05, {}, () => { scale.value = withSpring(1); });
      setTimeout(() => router.replace('/dashboard'), 600);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Login échoué', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />

      <Animated.View entering={FadeInUp.duration(800)} style={styles.header}>
        <Text style={styles.logo}>◆</Text>
        <Text style={styles.title}>Germanium 3AS</Text>
        <Text style={styles.subtitle}>Admin • Portail Luxe</Text>
        <Text style={styles.tagline}>Précision & Excellence</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(800)} style={styles.card}>
        <Text style={styles.cardTitle}>Connexion sécurisée</Text>
        <Text style={styles.cardDesc}>Supabase Auth • Chiffrement</Text>

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Email maître</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="admin@germanium.dz"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#6B7280"
            secureTextEntry
            style={styles.input}
          />
        </View>

        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={handleLogin}
            onPressIn={() => (scale.value = withSpring(0.97))}
            onPressOut={() => (scale.value = withSpring(1))}
            style={styles.button}
          >
            {loading ? <ActivityIndicator color="#052E16" /> : <Text style={styles.buttonText}>Entrer →</Text>}
          </Pressable>
        </Animated.View>

        <Text style={styles.hint}>Glassmorphism • Reanimated 60 FPS • Haptics</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#052E16', padding: 24, justifyContent: 'center' },
  bgGlow1: { position: 'absolute', top: -80, right: -80, width: 260, height: 260, backgroundColor: '#D4AF37', opacity: 0.08, borderRadius: 130 },
  bgGlow2: { position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, backgroundColor: '#D4AF37', opacity: 0.06, borderRadius: 150 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 48, color: '#D4AF37', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#F5F5F5', letterSpacing: 1 },
  subtitle: { fontSize: 13, color: '#D4AF37', marginTop: 4, letterSpacing: 3, textTransform: 'uppercase' },
  tagline: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  card: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(212,175,55,0.15)', borderWidth: 1, borderRadius: 24, padding: 20, backdropFilter: 'blur(20px)' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#F5F5F5' },
  cardDesc: { fontSize: 12, color: '#9CA3AF', marginBottom: 20 },
  inputWrap: { marginBottom: 16 },
  label: { fontSize: 11, color: '#D4AF37', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' },
  input: { backgroundColor: '#121212', borderColor: 'rgba(212,175,55,0.2)', borderWidth: 1, borderRadius: 14, padding: 14, color: '#F5F5F5', fontSize: 14 },
  button: { backgroundColor: '#D4AF37', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, shadowColor: '#D4AF37', shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  buttonText: { color: '#052E16', fontWeight: '800', fontSize: 15, letterSpacing: 1 },
  hint: { textAlign: 'center', color: '#6B7280', fontSize: 10, marginTop: 16 }
});

