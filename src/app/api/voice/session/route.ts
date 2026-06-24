import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { dbQuery } from '@/lib/db';
import crypto from 'crypto';
import { getUserActivePlan, checkFeatureAccess } from '@/lib/accessControl';
import { uploadToSupabase } from '@/lib/supabaseAdmin';
import { generateEdgeTTSBuffer } from '@/lib/tts';

// GET /api/voice/session - Ambil semua sesi curhat milik user
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: 'Harus login dulu ya' }, { status: 401 });
    }

    // Access Control: Check active subscription plan
    const plan = await getUserActivePlan(user.id);
    if (!checkFeatureAccess(plan, 'voice-talk')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Akses ditolak! Fitur Teman Curhat (Voice) ini hanya tersedia di paket Premium ke atas.' 
      }, { status: 403 });
    }

    const sessions = await dbQuery<any>(
      `SELECT id, title, metadata, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as date, updated_at
       FROM conversation_sessions 
       WHERE user_id = ? 
       ORDER BY updated_at DESC`,
      [user.id]
    );

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error('Error fetching voice sessions:', error);
    return NextResponse.json({ message: 'Gagal mengambil sesi curhat' }, { status: 500 });
  }
}

function generateGreetingText(name: string, status: string): string {
  const statusLower = status.toLowerCase();
  let joke = '';
  
  if (statusLower.includes('jomblo')) {
    const options = [
      `Wah, jomblo ya. Santai, bukan berarti kamu sepi peminat, mungkin emang universe lagi nyusun plot twist yang lebih worth it.`,
      `Jomblo? Oke, berarti fokus kita sekarang bukan drama pasangan, tapi gimana kamu tetap waras, tetap keren, dan nggak keteteran sama overthinking.`
    ];
    joke = options[Math.floor(Math.random() * options.length)];
  } else if (statusLower.includes('pacaran')) {
    const options = [
      `Oke, lagi pacaran. Berarti sekarang kita bahas gimana caranya biar chat nggak jadi ladang salah paham.`,
      `Pacaran ya? Mantap. Sekarang tinggal kita bedah biar hubungan kamu nggak gampang kena angin kecil terus goyah.`
    ];
    joke = options[Math.floor(Math.random() * options.length)];
  } else if (statusLower.includes('pdkt') || statusLower.includes('pendekatan')) {
    const options = [
      `Wih, fase PDKT nih. Ini fase paling rawan salah langkah, jadi kita rapihin biar nggak ngegas duluan.`,
      `PDKT ya? Oke, kita bantu biar vibe-nya tetep smooth, bukan malah jadi awkward.`
    ];
    joke = options[Math.floor(Math.random() * options.length)];
  } else if (statusLower.includes('menikah')) {
    const options = [
      `Oke, udah menikah. Berarti kita main di level komunikasi yang harus lebih dewasa, bukan cuma saling ngira-ngira.`,
      `Menikah itu bukan cuma soal bareng-bareng, tapi soal gimana dua orang tetap waras pas lagi capek bareng.`
    ];
    joke = options[Math.floor(Math.random() * options.length)];
  } else if (statusLower.includes('putus')) {
    const options = [
      `Baru putus ya? Oke, kita nggak akan sok bijak. Kita dengerin dulu, lalu kita beresin pelan-pelan.`,
      `Baru selesai dari relationship mode? Santai, kita urai pelan-pelan biar hati kamu nggak makin kusut.`
    ];
    joke = options[Math.floor(Math.random() * options.length)];
  } else {
    joke = `Santai, kita urai pelan-pelan ya. Aku di sini siap nemenin dan dengerin keluh kesahmu.`;
  }
  
  return `Yoo, ${name}! Siap curhat? ${joke}`;
}

