import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createDocument, getDocument, updateDocument } from '../api/document.api';

type Mode = 'text' | 'upload' | 'edit';

export const DocumentForm = ({ mode }: { mode: Mode }) => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(mode !== 'edit');

  useEffect(() => {
    if (mode !== 'edit') return;
    getDocument(id)
      .then((document) => {
        if (document.origin === 'gdrive') {
          navigate(`/documents/${document.id}`, { replace: true });
          return;
        }
        setTitle(document.title);
        setBody(document.body);
        setReady(true);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'The request failed.');
      });
  }, [id, mode, navigate]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const saved =
        mode === 'edit'
          ? await updateDocument(id, { title, body })
          : await createDocument({ title, body, sourceUrl, file: mode === 'upload' ? file : null });
      navigate(`/documents/${saved.document.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request failed.');
      setPending(false);
    }
  };

  if (!ready && !error) return <p className="lede">Loading document.</p>;

  return (
    <form onSubmit={save}>
      <h1>{mode === 'edit' ? 'Edit document' : mode === 'upload' ? 'Upload a document' : 'Type a document'}</h1>
      <label>
        Title
        <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} />
      </label>
      {mode === 'upload' ? (
        <label>
          File
          <input
            type="file"
            accept=".md,.txt,.pdf,text/plain,text/markdown,application/pdf"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
      ) : (
        <label>
          Text
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={12} />
        </label>
      )}
      {mode === 'edit' ? null : (
        <label>
          Source URL
          <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} maxLength={2000} />
        </label>
      )}
      <div className="row">
        <button type="submit" disabled={pending || !title.trim()}>
          {pending ? 'Saving' : 'Save'}
        </button>
        {mode === 'edit' ? (
          <button type="button" className="secondary" onClick={() => navigate(`/documents/${id}`)} disabled={pending}>
            Cancel
          </button>
        ) : (
          <Link to="/documents/new">Cancel</Link>
        )}
      </div>
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
};
