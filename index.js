const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('🔥 NanzzAi Bot is alive!'));
app.listen(PORT, () => console.log(`✅ Server jalan di port ${PORT}`));

// ==================== WHATSAPP SETUP ====================
const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    downloadMediaMessage
} = require('@whiskeysockets/baileys');
const axios = require('axios');
const fs = require('fs');

const AI_NAME = 'NanzzAi 🎀';
const CREATOR = 'Nanzz';
const PREFIX = '/';
const BASE_API = 'https://api-nanzz.my.id';

// ==================== AI CLAUDE HAIKU (Endpoint Nanzz) ====================
async function tanyaAI(prompt, namaUser) {
    try {
        const response = await axios.get(`${BASE_API}/api/ai/claude-haiku`, {
            params: {
                text: prompt
            },
            timeout: 30000
        });

        if (response.data && response.data.success !== false) {
            return response.data.result || response.data.response || response.data.message || '✨ *NanzzAi says:*\n\n' + JSON.stringify(response.data);
        }
        return 'Maaf, AI-nya lagi ngantuk nih 😴 Coba lagi nanti ya~';

    } catch (err) {
        console.error('AI Error:', err.message);
        return 'Ups! Ada masalah koneksi ke AI 😢 Coba lagi nanti~';
    }
}

// ==================== FITUR DOWNLOAD ====================
async function aioDownloader(url) {
    try {
        const response = await axios.get(`${BASE_API}/api/downloader/aio`, {
            params: { url: url },
            timeout: 60000
        });

        if (response.data && response.data.status) {
            return response.data;
        }
        return null;
    } catch (err) {
        console.error('Downloader Error:', err.message);
        return null;
    }
}

// ==================== FITUR YT PLAY ====================
async function ytPlay(query) {
    try {
        const response = await axios.get(`${BASE_API}/api/downloader/ytplay`, {
            params: { query: query },
            timeout: 60000
        });

        if (response.data && response.data.status) {
            return response.data;
        }
        return null;
    } catch (err) {
        console.error('YT Play Error:', err.message);
        return null;
    }
}

// ==================== FITUR BRAT ====================
async function bratMaker(text) {
    try {
        const response = await axios.get(`${BASE_API}/api/maker/brat`, {
            params: { text: text },
            timeout: 30000
        });

        if (response.data && response.data.status) {
            return response.data;
        }
        return null;
    } catch (err) {
        console.error('Brat Error:', err.message);
        return null;
    }
}

// ==================== FITUR BRAT VIDEO ====================
async function bratVidMaker(text) {
    try {
        const response = await axios.get(`${BASE_API}/api/maker/bratvid`, {
            params: { text: text },
            timeout: 60000
        });

        if (response.data && response.data.status) {
            return response.data;
        }
        return null;
    } catch (err) {
        console.error('Bratvid Error:', err.message);
        return null;
    }
}

// ==================== FITUR IQC ====================
async function iqcMaker(text, provider, jam, baterai) {
    try {
        const response = await axios.get(`${BASE_API}/api/maker/iqc`, {
            params: {
                text: text,
                provider: provider || 'XL',
                jam: jam || '12:00',
                baterai: baterai || '1'
            },
            timeout: 30000
        });

        if (response.data && response.data.status) {
            return response.data;
        }
        return null;
    } catch (err) {
        console.error('IQC Error:', err.message);
        return null;
    }
}

