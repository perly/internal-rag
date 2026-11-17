import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addedOn, getDocument, refreshDocument, shownDate, type DocumentView as DocumentRecord } from '../api/document.api';
import { BackIcon, DriveIcon, EditIcon, RefreshIcon } from './icons';

export const DocumentView = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getDocument(id)
      .then(setDocument)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'The request failed.');
      });
  }, [id]);

  const refresh = async () => {
    if (!document || pending) return;
    setPending(true);
    setError('');
    try {
      setDocument(await refreshDocument(document.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request failed.');
    } finally {
      setPending(false);
    }
  };

  if (error && !document) return <p className="error">{error}</p>;
  if (!document) return <p className="lede">Loading document.</p>;
  const when = shownDate(document);

  return (
    <article>
      <button type="button" className="icon-button back-button" aria-label="Back" onClick={() => navigate('/documents')} disabled={pending}>
        <BackIcon />
      </button>
      <p className="meta source-line">
        {document.origin === 'gdrive' ? (
          document.sourceUrl ? (
            <a className="drive-link" href={document.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open in Google Drive">
              <DriveIcon label={false} />
            </a>
          ) : (
            <DriveIcon />
          )
        ) : null}
        <span>{addedOn(when)}</span>
      </p>
      <div className="row">
        <h1>{document.title}</h1>
        <span className="row">
          {document.origin === 'gdrive' ? (
            <button type="button" className="icon-button" aria-label="Refresh" onClick={refresh} disabled={pending}>
              <RefreshIcon />
            </button>
          ) : (
            <Link className="icon-button" aria-label="Edit" to={`/documents/${document.id}/edit`}>
              <EditIcon />
            </Link>
          )}
        </span>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <p className="document-body">{document.body}</p>
    </article>
  );
};
