import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addedOn, getDocument, sourceLabel, type DocumentView as DocumentRecord } from '../api/document.api';

export const DocumentView = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDocument(id)
      .then(setDocument)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'The request failed.');
      });
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!document) return <p className="lede">Loading document.</p>;

  return (
    <article>
      <p className="meta">
        {sourceLabel(document.origin)} · {addedOn(document.createdAt)}
      </p>
      <div className="row">
        <h1>{document.title}</h1>
        <span className="row">
          {document.origin === 'gdrive' ? null : (
            <Link className="button" to={`/documents/${document.id}/edit`}>
              Edit
            </Link>
          )}
          <button type="button" className="secondary" onClick={() => navigate('/documents')}>
            Cancel
          </button>
        </span>
      </div>
      {document.sourceUrl ? (
        <p>
          <a href={document.sourceUrl} target="_blank" rel="noreferrer">
            {document.sourceUrl}
          </a>
        </p>
      ) : null}
      <p className="document-body">{document.body}</p>
    </article>
  );
};
