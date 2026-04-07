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

// Asosiy menyuni yuborish
function sendMainMenu(chatId) {
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📖 Senariyni o'qish",
            url: 'https://t.me/bizbirgalikdakurashamizsenari'
          }
        ],
        [
          {
            text: "🎭 Mangani ko'rib o'qish (Mini App)",
            web_app: { url: 'https://anor-motion.vercel.app' }
          }
        ]
      ]
    }
  };
  bot.sendMessage(chatId, "Assalomu alaykum! Obuna uchun rahmat. Manga o'qish bo'limini tanlang:", opts);
}

// Obuna bo'lish haqida xabar yuborish
function sendSubscriptionPrompt(chatId) {
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "1️⃣ Kanalga a'zo bo'lish", url: 'https://t.me/websitemake025' }
        ],
        [
          { text: "✅ Tekshirish (A'zo bo'lgach bosing)", callback_data: 'check_subs' }
        ]
      ]
    }
  };
  bot.sendMessage(chatId, "Botdan foydalanish uchun avval quyidagi kanalga obuna bo'ling va 'Tekshirish' tugmasini bosing:", opts);
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
      bot.answerCallbackQuery(callbackQuery.id, { text: "Tabriklaymiz! Obuna tasdiqlandi." });
    } else {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Siz hali kanalga obuna bo'lmagansiz! Iltimos, a'zo bo'ling va qayta urinib ko'ring.",
        show_alert: true
      });
    }
  } else if (action === 'read_manga_visual') {
    bot.sendMessage(chatId, "Mangani ko'rib o'qish xizmati tez orada ishga tushadi. Hozircha veb-sayt tayyorlanmoqda.");
    bot.answerCallbackQuery(callbackQuery.id);
  } else {
    bot.answerCallbackQuery(callbackQuery.id);
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