// ==================== PROCESS PESAN ====================
async function processMessage(sock, msg) {
    const from = msg.key.remoteJid;
    const sender = msg.pushName || 'User';
    const isGroup = from.endsWith('@g.us');
    const body = msg.message?.conversation ||
                 msg.message?.extendedTextMessage?.text ||
                 msg.message?.imageMessage?.caption ||
                 msg.message?.videoMessage?.caption || '';

    // Skip kalau dari bot sendiri atau status
    if (msg.key.fromMe) return;
    if (from === 'status@broadcast') return;

    // ==================== AI AUTO-REPLY ====================
    const isTaggedBot = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(sock.user.id);
    const isReplyToBot = msg.message?.extendedTextMessage?.contextInfo?.participant === sock.user.id;
    const isPrivateChat = !isGroup;

    const shouldAutoReply = isPrivateChat || isTaggedBot || isReplyToBot;

    if (shouldAutoReply && body && !body.startsWith(PREFIX)) {
        await sock.sendPresenceUpdate('composing', from);
        const aiResponse = await tanyaAI(body, sender);
        await sock.sendMessage(from, { text: `🤖 *${AI_NAME}* \n\n${aiResponse}\n\n╰┈➤ *Requested by:* ${sender}` });
        return;
    }

    // ==================== FITUR PERINTAH ====================
    if (!body.startsWith(PREFIX)) return;

    const args = body.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    // Command: /ai <pertanyaan>
    if (command === 'ai') {
        const pertanyaan = args.join(' ');
        if (!pertanyaan) {
            await sock.sendMessage(from, { text: `❌ Masukkan pertanyaannya!\n\nContoh: */ai halo apa kabar*` });
            return;
        }
        await sock.sendPresenceUpdate('composing', from);
        const jawaban = await tanyaAI(pertanyaan, sender);
        await sock.sendMessage(from, { text: `🤖 *${AI_NAME}* \n\n${jawaban}\n\n╰┈➤ *${sender}*` });
    }

    // Command: /aio <url>
    else if (command === 'aio') {
        const url = args[0];
        if (!url) {
            await sock.sendMessage(from, { text: `❌ Masukkan URL!\n\nContoh: */aio https://vt.tiktok.com/xxxx*` });
            return;
        }
        await sock.sendMessage(from, { text: '⏳ *Lagi download...* Sabar yaa~' });
        const result = await aioDownloader(url);
        if (result && result.data) {
            const dl = result.data;
            if (dl.type === 'image' || dl.type === 'photo') {
                await sock.sendMessage(from, { image: { url: dl.url }, caption: `✅ *Download berhasil!*\n\n📌 *Title:* ${dl.title || 'No title'}` });
            } else if (dl.type === 'video') {
                await sock.sendMessage(from, { video: { url: dl.url }, caption: `✅ *Download berhasil!*\n\n📌 *Title:* ${dl.title || 'No title'}` });
            } else {
                await sock.sendMessage(from, { text: `✅ *Link Download:*\n\n${dl.url || result.data}\n\n📌 *Title:* ${dl.title || 'No title'}` });
            }
        } else {
            await sock.sendMessage(from, { text: '❌ Gagal download! Pastikan URL valid ya~' });
        }
    }

    // Command: /ytplay <judul lagu>
    else if (command === 'ytplay') {
        const query = args.join(' ');
        if (!query) {
            await sock.sendMessage(from, { text: `❌ Masukkan judul lagu!\n\nContoh: */ytplay melukis senja*` });
            return;
        }
        await sock.sendMessage(from, { text: '⏳ *Lagi cari lagu...* 🎵' });
        const result = await ytPlay(query);
        if (result && result.data) {
            const yt = result.data;
            await sock.sendMessage(from, {
                text: `🎵 *YOUTUBE PLAYER*\n\n📌 *Judul:* ${yt.title}\n👤 *Channel:* ${yt.channel}\n⏱ *Durasi:* ${yt.duration}\n👁 *Views:* ${yt.views}\n\n📥 *Download:* ${yt.download || 'N/A'}\n🔗 *Link:* ${yt.url}`,
                image: yt.thumbnail ? { url: yt.thumbnail } : undefined
            });
        } else {
            await sock.sendMessage(from, { text: '❌ Lagu nggak ketemu 😢 Coba keyword lain~' });
        }
    }

    // Command: /brat <text>
    else if (command === 'brat') {
        const text = args.join(' ');
        if (!text) {
            await sock.sendMessage(from, { text: `❌ Masukkan teks!\n\nContoh: */brat Nanzz ganteng*` });
            return;
        }
        await sock.sendMessage(from, { text: '⏳ *Lagi bikin Brat image...* 🎨' });
        const result = await bratMaker(text);
        if (result && result.image) {
            await sock.sendMessage(from, { image: { url: result.image }, caption: `✅ *Brat Maker*\n\n📝 Teks: ${text}` });
        } else {
            await sock.sendMessage(from, { text: '❌ Gagal bikin Brat image 😢' });
        }
    }

    // Command: /bratvid <text>
    else if (command === 'bratvid') {
        const text = args.join(' ');
        if (!text) {
            await sock.sendMessage(from, { text: `❌ Masukkan teks!\n\nContoh: */bratvid Nanzz ganteng*` });
            return;
        }
        await sock.sendMessage(from, { text: '⏳ *Lagi bikin Brat video...* 🎬 Proses agak lama~' });
        const result = await bratVidMaker(text);
        if (result && result.video) {
            await sock.sendMessage(from, { video: { url: result.video }, caption: `✅ *Brat Video Maker*\n\n📝 Teks: ${text}` });
        } else {
            await sock.sendMessage(from, { text: '❌ Gagal bikin Brat video 😢' });
        }
    }

    // Command: /iqc <text> [provider] [jam] [baterai]
    else if (command === 'iqc') {
        const params = body.slice(PREFIX.length).trim().split('|').map(s => s.trim());
        const text = params[0]?.replace('/iqc', '').trim();
        const provider = params[1] || 'XL';
        const jam = params[2] || '12:00';
        const baterai = params[3] || '1';

        if (!text) {
            await sock.sendMessage(from, { text: `❌ Masukkan teks!\n\nContoh: */iqc Nanzz ganteng|XL|12:00|1*` });
            return;
        }
        await sock.sendMessage(from, { text: '⏳ *Lagi bikin fake chat...* 💬' });
        const result = await iqcMaker(text, provider, jam, baterai);
        if (result && result.image) {
            await sock.sendMessage(from, { image: { url: result.image }, caption: `✅ *IQC Maker*\n\n📝 Teks: ${text}\n📱 Provider: ${provider}\n🕐 Jam: ${jam}` });
        } else {
            await sock.sendMessage(from, { text: '❌ Gagal bikin fake chat 😢' });
        }
    }

    // Command: /help
    else if (command === 'help') {
        const helpText = `🤖 *${AI_NAME} - MENU BANTUAN*\n\n` +
            `Hai ${sender}! Ini fitur yang tersedia:\n\n` +
            `🎀 *FITUR AI*\n` +
            `├ • Chat/Reply/Tag bot → Auto balas pakai AI\n` +
            `├ • */ai <pertanyaan>* → Tanya AI langsung\n\n` +
            `📥 *FITUR DOWNLOAD*\n` +
            `├ • */aio <url>* → Download TikTok/IG/FB/dll\n` +
            `├ • */ytplay <judul>* → Cari & download lagu\n\n` +
            `🎨 *FITUR MAKER*\n` +
            `├ • */brat <teks>* → Bikin Brat image\n` +
            `├ • */bratvid <teks>* → Bikin Brat video\n` +
            `├ • */iqc <teks|provider|jam|baterai>* → Fake chat\n\n` +
            `📌 *Contoh IQC:* /iqc halo|XL|12:00|1\n\n` +
            `💡 *Tips:* Tag/reply bot di grup buat auto AI!\n\n` +
            `👑 *Created by ${CREATOR}*`;
        await sock.sendMessage(from, { text: helpText });
    }
}

// ==================== CONNECT TO WHATSAPP ====================
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['NanzzAi Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus, reconnect:', shouldReconnect);
            if (shouldReconnect) setTimeout(connectToWhatsApp, 5000);
        } else if (connection === 'open') {
            console.log('✅ NanzzAi Bot terhubung ke WhatsApp!');
        }
    });

    sock.ev.on('messages.upsert', async (msg) => {
        if (msg.type === 'notify') {
            for (const message of msg.messages) {
                await processMessage(sock, message);
            }
        }
    });

    return sock;
}

// ==================== START BOT ====================
connectToWhatsApp();
console.log('🚀 Starting NanzzAi Bot...');