// POST /api/voice/session - Buat sesi curhat baru dengan onboarding data
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: 'Harus login dulu ya' }, { status: 401 });
    }

    // Access Control: Check active subscription plan
    const plan = await getUserActivePlan(user.id);
    if (!checkFeatureAccess(plan, 'voice-talk')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Akses ditolak! Fitur Teman Curhat (Voice) ini hanya tersedia di paket Premium ke atas.' 
      }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { onboarding, title } = body;

    if (!onboarding) {
      return NextResponse.json({ message: 'Data onboarding wajib diisi' }, { status: 400 });
    }

    const { name, status, goal, topic, emotionLevel, aiResponsePreference } = onboarding;

    // Server-side validation
    if (!name || !name.trim()) {
      return NextResponse.json({ message: 'Nama panggilan wajib diisi' }, { status: 400 });
    }
    if (!status || !status.trim()) {
      return NextResponse.json({ message: 'Status hubungan wajib diisi' }, { status: 400 });
    }
    if (!goal || !goal.trim()) {
      return NextResponse.json({ message: 'Tujuan curhat wajib diisi' }, { status: 400 });
    }
    if (!topic || !topic.trim()) {
      return NextResponse.json({ message: 'Topik utama wajib diisi' }, { status: 400 });
    }
    if (!emotionLevel || !emotionLevel.trim()) {
      return NextResponse.json({ message: 'Tingkat emosi wajib diisi' }, { status: 400 });
    }
    if (!aiResponsePreference || !['santai', 'serius'].includes(aiResponsePreference)) {
      return NextResponse.json({ message: 'Preferensi respon wajib diisi (santai/serius)' }, { status: 400 });
    }

    const sessionId = crypto.randomUUID();
    const sessionTitle = title || `Curhat ${topic} - ${name}`;

    // 1. Simpan sesi ke sistem dengan metadata onboarding
    await dbQuery(
      'INSERT INTO conversation_sessions (id, user_id, title, metadata) VALUES (?, ?, ?, ?)',
      [sessionId, user.id, sessionTitle, JSON.stringify({ onboarding })]
    );

    // 2. Buat sapaan awal
    const greetingText = generateGreetingText(name, status);
    const aiMessageId = crypto.randomUUID();
    const aiReplyId = crypto.randomUUID();
    const ttsFileName = `${aiReplyId}.mp3`;
    let aiAudioUrl: string | null = null;

    // Generate Edge TTS untuk greeting awal ke buffer, lalu upload ke Supabase
    try {
      const voiceConfig = aiResponsePreference === 'serius' 
        ? { voice: 'id-ID-ArdiNeural', rate: '-5%', pitch: 'default' } // Sal (Laki-laki hangat)
        : { voice: 'id-ID-GadisNeural', rate: 'default', pitch: 'default' }; // Eve (Perempuan lembut)

      const audioBuffer = await generateEdgeTTSBuffer(greetingText, voiceConfig);
      aiAudioUrl = await uploadToSupabase('insight-hub', `tts/${ttsFileName}`, audioBuffer, 'audio/mpeg');
    } catch (e) {
      console.error('Failed to generate greeting Edge TTS:', e);
    }

    const finalAiAudioUrl = aiAudioUrl;

    // 3. Simpan greeting message ke penyimpanan
    await dbQuery(
      `INSERT INTO conversation_messages 
       (id, session_id, user_id, sender, message_type, content, ai_text_reply, ai_audio_url, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
      [
        aiMessageId,
        sessionId,
        user.id,
        'ai',
        finalAiAudioUrl ? 'both' : 'text',
        greetingText,
        greetingText,
        finalAiAudioUrl
      ]
    );

    // Simpan ke detail tables
    await dbQuery(
      `INSERT INTO ai_replies (id, message_id, text_reply, audio_url) VALUES (?, ?, ?, ?)`,
      [aiReplyId, aiMessageId, greetingText, finalAiAudioUrl]
    );

    if (finalAiAudioUrl) {
      await dbQuery(
        `INSERT INTO tts_outputs (id, reply_id, audio_url, text) VALUES (?, ?, ?, ?)`,
        [crypto.randomUUID(), aiReplyId, finalAiAudioUrl, greetingText]
      );
      await dbQuery(
        `INSERT INTO ai_audio_replies (id, reply_id, audio_url, duration) VALUES (?, ?, ?, NULL)`,
        [crypto.randomUUID(), aiReplyId, finalAiAudioUrl]
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        title: sessionTitle,
        metadata: JSON.stringify({ onboarding }),
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating voice session:', error);
    return NextResponse.json({ message: 'Gagal membuat sesi curhat baru' }, { status: 500 });
  }
}
