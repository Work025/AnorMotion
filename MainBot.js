require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const mongoose = require('mongoose');

// MongoDB ulanishi
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://worknotivo_db_user:<db_password>@anivo.8zlwakg.mongodb.net/anor_motion?retryWrites=true&w=majority';

mongoose.connect(mongoURI)
  .then(() => console.log("MongoDB-ga muvaffaqiyatli ulandi."))
  .catch(err => console.error("MongoDB ulanish xatosi:", err));

// Anime Schema
const contentSchema = new mongoose.Schema({
  fileId: String,
  season: Number,
  part: Number,
  episode: Number,
  film: Number,
  addedAt: { type: Date, default: Date.now }
});

const animeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  year: String,
  genres: String,
  country: String,
  image: String,
  order: { type: Number, default: 0 },
  isPremium: { type: Boolean, default: false },
  description: String,
  content: [contentSchema]
});

const Anime = mongoose.model('Anime', animeSchema);
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Adminlar ro'yxati
const ADMINS = ['Fozilxon88', 'ZYRONIX_ADMIN'];

// Bot holati (State)
let botState = {
  isStopped: false,
  adminData: {} 
};

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// HTTP Server - API va Rasmlar uchun
const port = process.env.PORT || 10000;
http.createServer(async (req, res) => {
  // CORS ruxsati
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.url === '/api/data') {
    try {
      const animes = await Anime.find({}).sort({ order: 1 });
      const data = {};
      animes.forEach(a => { data[a.id] = a; });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500);
      return res.end("Database Error");
    }
  }

  // Statik rasmlarni uzatish (/uploads/...)
  if (req.url.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, 'public', req.url);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Anor Motion API ishlamoqda...');
}).listen(port);

console.log(`Server ${port}-portda ishlamoqda.`);

// Admin tekshiruvi
function isAdmin(msg) {
  return msg.from && msg.from.username && ADMINS.includes(msg.from.username);
}

// Belgilarni parsing qilish funksiyasi
function parseContentTag(text) {
  // | -> season, [] -> part, () -> episode, {} -> film
  const seasonMatch = text.match(/(\d+)\s*\|/);
  const partMatch = text.match(/\[(\d+)\]/);
  const episodeMatch = text.match(/\((\d+)\)/);
  const filmMatch = text.match(/\{(\d+)\}/);

  return {
    season: seasonMatch ? parseInt(seasonMatch[1]) : null,
    part: partMatch ? parseInt(partMatch[1]) : null,
    episode: episodeMatch ? parseInt(episodeMatch[1]) : null,
    film: filmMatch ? parseInt(filmMatch[1]) : null
  };
}

// /start buyrug'i
bot.onText(/\/start/, (msg) => {
  if (botState.isStopped && !isAdmin(msg)) return;
  botState.isStopped = false;

  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🍎 Mini App", web_app: { url: 'https://anor-motion.vercel.app' } }],
        isAdmin(msg) ? [{ text: "🛠 Admin Help", callback_data: 'admin_help' }] : []
      ].filter(r => r.length > 0)
    }
  };
  bot.sendMessage(msg.chat.id, "Xush kelibsiz! Animelarni ko'rish uchun ilovani oching:", opts);
});

// /adminhelp
bot.onText(/\/adminhelp/, (msg) => {
  if (!isAdmin(msg)) return;
  const helpText = `🛠 *Admin Buyruqlari:*

/setanime <ID> - Animeni tanlash (Masalan: /setanime 1)
/setanime-nomi <Nomi>
/setanime-yili <Yili>
/setanime-janir <Janrlar>
/setanime-joyi <Tartibi>
/setanime-img - Rasm yuboring (800x800 kesiladi)
/setvideo <ID> | (Qism) - Videoga reply qilib yozing
/setoragajoylash - O'rtaga qism qo'shish
/setdelet-1 - ID-1 ni butunlay o'chirish
/setstop - Animeni tahrirlashni yakunlash
/STOP - Botni qotirish
/animes - Barcha animelar ro'yxati`;
  bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
});

