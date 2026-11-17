import { Link } from 'react-router-dom';

export const Home = () => (
  <section>
    <h1>Ask from your documents</h1>
    <p className="lede">Chat uses the documents you add. Start with a question, or add the text those answers come from.</p>
    <div className="choices">
      <Link to="/chat">
        <strong>Chat</strong>
        <span>Ask a question</span>
      </Link>
      <Link to="/documents">
        <strong>Documents</strong>
        <span>Add and review text</span>
      </Link>
    </div>
  </section>
);
