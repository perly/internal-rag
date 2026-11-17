import { NavLink, Route, Routes } from 'react-router-dom';
import { Chat } from './pages/Chat';
import { Connections } from './pages/Connections';
import { DocumentForm } from './pages/DocumentForm';
import { DocumentView } from './pages/DocumentView';
import { Documents } from './pages/Documents';
import { Home } from './pages/Home';
import { NewDocument } from './pages/NewDocument';

const page = ({ isActive }: { isActive: boolean }): string => (isActive ? 'page' : '');

export const App = () => (
  <>
    <header>
      <NavLink className="eyebrow" to="/">
        Internal RAG
      </NavLink>
      <nav>
        <NavLink to="/" end className={page}>
          Home
        </NavLink>
        <NavLink to="/chat" className={page}>
          Chat
        </NavLink>
        <NavLink to="/documents" className={page}>
          Documents
        </NavLink>
      </nav>
    </header>
    <main>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/documents/new" element={<NewDocument />} />
        <Route path="/documents/new/text" element={<DocumentForm mode="text" />} />
        <Route path="/documents/new/upload" element={<DocumentForm mode="upload" />} />
        <Route path="/documents/new/connect" element={<Connections />} />
        <Route path="/documents/:id" element={<DocumentView />} />
        <Route path="/documents/:id/edit" element={<DocumentForm mode="edit" />} />
      </Routes>
    </main>
  </>
);