// /STOP
bot.onText(/\/STOP/, (msg) => {
  if (!isAdmin(msg)) return;
  botState.isStopped = true;
  bot.sendMessage(msg.chat.id, "🛑 Bot qotirildi. Qayta ishga tushirish uchun /start bosing.");
});

// /setanime <ID>
bot.onText(/\/setanime (\w+)/, async (msg, match) => {
  if (!isAdmin(msg)) return;
  const id = match[1];
  const userId = msg.from.id;
  
  botState.adminData[userId] = { activeAnimeId: id, action: 'none' };
  
  try {
    let anime = await Anime.findOne({ id });
    if (!anime) {
      anime = new Anime({ id, title: '', year: '', genres: '', country: '', image: '', order: 0 });
      await anime.save();
    }
    bot.sendMessage(msg.chat.id, `✅ Anime ID: ${id} tanlandi. Endi ma'lumotlarni kiriting.`);
  } catch (err) {
    bot.sendMessage(msg.chat.id, "❌ Bazaga ulanishda xatolik.");
  }
});

// /setanime-nomi
bot.onText(/\/setanime-nomi (.+)/, async (msg, match) => {
  if (!isAdmin(msg)) return;
  const admin = botState.adminData[msg.from.id];
  if (!admin) return bot.sendMessage(msg.chat.id, "❌ Avval /setanime ID buyrug'ini bering.");
  
  try {
    const anime = await Anime.findOne({ id: admin.activeAnimeId });
    if (anime) {
      anime.title = match[1];
      await anime.save();
      bot.sendMessage(msg.chat.id, `✅ Nomi sozlandi: ${match[1]}`);
    }
  } catch (err) { bot.sendMessage(msg.chat.id, "❌ Xatolik yuz berdi."); }
});

// /setanime-yili, -janir, -joyi, -davlati
const settings = {
  'setanime-yili': 'year',
  'setanime-janir': 'genres',
  'setanime-joyi': 'order',
  'setanime-davlati': 'country'
};

Object.keys(settings).forEach(cmd => {
  bot.onText(new RegExp(`\\/${cmd} (.+)`), async (msg, match) => {
    if (!isAdmin(msg)) return;
    const admin = botState.adminData[msg.from.id];
    if (!admin) return bot.sendMessage(msg.chat.id, "❌ Avval /setanime ID buyrug'ini bering.");
    
    try {
      const anime = await Anime.findOne({ id: admin.activeAnimeId });
      if (anime) {
        anime[settings[cmd]] = match[1];
        await anime.save();
        bot.sendMessage(msg.chat.id, `✅ ${settings[cmd]} yangilandi.`);
      }
    } catch (err) { bot.sendMessage(msg.chat.id, "❌ Xatolik yuz berdi."); }
  });
});
// /setdetails <ID> | <Nomi> | <Yili> | <Davlati> | <Janri>
bot.onText(/\/setdetails (.+)/, async (msg, match) => {
  if (!isAdmin(msg)) return;
  const parts = match[1].split('|').map(p => p.trim());
  if (parts.length < 5) return bot.sendMessage(msg.chat.id, "❌ Format: ID | Nomi | Yili | Davlati | Janri");
  
  const [id, title, year, country, genres] = parts;
  try {
    await Anime.findOneAndUpdate({ id }, { title, year, country, genres }, { upsert: true });
    bot.sendMessage(msg.chat.id, `✅ Anime ${id} uchun barcha ma'lumotlar saqlandi!`);
  } catch (err) { bot.sendMessage(msg.chat.id, "❌ Xatolik."); }
});

// /setanime-img
bot.onText(/\/setanime-img/, (msg) => {
  if (!isAdmin(msg)) return;
  const admin = botState.adminData[msg.from.id];
  if (!admin) {
    return bot.sendMessage(msg.chat.id, "❌ Buning uchun avval /setanime ID buyrug'i orqali animeni tanlang.");
  }
  admin.action = 'waiting_photo';
  bot.sendMessage(msg.chat.id, "🖼 Iltimos, anime uchun rasm yuboring (800x800 o'lchamga keltiriladi):");
});

