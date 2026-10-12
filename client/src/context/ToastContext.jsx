import { createContext, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const ToastContext = createContext(null);

function Content({ t, title, message, link }) {
  return (
    <div className="min-w-0 text-sm">
      {title && <p className="font-bold text-forest">{title}</p>}
      {message && <p className="break-words">{message}</p>}
      {link && (
        <Link to={link} onClick={() => toast.dismiss(t.id)} className="mt-1 inline-block font-bold text-clay-dark underline">
          Open
        </Link>
      )}
    </div>
  );
}

const render = (fn, message, { title, link, duration } = {}) =>
  fn((t) => <Content t={t} title={title} message={message} link={link} />, { duration: duration || 4500 });

export function ToastProvider({ children }) {
  const value = useMemo(
    () => ({
      success: (m, o) => render(toast.success, m, o),
      error: (m, o) => render(toast.error, m, o),
      info: (m, o) => render((c, opts) => toast(c, { ...opts, icon: '🔔' }), m, o),
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { borderRadius: '16px', background: '#fff', color: '#2b2b2b', boxShadow: '0 10px 30px rgba(0,0,0,.12)', maxWidth: 380 },
          success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
