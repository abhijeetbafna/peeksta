import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LandingPage from './LandingPage.jsx'

function Root() {
  // screen: 'landing' | 'app' | 'demo'
  const [screen, setScreen] = useState('landing');
  const [preloadedFile, setPreloadedFile] = useState(null);

  if (screen === 'landing') {
    return (
      <LandingPage
        onEnter={(file) => {
          setPreloadedFile(file || null);
          setScreen('app');
        }}
        onDemo={() => setScreen('demo')}
      />
    );
  }

  return (
    <App
      initialDemo={screen === 'demo'}
      preloadedFile={screen === 'app' ? preloadedFile : null}
      onBackToLanding={() => { setPreloadedFile(null); setScreen('landing'); }}
    />
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)