// /setvideo (Reply qilingan video uchun)
bot.onText(/\/setvideo (.+)/, async (msg, match) => {
  if (!isAdmin(msg)) return;
  if (!msg.reply_to_message || !msg.reply_to_message.video) {
    return bot.sendMessage(msg.chat.id, "❌ Iltimos, videoga Reply qilib yozing.");
  }

  const tags = parseContentTag(match[1]);
  const animeId = match[1].split(' ')[0];
  const fileId = msg.reply_to_message.video.file_id;

  try {
    const anime = await Anime.findOne({ id: animeId });
    if (!anime) return bot.sendMessage(msg.chat.id, "❌ Bu ID li anime topilmadi.");

    const newItem = {
      fileId,
      season: tags.season,
      part: tags.part,
      episode: tags.episode,
      film: tags.film
    };

    anime.content.push(newItem);
    await anime.save();
    bot.sendMessage(msg.chat.id, `✅ Video saqlandi! [S:${tags.season} E:${tags.episode}]`);
  } catch (err) { bot.sendMessage(msg.chat.id, "❌ Xatolik yuz berdi."); }
});

// /animes
bot.onText(/\/animes/, async (msg) => {
  if (!isAdmin(msg)) return;
  try {
    const animes = await Anime.find({});
    const list = animes.map(a => `${a.id}: ${a.title}`).join('\n') || "Hali animelar yo'q.";
    bot.sendMessage(msg.chat.id, `📂 *Baza (MongoDB):* \n\n${list}`, { parse_mode: 'Markdown' });
  } catch (err) { bot.sendMessage(msg.chat.id, "❌ Bazani o'qib bo'lmadi."); }
});

// /setdelet-<id>
bot.onText(/\/setdelet-(\w+)/, async (msg, match) => {
  if (!isAdmin(msg)) return;
  try {
    const result = await Anime.findOneAndDelete({ id: match[1] });
    if (result) {
      bot.sendMessage(msg.chat.id, `🗑 Anime ID: ${match[1]} o'chirildi.`);
    }
  } catch (err) { bot.sendMessage(msg.chat.id, "❌ Xatolik."); }
});

// Rasm va Fayllarni qayta ishlash funksiyasi
async function handleImageUpload(msg, fileId) {
  const admin = botState.adminData[msg.from.id];
  if (!isAdmin(msg) || !admin || admin.action !== 'waiting_photo') return;

  try {
    const localPath = await bot.downloadFile(fileId, uploadDir);
    const fileName = `${admin.activeAnimeId}_${Date.now()}.jpg`;
    const finalPath = path.join(uploadDir, fileName);

    // Rasmni 800x800 kesish
    await sharp(localPath)
      .resize(800, 800, { fit: 'cover', position: 'center' })
      .toFile(finalPath);

    // Vaqtinchalik yuklangan faylni o'chirish
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

    const anime = await Anime.findOne({ id: admin.activeAnimeId });
    if (anime) {
      anime.image = `/uploads/${fileName}`;
      await anime.save();
    }

    admin.action = 'none';
    bot.sendMessage(msg.chat.id, "✅ Rasm muvaffaqiyatli yuklandi va 800x800 o'lchamga keltirildi!");
  } catch (error) {
    console.error("Upload Error:", error);
    bot.sendMessage(msg.chat.id, "❌ Rasmni yuklash yoki kesishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
  }
}

// Foto yuklanganda
bot.on('photo', async (msg) => {
  const photo = msg.photo[msg.photo.length - 1];
  await handleImageUpload(msg, photo.file_id);
});

// Fayl (Document) yuklanganda
bot.on('document', async (msg) => {
  if (msg.document && msg.document.mime_type && msg.document.mime_type.startsWith('image/')) {
    await handleImageUpload(msg, msg.document.file_id);
  }
});

// callback_query uchun (Admin help tugmasi)
bot.on('callback_query', (cb) => {
  if (cb.data === 'admin_help') {
    bot.answerCallbackQuery(cb.id);
    bot.sendMessage(cb.message.chat.id, "Buyruqlarni ko'rish uchun /adminhelp yozing.");
  }
});

// Polling xatolarini kuzatish
bot.on('polling_error', (error) => {
  console.log("Polling error:", error.code);
});

// Xatoliklarni tutish (Process crash bo'lmasligi uchun)
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
