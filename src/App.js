import React, { useState, useEffect } from 'react';
import './App.css';
import { animeData } from './data';

const tg = window.Telegram.WebApp;

function App() {
  const [view, setView] = useState('home'); // home, details, favorites
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [videoLang, setVideoLang] = useState('original');

  useEffect(() => {
    tg.expand();
    const savedFavs = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavorites(savedFavs);
  }, []);

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

  const filteredAnime = animeData.filter(anime => 
    anime.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    anime.id === searchQuery
  );

  const favoriteAnime = animeData.filter(anime => favorites.includes(anime.id));

  const openDetails = (anime) => {
    setSelectedAnime(anime);
    setView('details');
    setVideoLang('original');
    window.scrollTo(0, 0);
  };

  const renderHome = () => (
    <div className="home-view fadeIn">
      <div className="search-bar">
        <input 
          type="text" 
          placeholder="Anime nomi yoki ID orqali qidirish..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="anime-grid">
        {filteredAnime.map(anime => (
          <div key={anime.id} className="anime-card" onClick={() => openDetails(anime)}>
            <img src={anime.thumbnail} alt={anime.title} />
            <div className="card-info">
              <h3>{anime.title}</h3>
              <p>ID: {anime.id}</p>
            </div>
          </div>
        ))}
        {filteredAnime.length === 0 && <p className="no-results">Hech narsa topilmadi...</p>}
      </div>
    </div>
  );

  const renderFavorites = () => (
    <div className="favorites-view fadeIn">
      <h2>Mening Sevimlilarim</h2>
      <div className="anime-grid">
        {favoriteAnime.map(anime => (
          <div key={anime.id} className="anime-card" onClick={() => openDetails(anime)}>
            <img src={anime.thumbnail} alt={anime.title} />
            <div className="card-info">
              <h3>{anime.title}</h3>
            </div>
          </div>
        ))}
        {favoriteAnime.length === 0 && <p className="no-results">Sevimlilar hali yo'q...</p>}
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="details-view fadeIn">
      <button className="back-btn" onClick={() => setView('home')}>← Orqaga</button>
      <div className="video-container">
        <video 
          key={`${selectedAnime.id}-${videoLang}`}
          controls 
          autoPlay 
          playsInline
          width="100%"
        >
          <source 
            src={videoLang === 'original' ? selectedAnime.originalVideoUrl : (selectedAnime.uzbVideoUrl || selectedAnime.originalVideoUrl)} 
            type="video/mp4" 
          />
        </video>
      </div>
      <div className="controls">
        <div className="lang-switcher">
          <button 
            className={videoLang === 'original' ? 'active' : ''} 
            onClick={() => setVideoLang('original')}
          >
            Asl tili
          </button>
          <button 
            className={videoLang === 'uzb' ? 'active' : ''} 
            onClick={() => setVideoLang('uzb')}
          >
            O'zbekcha {selectedAnime.uzbVideoUrl ? '' : '(Yaqinda)'}
          </button>
        </div>
        <button 
          className={`fav-btn ${favorites.includes(selectedAnime.id) ? 'is-fav' : ''}`}
          onClick={() => toggleFavorite(selectedAnime.id)}
        >
          {favorites.includes(selectedAnime.id) ? "❤️ Sevimlilardan o'chirish" : "🤍 Sevimlilarga qo'shish"}
        </button>
      </div>
      <div className="anime-description">
        <h1>{selectedAnime.title}</h1>
        <p>{selectedAnime.description}</p>
      </div>
    </div>
  );

  return (
    <div className="App">
      <nav className="bottom-nav">
        <button onClick={() => setView('home')} className={view === 'home' ? 'active' : ''}>🏠 Asosiy</button>
        <button onClick={() => setView('favorites')} className={view === 'favorites' ? 'active' : ''}>⭐ Sevimlilar</button>
      </nav>
      <main>
        {view === 'home' && renderHome()}
        {view === 'favorites' && renderFavorites()}
        {view === 'details' && renderDetails()}
      </main>
    </div>
  );
}

export default App;
