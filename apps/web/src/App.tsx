import { useState } from 'react';
import { Chat } from './pages/Chat';
import { Documents } from './pages/Documents';

type Screen = 'chat' | 'documents';

export const App = () => {
  const [screen, setScreen] = useState<Screen>('chat');

  return (
    <>
      <header>
        <p className="eyebrow">Internal RAG</p>
        <nav>
          <button type="button" aria-current={screen === 'chat' ? 'page' : undefined} onClick={() => setScreen('chat')}>
            Chat
          </button>
          <button
            type="button"
            aria-current={screen === 'documents' ? 'page' : undefined}
            onClick={() => setScreen('documents')}
          >
            Documents
          </button>
        </nav>
      </header>
      <main>{screen === 'chat' ? <Chat /> : <Documents />}</main>
    </>
  );
};
