import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, FlatList, Linking } from 'react-native';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { supabase, SUPPORT_COURS_URL, SUPPORT_RECLAMATION_URL } from '../../../packages/shared/supabase';

export default function Dashboard() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [etablissement, setEtablissement] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [lastCode, setLastCode] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [reply, setReply] = useState('');

  const scale = useSharedValue(1);
  const animatedBtn = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const fetchCandidates = async () => {
    const { data } = await supabase.from('candidates').select('*, reference_codes(code, status)').order('created_at', { ascending: false });
    if (data) setCandidates(data);
  };

  const fetchMessages = async () => {
    if (!selectedCandidate) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${selectedCandidate},receiver_id.eq.admin),and(sender_id.eq.admin,receiver_id.eq.${selectedCandidate})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  useEffect(() => { fetchCandidates(); }, []);
  useEffect(() => {
    fetchMessages();
    const ch = supabase.channel(`admin-msg-${selectedCandidate}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchMessages).subscribe();
    const iv = setInterval(() => { supabase.rpc('cleanup_expired_messages'); fetchMessages(); }, 5000);
    return () => { supabase.removeChannel(ch); clearInterval(iv); };
  }, [selectedCandidate]);

  const handleCreate = async () => {
    if (!nom || !prenom || !wilaya || !etablissement) {
      Alert.alert('Champs manquants', 'Nom, Prénom, Wilaya, Établissement requis');
      return;
    }
    try {
      const { data: cand, error } = await supabase.from('candidates').insert({ nom, prenom, wilaya, etablissement }).select().single();
      if (error) throw error;
      // Trigger génère le code instantanément
      await new Promise(r => setTimeout(r, 800));
      const { data: codeRow } = await supabase.from('reference_codes').select('code').eq('candidate_id', cand.id).single();
      const code = codeRow?.code || 'DE3AS-...';
      setLastCode({ code, cand });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Candidat créé', `Code: ${code}\n${prenom} ${nom} — à communiquer immédiatement`);
      setNom(''); setPrenom(''); setWilaya(''); setEtablissement('');
      fetchCandidates();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || !selectedCandidate) return;
    const msg = {
      sender_id: 'admin',
      sender_role: 'admin',
      receiver_id: selectedCandidate,
      receiver_role: 'candidat',
      content: reply,
      is_auto_destruct: true,
      destruct_after_seconds: 86400
    };
    await supabase.from('messages').insert(msg);
    setReply('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Animated.View entering={FadeIn} style={styles.hero}>
        <Text style={styles.heroTitle}>Création Candidat</Text>
        <Text style={styles.heroSub}>Génération IMMÉDIATE DE3AS-XXXX via trigger</Text>
      </Animated.View>

      <View style={styles.card}>
        <TextInput placeholder="Nom" placeholderTextColor="#6B7280" value={nom} onChangeText={setNom} style={styles.input} />
        <TextInput placeholder="Prénom" placeholderTextColor="#6B7280" value={prenom} onChangeText={setPrenom} style={styles.input} />
        <TextInput placeholder="Wilaya" placeholderTextColor="#6B7280" value={wilaya} onChangeText={setWilaya} style={styles.input} />
        <TextInput placeholder="Établissement" placeholderTextColor="#6B7280" value={etablissement} onChangeText={setEtablissement} style={styles.input} />
        <Animated.View style={animatedBtn}>
          <Pressable
            onPress={handleCreate}
            onPressIn={() => (scale.value = withSpring(0.96))}
            onPressOut={() => (scale.value = withSpring(1))}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Créer → Générer code instantané</Text>
          </Pressable>
        </Animated.View>
        {lastCode && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Dernier code généré</Text>
            <Text style={styles.code}>{lastCode.code}</Text>
            <Text style={styles.codeSub}>{lastCode.cand.prenom} {lastCode.cand.nom} • à communiquer</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Candidats ({candidates.length})</Text>
      <FlatList
        data={candidates}
        scrollEnabled={false}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelectedCandidate(item.id)} style={[styles.candCard, selectedCandidate === item.id && styles.candActive]}>
            <Text style={styles.candName}>{item.prenom} {item.nom}</Text>
            <Text style={styles.candMeta}>{item.wilaya} • {item.etablissement}</Text>
            <Text style={styles.candCode}>{item.reference_codes?.[0]?.code || '...'}</Text>
          </Pressable>
        )}
      />

      {selectedCandidate && (
        <View style={styles.chat}>
          <Text style={styles.chatTitle}>Messagerie éphémère — 24h</Text>
          {messages.map(m => (
            <View key={m.id} style={[styles.bubble, m.sender_role === 'admin' ? styles.bubbleMe : styles.bubbleOther]}>
              <Text style={styles.bubbleText}>{m.content}</Text>
              <Text style={styles.bubbleTime}>{new Date(m.created_at).toLocaleTimeString()} {m.is_read_by_both ? '✓✓' : '✓'}</Text>
            </View>
          ))}
          <View style={styles.inputRow}>
            <TextInput value={reply} onChangeText={setReply} placeholder="Répondre..." placeholderTextColor="#6B7280" style={styles.chatInput} />
            <Pressable onPress={handleReply} style={styles.sendBtn}><Text style={styles.sendText}>↑</Text></Pressable>
          </View>
        </View>
      )}

      <View style={styles.supportRow}>
        <Pressable onPress={() => Linking.openURL(SUPPORT_COURS_URL)} style={styles.supportBtn}><Text style={styles.supportText}>📚 Support Cours</Text></Pressable>
        <Pressable onPress={() => Linking.openURL(SUPPORT_RECLAMATION_URL)} style={styles.supportBtn2}><Text style={styles.supportText}>🛠️ Réclamation</Text></Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#052E16' },
  hero: { marginBottom: 16, padding: 16, backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 20, borderColor: 'rgba(212,175,55,0.15)', borderWidth: 1 },
  heroTitle: { color: '#F5F5F5', fontSize: 18, fontWeight: '800' },
  heroSub: { color: '#D4AF37', fontSize: 11, marginTop: 4 },
  card: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 16, borderColor: 'rgba(212,175,55,0.15)', borderWidth: 1, marginBottom: 16 },
  input: { backgroundColor: '#121212', borderColor: 'rgba(212,175,55,0.2)', borderWidth: 1, borderRadius: 12, padding: 12, color: '#F5F5F5', marginBottom: 10 },
  button: { backgroundColor: '#D4AF37', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#052E16', fontWeight: '800' },
  codeBox: { marginTop: 12, padding: 12, backgroundColor: '#121212', borderRadius: 12, borderColor: '#D4AF37', borderWidth: 1, alignItems: 'center' },
  codeLabel: { color: '#9CA3AF', fontSize: 10, letterSpacing: 1 },
  code: { color: '#D4AF37', fontSize: 22, fontWeight: '900', letterSpacing: 2, marginTop: 4 },
  codeSub: { color: '#6B7280', fontSize: 11, marginTop: 4 },
  sectionTitle: { color: '#D4AF37', fontWeight: '700', marginBottom: 8, marginTop: 8 },
  candCard: { backgroundColor: '#121212', borderRadius: 14, padding: 12, marginBottom: 8, borderColor: 'rgba(212,175,55,0.1)', borderWidth: 1 },
  candActive: { borderColor: '#D4AF37', borderWidth: 1.5 },
  candName: { color: '#F5F5F5', fontWeight: '700' },
  candMeta: { color: '#9CA3AF', fontSize: 12 },
  candCode: { color: '#D4AF37', fontWeight: '800', marginTop: 4 },
  chat: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 12 },
  chatTitle: { color: '#D4AF37', fontWeight: '700', marginBottom: 8 },
  bubble: { maxWidth: '78%', borderRadius: 14, padding: 10, marginBottom: 8 },
  bubbleMe: { backgroundColor: '#D4AF37', alignSelf: 'flex-end' },
  bubbleOther: { backgroundColor: '#1F2937', alignSelf: 'flex-start' },
  bubbleText: { color: '#F5F5F5', fontSize: 13 },
  bubbleTime: { color: '#6B7280', fontSize: 10, marginTop: 4 },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chatInput: { flex: 1, backgroundColor: '#121212', borderRadius: 12, padding: 12, color: '#F5F5F5', borderColor: 'rgba(212,175,55,0.2)', borderWidth: 1 },
  sendBtn: { backgroundColor: '#D4AF37', borderRadius: 12, width: 44, justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#052E16', fontWeight: '900', fontSize: 18 },
  supportRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 24 },
  supportBtn: { flex: 1, backgroundColor: 'rgba(212,175,55,0.12)', borderColor: '#D4AF37', borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  supportBtn2: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(212,175,55,0.15)', borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  supportText: { color: '#D4AF37', fontWeight: '700', fontSize: 12 }
});

