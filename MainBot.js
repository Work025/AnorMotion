require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
const fs = require('fs');
const path = require('path');
const videosFile = path.join(__dirname, 'videos.json');

// Bazani o'qish funksiyasi
function loadVideosStore() {
  try {
    if (fs.existsSync(videosFile)) {
      return JSON.parse(fs.readFileSync(videosFile, 'utf8'));
    }
  } catch (error) {
    console.error("videos.json o'qishda xatolik:", error);
  }
  return {};
}

// Bazaga yozish funksiyasi
function saveVideosStore(data) {
  try {
    fs.writeFileSync(videosFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("videos.json ga yozishda xatolik:", error);
  }
}

// Admin sozlamalari (O'z Telegram username ingiz)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Fozilxon88"; 
// Render uchun dummmy HTTP server (Free Tier uchun kerak)
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot ishlayapti...\n');
}).listen(port);

console.log(`HTTP server ${port}-portda ishlamoqda.`);

// Tokenni o'rnating
const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("Xatolik: .env faylida BOT_TOKEN topilmadi!");
  process.exit(1);
}

// Botni polling rejimi bilan ishga tushiring
const bot = new TelegramBot(token, { polling: true });

// Obuna bo'lish kerak bo'lgan kanallar ro'yxati (Faqat @username ko'rinishida yozing)
const channels = ['@websitemake025', '@Fimodauz'];

console.log('Bot ishga tushdi...');

// Obunani tekshirish funksiyasi
async function checkSubscription(userId) {
  console.log(`User ${userId} uchun obuna tekshirilmoqda...`);
  for (const channel of channels) {
    try {
      const member = await bot.getChatMember(channel, userId);
      console.log(`Kanal: ${channel}, Status: ${member.status}`);
      
      // Agar foydalanuvchi asoschi yoki admin bo'lsa, obuna bo'lgan hisoblanadi
      if (['creator', 'administrator', 'member'].includes(member.status)) {
        continue; // Keyingi kanalga o'tish
      } else {
        return false; // Obuna bo'lmagan (left, kicked)
      }
    } catch (error) {
      console.error(`${channel} kanalini tekshirishda xatolik:`, error.message);
      // Agar kanal topilmasa yoki boshqa xato bo'lsa, uni o'tkazib yuboramiz (ixtiyoriy)
      // return false; // Agar xohlasangiz, xatolikda qaytarib yuboring
    }
  }
  return true;
}


// /start komandasi anime ID parametrlari bilan
bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const commandParam = match[1];

  const isSubscribed = await checkSubscription(userId);

  if (!isSubscribed) {
    return sendSubscriptionPrompt(chatId);
  }

  // Agar shunchaki start bosilsa
  if (!commandParam) {
    sendMainMenu(chatId);
  } 
  // Agar /start anime_id ko'rinishida kelsa
  else if (commandParam.startsWith('anime_')) {
    const animeId = commandParam.replace('anime_', '');
    const videosStore = loadVideosStore();
    
    const videoFileId = videosStore[animeId];

    if (videoFileId) {
        bot.sendMessage(chatId, "Yuklanmoqda... ⏳").then((waitMsg) => {
        bot.sendVideo(chatId, videoFileId, {
            caption: "🎬 Qidirgan anime-ingiz tayyor! Maroqli tomosha!"
        }).then(() => {
            bot.deleteMessage(chatId, waitMsg.message_id).catch(()=>{});
        }).catch((err) => {
            console.error(err);
            bot.sendMessage(chatId, "Video yuborishda xatolik yuz berdi 😔");
            bot.deleteMessage(chatId, waitMsg.message_id).catch(()=>{});
        });
        });
    } else {
        bot.sendMessage(chatId, "Kechirasiz, bu video xali bazamizga qo'shilmagan 😔");
        sendMainMenu(chatId);
    }
  }
});

// Admin uchun video saqlash funksiyasi
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  
  // Faqat video va reply tahlil qilinadi
  // msg.from.username @ siz yoziladi
  if (msg.text && msg.text.startsWith('/setanime') && msg.from.username === ADMIN_USERNAME) {
    if (msg.reply_to_message && msg.reply_to_message.video) {
        const fileId = msg.reply_to_message.video.file_id;
        const animeId = msg.text.split(' ')[1]; // masalan: /setanime 1
        
        if (!animeId) {
            return bot.sendMessage(chatId, "XATO: Anime ID sini kiriting. Masalan: /setanime 1");
        }
        
        const videosStore = loadVideosStore();
        videosStore[animeId] = fileId;
        saveVideosStore(videosStore);
        
        bot.sendMessage(chatId, `✅ Anime ID "${animeId}" bazaga saqlandi!\n\nFile ID: ${fileId}`);
    } else {
        bot.sendMessage(chatId, "XATO: Iltimos, /setanime ID buyrug'ini botga yuborgan videongizga *reply* (javob) qilib yozing!");
    }
  }
});

// Asosiy menyuni yuborish
function sendMainMenu(chatId) {
  const opts = {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🍎 Anor | Motion Mini App",
            web_app: { url: 'https://anor-motion.vercel.app' }
          }
        ],
        [
          {
            text: "🎬 Bizning kanal",
            url: 'https://t.me/websitemake025'
          },
          {
            text: "🎭 Senariyni o'qish",
            url: 'https://t.me/bizbirgalikdakurashamizsenari'
          }
        ]
      ]
    }
  };
  bot.sendMessage(chatId, "<b>Xush kelibsiz!</b>\n\nQuyidagi tugma orqali ilovamizga kirishingiz va animelarni ko'rishingiz mumkin:", opts);
}

// Obuna bo'lish haqida xabar yuborish
function sendSubscriptionPrompt(chatId) {
  const opts = {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: "1️⃣ Mashhur kanallarimiz", url: 'https://t.me/websitemake025' }
        ],
        [
          { text: "2️⃣ Fimodauz kanali", url: 'https://t.me/Fimodauz' }
        ],
        [
          { text: "✅ Tekshirish", callback_data: 'check_subs' }
        ]
      ]
    }
  };
  bot.sendMessage(chatId, "<b>Assalomu alaykum!</b>\n\nBotdan foydalanish uchun avval quyidagi kanallarga obuna bo'ling va <b>'Tekshirish'</b> tugmasini bosing:", opts);
}

// Tugmalarni boshqarish
bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;

  if (action === 'check_subs') {
    const isSubscribed = await checkSubscription(userId);
    if (isSubscribed) {
      try {
        await bot.deleteMessage(chatId, msg.message_id);
      } catch (e) { }
      sendMainMenu(chatId);
      bot.answerCallbackQuery(callbackQuery.id, { text: "Rahmat! Obuna tasdiqlandi." });
    } else {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Siz hali barcha kanallarga obuna bo'lmagansiz!",
        show_alert: true
      });
    }
  }
});

// Polling xatoliklari
bot.on('polling_error', (error) => {
  if (error.message.includes('409 Conflict')) {
    console.error("Xatolik: Boshqa bot instansiyasi ishlayapti.");
  } else {
    console.error("Polling xatosi:", error.message);
  }
});
