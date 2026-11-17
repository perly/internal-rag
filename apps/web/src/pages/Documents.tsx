import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteDocument, listDocuments, type DocumentSummary } from '../api/document.api';
import { DeleteIcon, DriveIcon, PlusIcon } from './icons';

export const Documents = () => {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [error, setError] = useState('');

  const refresh = async () => {
    setDocuments(await listDocuments());
  };

  useEffect(() => {
    refresh().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'The request failed.');
    });
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm('Delete this document?')) return;
    setError('');
    try {
      await deleteDocument(id);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request failed.');
    }
  };

  return (
    <section>
      <div className="row">
        <h1>Documents</h1>
        <Link className="icon-button" aria-label="New" to="/documents/new">
          <PlusIcon />
        </Link>
      </div>
      {documents.length === 0 ? <p className="lede">No documents yet.</p> : null}
      <DocumentRows
        documents={documents.filter((document) => document.status !== 'deleted')}
        onDelete={remove}
      />
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
};

const DocumentRows = ({ documents, onDelete }: { documents: DocumentSummary[]; onDelete: (id: string) => void }) => (
  <ul className="documents">
    {documents.map((document) => (
      <li key={document.id} className="document-row">
        <span className="doc-title">
          {document.origin === 'gdrive' && document.sourceUrl ? (
            <a className="drive-link" href={document.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open in Google Drive">
              <DriveIcon label={false} />
            </a>
          ) : null}
          <Link to={`/documents/${document.id}`}>{document.title}</Link>
        </span>
        <button type="button" className="icon-button danger" aria-label="Delete" onClick={() => onDelete(document.id)}>
          <DeleteIcon />
        </button>
      </li>
    ))}
  </ul>
);
