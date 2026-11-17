import { Link } from 'react-router-dom';
import { DriveIcon } from './icons';

export const NewDocument = () => (
  <section>
    <h1>New document</h1>
    <p className="lede">Choose how this document gets into the library.</p>
    <div className="choices">
      <Link to="/documents/new/text">
        <strong>Type text</strong>
        <span>Write a document here</span>
      </Link>
      <Link to="/documents/new/upload">
        <strong>Upload</strong>
        <span>Use a .md, .txt, or .pdf file</span>
      </Link>
      <Link to="/documents/new/connect">
        <strong>Connect</strong>
        <span>
          <DriveIcon />
        </span>
      </Link>
    </div>
  </section>
);
