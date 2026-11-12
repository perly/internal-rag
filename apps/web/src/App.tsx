import { useEffect, useState } from 'react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type Health =
  | { state: 'loading' }
  | { state: 'ok' }
  | { state: 'database-down' }
  | { state: 'api-down' };

export const App = () => {
  const [health, setHealth] = useState<Health>({ state: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiUrl}/api/health`, { signal: controller.signal })
      .then(async (response) => {
        if (response.ok) {
          setHealth({ state: 'ok' });
          return;
        }
        setHealth({ state: 'database-down' });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setHealth({ state: 'api-down' });
      });
    return () => controller.abort();
  }, []);

  return (
    <main>
      <p className="eyebrow">Internal RAG</p>
      <h1>Project is running</h1>
      <p className="lede">Phase 1.1 checks that the API and Postgres can see each other.</p>
      <ul>
        <li>
          <span>API</span>
          <Status value={health.state === 'loading' ? 'loading' : health.state === 'api-down' ? 'down' : 'ok'} />
        </li>
        <li>
          <span>Postgres</span>
          <Status
            value={
              health.state === 'loading' ? 'loading' : health.state === 'ok' ? 'ok' : 'down'
            }
          />
        </li>
      </ul>
    </main>
  );
};

const Status = ({ value }: { value: 'loading' | 'ok' | 'down' }) => {
  const label = value === 'loading' ? 'Checking' : value === 'ok' ? 'Connected' : 'Not reachable';
  return <strong className={value}>{label}</strong>;
};
