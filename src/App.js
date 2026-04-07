import React, { useEffect } from 'react';
import './App.css';

const tg = window.Telegram.WebApp;

function App() {
  useEffect(() => {
    // Telegraf ilovasini kengaytirish
    tg.expand();
    
    // Asosiy tugmani sozlash
    tg.MainButton.text = "Botga qaytish";
    tg.MainButton.show();
    tg.MainButton.onClick(() => {
      tg.close();
    });

    return () => {
      tg.MainButton.offClick();
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Anor Motion Video</h1>
        <div className="video-container">
          <video 
            controls 
            autoPlay 
            muted 
            loop 
            playsInline
            width="100%"
            height="auto"
          >
            <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
            Sizning brauzeringiz video qo'llab-quvvatlamaydi.
          </video>
        </div>
        <div className="description">
          <p>Ushbu video Telegram Mini App ichida ko'rsatilmoqda.</p>
        </div>
      </header>
    </div>
  );
}

export default App;
