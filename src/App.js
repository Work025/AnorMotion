import React, { useState, useEffect } from 'react';
import './App.css';
import { animeData, trailerData, genres, years } from './data';

const tg = window.Telegram.WebApp;

function App() {
  const [view, setView] = useState('home'); 
  const [user, setUser] = useState(null); // { id: 'A|...|M', isPremium: false }
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [videoLang, setVideoLang] = useState('original');
  const [filterGenre, setFilterGenre] = useState('Barchasi');
  const [filterYear, setFilterYear] = useState('Barchasi');
  const [promoCode, setPromoCode] = useState('');
  const [loginId, setLoginId] = useState('');

  useEffect(() => {
    tg.expand();
    const savedUser = JSON.parse(localStorage.getItem('user'));
    const savedFavs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (savedUser) setUser(savedUser);
    setFavorites(savedFavs);
  }, []);

  const generateId = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newId = `A|${code}|M`;
    const newUser = { id: newId, isPremium: false };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const handleIdLogin = () => {
    if (loginId.startsWith('A|') && loginId.endsWith('|M')) {
      const existingUser = { id: loginId, isPremium: false };
      setUser(existingUser);
      localStorage.setItem('user', JSON.stringify(existingUser));
    } else {
      alert("ID formati noto'g'ri! (A|...|M)");
    }
  };

  const handlePromo = () => {
    if (promoCode === 'ANOR100') {
      const updatedUser = { ...user, isPremium: true };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      alert("Tabriklaymiz! Premium faollashtirildi.");
    } else {
      alert("Promo kod xato!");
    }
  };

  const toggleFavorite = (id) => {
    let newFavs = [...favorites];
    if (newFavs.includes(id)) {
      newFavs = newFavs.filter(favId => favId !== id);
    } else {
      newFavs.push(id);
    }
    setFavorites(newFavs);
    localStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  const openDetails = (anime) => {
    if (anime.isPremium && !user?.isPremium) {
      alert("Bu premium anime! Ko'rish uchun Premium sotib oling.");
      setView('premium');
      return;
    }
    setSelectedAnime(anime);
    setView('details');
  };

  const filteredMovies = animeData.filter(anime => {
    const matchQuery = anime.title.toLowerCase().includes(searchQuery.toLowerCase()) || anime.id === searchQuery;
    const matchGenre = filterGenre === 'Barchasi' || anime.genres.includes(filterGenre);
    const matchYear = filterYear === 'Barchasi' || anime.year.toString() === filterYear;
    return matchQuery && matchGenre && matchYear;
  });

  const renderHome = () => (
    <div className="view-content fadeIn">
      <div className="section-title">Eng so'nggi animelar</div>
      <div className="anime-grid">
        {animeData.map(anime => (
          <div key={anime.id} className="anime-card" onClick={() => openDetails(anime)}>
            <div className="thumbnail-wrapper">
              <div className={`badge-mini ${anime.isPremium ? 'premium' : 'free'}`}>
                {anime.isPremium ? 'PREMIUM' : 'BEPUL'}
              </div>
              <img 
                src={anime.thumbnail} 
                alt={anime.title} 
                onError={(e) => { e.target.src = 'https://via.placeholder.com/300x170/121212/e31e24?text=Anor+Motion'; }}
              />
            </div>
            <div className="card-content">
              <div className="card-main-info">
                <h3>{anime.title}</h3>
                <p>ID: {anime.id} • {anime.year}</p>
              </div>
              <div className="card-heart" onClick={(e) => { e.stopPropagation(); toggleFavorite(anime.id); }}>
                {favorites.includes(anime.id) ? icons.heartFilled : icons.heart}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSearch = () => (
    <div className="view-content fadeIn">
      <div className="search-header">
        <input 
          type="text" 
          placeholder="Qidiruv..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="filters">
        <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)}>
          {genres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="anime-grid">
        {filteredMovies.map(anime => (
          <div key={anime.id} className="anime-card" onClick={() => openDetails(anime)}>
            <div className="thumbnail-wrapper">
              <div className={`badge-mini ${anime.isPremium ? 'premium' : 'free'}`}>
                {anime.isPremium ? 'PREMIUM' : 'BEPUL'}
              </div>
              <img 
                src={anime.thumbnail} 
                alt={anime.title} 
                onError={(e) => { e.target.src = 'https://via.placeholder.com/300x170/121212/e31e24?text=Anor+Motion'; }}
              />
            </div>
            <div className="card-content">
              <h3>{anime.title}</h3>
              <p>{anime.year} • {anime.genres.join(', ')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTrailers = () => (
    <div className="view-content fadeIn">
      <div className="section-title">Trailerlar</div>
      <div className="trailer-list">
        {trailerData.map(t => (
          <div key={t.id} className="trailer-card">
            <video src={t.videoUrl} controls poster={t.thumbnail} />
            <h3>{t.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPremium = () => (
    <div className="view-content fadeIn premium-view">
      <div className="premium-banner">
        <h2>ANOR | PREMIUM</h2>
        <p>Barcha animelarni reklamasiz va cheklovsiz ko'ring!</p>
      </div>
      <div className="promo-section">
        <input 
          type="text" 
          placeholder="Promo kod..." 
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
        />
        <button className="primary-btn" onClick={handlePromo}>Faollashtirish</button>
      </div>
      <div className="anime-grid">
        {animeData.filter(a => a.isPremium).map(anime => (
          <div key={anime.id} className="anime-card" onClick={() => openDetails(anime)}>
            <div className="thumbnail-wrapper">
              <div className="badge-mini premium">PREMIUM</div>
              <img 
                src={anime.thumbnail} 
                alt={anime.title} 
                onError={(e) => { e.target.src = 'https://via.placeholder.com/300x170/121212/e31e24?text=Anor+Motion'; }}
              />
            </div>
            <div className="card-content">
              <h3>{anime.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="view-content fadeIn profile-view">
      {!user ? (
        <div className="login-screen profile-bg">
          <div className="logo-center">
            <img 
              src="/logo.png" 
              alt="Anor Motion Logo" 
              className="logo-img" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <h1><span>ANOR</span> | MOTION</h1>
          </div>
          <div className="id-login">
            <p>ID orqali kirish:</p>
            <div className="id-input-wrapper">
              <span className="prefix">A|</span>
              <input 
                type="text" 
                placeholder="Kod" 
                value={loginId.replace('A|', '').replace('|M', '')}
                onChange={(e) => setLoginId(`A|${e.target.value}|M`)}
              />
              <span className="suffix">|M</span>
            </div>
            <button className="secondary-btn" onClick={handleIdLogin}>Kirish</button>
          </div>
          <div className="divider">yoki</div>
          <button className="google-btn" onClick={generateId}>Google orqali kirish (Simulyatsiya)</button>
        </div>
      ) : (
        <div className="user-profile">
          <div className="user-icon">👤</div>
          <h2>Foydalanuvchi Profili</h2>
          <div className="user-id">ID: <span>{user.id}</span></div>
          <div className="premium-status">
            Status: <span className={user.isPremium ? 'text-premium' : ''}>
              {user.isPremium ? 'PREMIUM ✨' : 'BEPUL'}
            </span>
          </div>
          <button className="logout-btn" onClick={() => { setUser(null); localStorage.removeItem('user'); }}>Chiqish</button>
        </div>
      )}
    </div>
  );

  const renderDetails = () => (
    <div className="details-view fadeIn">
      <button className="back-btn" onClick={() => setView('home')}>← Orqaga</button>
      <div className="video-player">
        <video key={videoLang} controls autoPlay src={videoLang === 'original' ? selectedAnime.originalVideoUrl : selectedAnime.uzbVideoUrl || selectedAnime.originalVideoUrl} />
      </div>
      <div className="details-info">
        <h1>{selectedAnime.title}</h1>
        <div className="meta">{selectedAnime.year} • {selectedAnime.genres.join(', ')}</div>
        <div className="lang-btns">
          <button className={videoLang === 'original' ? 'active' : ''} onClick={() => setVideoLang('original')}>Original</button>
          <button className={videoLang === 'uzb' ? 'active' : ''} onClick={() => setVideoLang('uzb')}>O'zbekcha</button>
        </div>
        <p>{selectedAnime.description}</p>
      </div>
    </div>
  );

  const icons = {
    search: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    trailers: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>,
    home: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
    premium: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 12L2 9z"></path><path d="M11 3v9"></path><path d="M15 3v4"></path><path d="M9 3v4"></path></svg>,
    profile: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
    bell: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>,
    heart: <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
    heartFilled: <svg viewBox="0 0 24 24" width="20" height="20" fill="#e31e24" stroke="#e31e24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
    userLg: <svg viewBox="0 0 24 24" width="60" height="60" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  };

  return (
    <div className="App">
      <header>
        <div className="logo-container">
          <img 
            src="/logo.png" 
            alt="Anor Motion" 
            className="logo-img" 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <div className="brand-name"><span>ANOR</span> | MOTION</div>
        <div className="header-icon">{icons.bell}</div>
      </header>

      <main>
        {view === 'home' && renderHome()}
        {view === 'search' && renderSearch()}
        {view === 'trailers' && renderTrailers()}
        {view === 'premium' && renderPremium()}
        {view === 'profile' && renderProfile()}
        {view === 'details' && renderDetails()}
      </main>

      <nav className="bottom-nav">
        <button className={view === 'search' ? 'active' : ''} onClick={() => setView('search')}>
          <i className="nav-icon">{icons.search}</i>
          <span>Qidiruv</span>
        </button>
        <button className={view === 'trailers' ? 'active' : ''} onClick={() => setView('trailers')}>
          <i className="nav-icon">{icons.trailers}</i>
          <span>Trailer</span>
        </button>
        <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>
          <i className="nav-icon">{icons.home}</i>
          <span>Asosiy</span>
        </button>
        <button className={view === 'premium' ? 'active' : ''} onClick={() => setView('premium')}>
          <i className="nav-icon">{icons.premium}</i>
          <span>Premium</span>
        </button>
        <button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')}>
          <i className="nav-icon">{icons.profile}</i>
          <span>Profil</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
