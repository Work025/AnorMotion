require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

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


// /start komandasi
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const isSubscribed = await checkSubscription(userId);

  if (isSubscribed) {
    sendMainMenu(chatId);
  } else {
    sendSubscriptionPrompt(chatId);
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
