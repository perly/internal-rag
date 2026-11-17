import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { importDriveFiles, listConnections, listDriveFiles, openGoogleDrive, type DriveFileChoice } from '../api/connection.api';
import { DriveIcon } from './icons';

export const GooglePicker = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const drive = searchParams.get('drive');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFileChoice[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [filesLoaded, setFilesLoaded] = useState(false);

  useEffect(() => {
    if (drive === 'error') {
      setError('Google Drive was not connected.');
      setReady(true);
      return;
    }
    if (drive) {
      setConnectionId(drive);
      setReady(true);
      return;
    }
    listConnections()
      .then((connections) => {
        setConnectionId(connections[0]?.id ?? null);
        setReady(true);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'The request failed.');
        setReady(true);
      });
  }, [drive]);

  useEffect(() => {
    if (!connectionId) return;
    let active = true;
    setFilesLoaded(false);
    listDriveFiles(connectionId)
      .then((next) => {
        if (active) setFiles(next);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'The request failed.');
      })
      .finally(() => {
        if (active) setFilesLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [connectionId]);

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

  const toggle = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const importSelected = async () => {
    if (!connectionId || selected.length === 0 || pending) return;
    setPending(true);
    setError('');
    try {
      await importDriveFiles(connectionId, selected);
      navigate('/documents');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request failed.');
      setPending(false);
    }
  };

  if (!ready) return <LoadingFiles label="Loading Google Drive." />;

  const filesLoading = Boolean(connectionId) && !filesLoaded;

  return (
    <section>
      <div className="row">
        <h1 className="title-with-icon">
          <DriveIcon />
          Google Drive
        </h1>
        <button type="button" onClick={connect} disabled={pending}>
          {connectionId ? 'Connect again' : 'Connect'}
        </button>
      </div>
      {connectionId ? (
        <p className="lede">Choose documents that are not in the library yet.</p>
      ) : (
        <p className="lede">Connect Google Drive, then choose the documents to add.</p>
      )}
      <div className="row picker-actions">
        <button type="button" onClick={importSelected} disabled={pending || selected.length === 0}>
          {pending ? 'Adding' : 'Add selected'}
        </button>
        <button type="button" className="secondary" onClick={() => navigate('/documents/new')} disabled={pending}>
          Cancel
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {filesLoading ? <LoadingFiles label="Loading Google Drive documents." /> : null}
      {!filesLoading && files.length === 0 && connectionId ? (
        <p className="lede">Every readable Google document is already added.</p>
      ) : null}
      <ul className="documents">
        {files.map((file) => (
          <li key={file.id} className="document-row picker-row">
            <label>
              <input type="checkbox" checked={selected.includes(file.id)} onChange={() => toggle(file.id)} />
              {file.name}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
};

const LoadingFiles = ({ label }: { label: string }) => (
  <p className="lede spinner-line" role="status">
    <span className="spinner" aria-hidden="true" />
    {label}
  </p>
);
