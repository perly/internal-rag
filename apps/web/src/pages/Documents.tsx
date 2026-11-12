import { useEffect, useState, type FormEvent } from 'react';
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument,
  type DocumentSummary,
  type DocumentView,
  type SaveResult,
} from '../api/document.api';
import { Connections } from './Connections';

const emptyDraft = { title: '', body: '', sourceUrl: '' };

export const Documents = () => {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const refresh = async () => {
    setDocuments(await listDocuments());
  };

  useEffect(() => {
    refresh().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'The request failed.');
    });
  }, []);

  const openDocument = async (id: string) => {
    setError('');
    setNotice('');
    setFile(null);
    const document = await getDocument(id);
    setSelectedId(document.id);
    setDraft({ title: document.title, body: document.body, sourceUrl: document.sourceUrl ?? '' });
  };

  const startNew = () => {
    setSelectedId(null);
    setDraft(emptyDraft);
    setFile(null);
    setFileKey((key) => key + 1);
    setNotice('');
    setError('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    setNotice('');
    try {
      const saved = selectedId
        ? await updateDocument(selectedId, { title: draft.title, body: draft.body })
        : await createDocument({ ...draft, file });
      setSelectedId(saved.document.id);
      setDraft({
        title: saved.document.title,
        body: saved.document.body,
        sourceUrl: saved.document.sourceUrl ?? '',
      });
      setFile(null);
      setFileKey((key) => key + 1);
      setNotice(savedNotice(saved));
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request failed.');
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    if (!selectedId || pending) return;
    setPending(true);
    setError('');
    try {
      await deleteDocument(selectedId);
      startNew();
      setNotice('Document deleted.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
    <Connections onSynced={() => { refresh().catch(() => undefined); }} />
    <section className="manage">
      <div>
        <div className="row">
          <h1>Documents</h1>
          <button type="button" onClick={startNew}>
            New
          </button>
        </div>
        {documents.length === 0 ? <p className="lede">No documents yet.</p> : null}
        <ul className="documents">
          {documents.map((document) => (
            <li key={document.id}>
              <button
                type="button"
                className={document.id === selectedId ? 'selected' : undefined}
                onClick={() => {
                  openDocument(document.id).catch((caught: unknown) => {
                    setError(caught instanceof Error ? caught.message : 'The request failed.');
                  });
                }}
              >
                <span>{document.title}</span>
                <DocumentStatus document={document} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <form onSubmit={save}>
        <h2>{selectedId ? 'Edit document' : 'New document'}</h2>
        <label>
          Title
          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            required
            maxLength={200}
          />
        </label>
        <label>
          Text
          <textarea
            value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
            rows={12}
          />
        </label>
        {selectedId ? null : (
          <>
            <label>
              Or upload a .md, .txt, or .pdf
              <input
                key={fileKey}
                type="file"
                accept=".md,.txt,.pdf,text/plain,text/markdown,application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label>
              Source URL
              <input
                value={draft.sourceUrl}
                onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })}
                maxLength={2000}
              />
            </label>
          </>
        )}
        <div className="row">
          <button type="submit" disabled={pending || !draft.title.trim()}>
            {pending ? 'Saving' : 'Save'}
          </button>
          {selectedId ? (
            <button type="button" className="danger" onClick={remove} disabled={pending}>
              Delete
            </button>
          ) : null}
        </div>
        {notice ? <p className="meta">{notice}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </form>
    </section>
    </>
  );
};

const DocumentStatus = ({ document }: { document: DocumentSummary | DocumentView }) => (
  <span className={document.status}>{document.status}</span>
);

const savedNotice = (saved: SaveResult): string => {
  if (saved.document.status === 'error') return 'Saved with no text to index.';
  return `Saved. ${saved.embedded} embedded, ${saved.reused} reused.`;
};
