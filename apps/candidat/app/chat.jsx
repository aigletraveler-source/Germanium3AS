import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../packages/shared/supabase';

export default function Chat() {
  const { candidateId } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  const fetch = async () => {
    if (!candidateId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${candidateId},receiver_id.eq.admin),and(sender_id.eq.admin,receiver_id.eq.${candidateId})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  useEffect(() => {
    fetch();
    const ch = supabase.channel(`candidat-${candidateId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetch).subscribe();
    const iv = setInterval(() => { supabase.rpc('cleanup_expired_messages'); fetch(); }, 5000);
    return () => { supabase.removeChannel(ch); clearInterval(iv); };
  }, [candidateId]);

  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [messages]);

  const send = async () => {
    if (!input.trim() || !candidateId) return;
    const msg = {
      sender_id: candidateId,
      sender_role: 'candidat',
      receiver_id: 'admin',
      receiver_role: 'admin',
      content: input,
      is_auto_destruct: true,
      destruct_after_seconds: 86400
    };
    const { error } = await supabase.from('messages').insert(msg);
    if (error) Alert.alert('Erreur', error.message);
    else setInput('');
  };

  const markRead = async (id) => {
    await supabase.from('messages').update({ is_read: true, is_read_by_both: true }).eq('id', id);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Messagerie éphémère — 24h après envoi ou lu par les deux = supprimé</Text>
      <ScrollView ref={scrollRef} style={styles.list} contentContainerStyle={{ padding: 12 }}>
        {messages.map(m => {
          const isMe = m.sender_id === candidateId;
          return (
            <Pressable key={m.id} onPress={() => !m.is_read_by_both && markRead(m.id)} style={[styles.bubble, isMe ? styles.me : styles.other]}>
              <Text style={styles.content}>{m.content}</Text>
              <Text style={styles.meta}>{new Date(m.created_at).toLocaleTimeString()} {m.is_read_by_both ? '✓✓ lu' : m.is_read ? '✓ lu' : '◷'} {m.expires_at ? `• expire ${new Date(m.expires_at).toLocaleTimeString()}` : ''}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput value={input} onChangeText={setInput} placeholder="Message à l'admin..." placeholderTextColor="#6B7280" style={styles.input} />
        <Pressable onPress={send} style={styles.send}><Text style={styles.sendText}>→</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#052E16' },
  header: { color: '#D4AF37', fontSize: 11, textAlign: 'center', padding: 10, backgroundColor: 'rgba(212,175,55,0.08)' },
  list: { flex: 1 },
  bubble: { maxWidth: '78%', borderRadius: 14, padding: 10, marginBottom: 8 },
  me: { backgroundColor: '#D4AF37', alignSelf: 'flex-end' },
  other: { backgroundColor: '#1F2937', alignSelf: 'flex-start' },
  content: { color: '#F5F5F5' },
  meta: { color: '#6B7280', fontSize: 10, marginTop: 4 },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, borderTopColor: 'rgba(212,175,55,0.1)', borderTopWidth: 1 },
  input: { flex: 1, backgroundColor: '#121212', borderRadius: 12, padding: 12, color: '#F5F5F5', borderColor: 'rgba(212,175,55,0.2)', borderWidth: 1 },
  send: { backgroundColor: '#D4AF37', borderRadius: 12, width: 46, justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#052E16', fontWeight: '900', fontSize: 18 }
});

