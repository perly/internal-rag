import { useState, type FormEvent } from 'react';
import { ask, type ChatReply } from '../api/chat.api';

export const Chat = () => {
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState<ChatReply | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError('');
    try {
      setReply(await ask(trimmed));
    } catch (caught) {
      setReply(null);
      setError(caught instanceof Error ? caught.message : 'The request failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <section>
      <h1>Chat</h1>
      <p className="lede">Ask a question about the company documents.</p>
      <form onSubmit={submit}>
        <label>
          Question
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            required
          />
        </label>
        <button type="submit" disabled={pending || !question.trim()}>
          {pending ? 'Asking' : 'Ask'}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {reply ? <Answer reply={reply} /> : null}
    </section>
  );
};

const Answer = ({ reply }: { reply: ChatReply }) => (
  <article className="answer">
    <p className="meta">{reply.usedModel ? 'The model answered.' : 'The model was not called.'}</p>
    <p>{reply.answer}</p>
    {reply.citations.length > 0 ? (
      <ul className="citations">
        {reply.citations.map((citation) => (
          <li key={citation.chunkId}>
            <strong>{citation.documentTitle}</strong>
            <span>{citation.similarity.toFixed(2)}</span>
            <p>{citation.text}</p>
            {citation.sourceUrl ? <a href={citation.sourceUrl}>{citation.sourceUrl}</a> : null}
          </li>
        ))}
      </ul>
    ) : null}
  </article>
);
