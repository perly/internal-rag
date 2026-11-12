import { useEffect, useState, type FormEvent } from 'react';
import {
  chooseFolder,
  listConnections,
  listFolders,
  openGoogleDrive,
  syncConnection,
  type ConnectionSummary,
  type DriveFolder,
} from '../api/connection.api';

export const Connections = ({ onSynced }: { onSynced: () => void }) => {
  const [connections, setConnections] = useState<ConnectionSummary[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [folderId, setFolderId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const drive = new URLSearchParams(window.location.search).get('drive');

  const refresh = async () => {
    setConnections(await listConnections());
  };

  useEffect(() => {
    refresh().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'The request failed.');
    });
    if (drive === 'error') setError('Google Drive was not connected.');
  }, [drive]);

  useEffect(() => {
    if (!drive || drive === 'error') return;
    listFolders(drive)
      .then(setFolders)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'The request failed.');
      });
  }, [drive]);

  const connect = async () => {
    setPending(true);
    setError('');
    try {
      await openGoogleDrive('Google Drive');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request failed.');
      setPending(false);
    }
  };

  const saveFolder = async (event: FormEvent) => {
    event.preventDefault();
    if (!drive || drive === 'error' || !folderId.trim()) return;
    setPending(true);
    setError('');
    try {
      await chooseFolder(drive, folderId.trim());
      setNotice('Folder saved.');
      window.history.replaceState({}, '', window.location.pathname);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request failed.');
    } finally {
      setPending(false);
    }
  };

  const sync = async (id: string) => {
    setPending(true);
    setError('');
    try {
      const result = await syncConnection(id);
      setNotice(result.skipped ? 'Sync already running.' : 'Sync finished.');
      await refresh();
      onSynced();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="connections">
      <div className="row">
        <h2>Google Drive</h2>
        <button type="button" onClick={connect} disabled={pending}>
          Connect
        </button>
      </div>
      {drive && drive !== 'error' ? (
        <form onSubmit={saveFolder}>
          <label>
            Folder
            <select value={folderId} onChange={(event) => setFolderId(event.target.value)}>
              <option value="">Choose a folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={pending || !folderId}>
            Save folder
          </button>
        </form>
      ) : null}
      {connections.length === 0 ? <p className="lede">No Drive connection yet.</p> : null}
      <ul className="documents">
        {connections.map((connection) => (
          <li key={connection.id} className="row">
            <span>
              {connection.displayName}
              <span className={connection.status}> {connection.status}</span>
              {connection.lastSyncAt ? ` · ${new Date(connection.lastSyncAt).toLocaleString()}` : ''}
            </span>
            <button type="button" onClick={() => sync(connection.id)} disabled={pending || !connection.folderId}>
              Sync now
            </button>
          </li>
        ))}
      </ul>
      {notice ? <p className="meta">{notice}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
};
