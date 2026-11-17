import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addedOn, deleteDocument, listDocuments, sourceLabel, type DocumentSummary } from '../api/document.api';

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
        <Link className="button" to="/documents/new">
          New
        </Link>
      </div>
      {documents.length === 0 ? <p className="lede">No documents yet.</p> : null}
      <DocumentRows documents={documents.filter((document) => document.status !== 'deleted')} onDelete={remove} />
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
};

const DocumentRows = ({
  documents,
  onDelete,
}: {
  documents: DocumentSummary[];
  onDelete: (id: string) => void;
}) => (
  <ul className="documents">
    {documents.map((document) => (
      <li key={document.id} className="document-row">
        <Link to={`/documents/${document.id}`}>{document.title}</Link>
        <span className="meta">{sourceLabel(document.origin)}</span>
        <time className="meta" dateTime={document.createdAt}>
          {addedOn(document.createdAt)}
        </time>
        <button type="button" className="danger" onClick={() => onDelete(document.id)}>
          Delete
        </button>
      </li>
    ))}
  </ul>
);
