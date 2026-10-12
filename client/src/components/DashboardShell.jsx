import { useSearchParams } from 'react-router-dom';
import { PawIcon } from './Icons';

export function useTab(defaultTab) {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || defaultTab;
  const setTab = (next) => {
    const p = new URLSearchParams();
    if (next !== defaultTab) p.set('tab', next);
    setParams(p);
  };
  return [tab, setTab, params];
}

export default function DashboardShell({ greeting, subtitle, actions, tabs, tab, onTab, children }) {
  return (
    <div>
      <section className="relative overflow-hidden bg-forest">
        <PawIcon size={120} className="absolute -right-6 -top-6 rotate-12 text-white/5" />
        <PawIcon size={60} className="absolute bottom-2 right-40 -rotate-12 text-white/5" />
        <div className="container-page relative flex flex-col gap-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold text-white">{greeting}</h1>
            {subtitle && <p className="mt-1 text-white/75">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        <div className="container-page relative">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Dashboard sections">
            {tabs.map(([key, text, count]) => (
              <button
                key={key}
                onClick={() => onTab(key)}
                aria-current={tab === key ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-t-2xl px-4 py-2.5 text-sm font-bold transition ${tab === key ? 'bg-cream text-forest' : 'text-white/75 hover:text-white'}`}
              >
                {text}
                {count > 0 && <span className={`rounded-full px-1.5 text-[11px] ${tab === key ? 'bg-clay text-white' : 'bg-white/15 text-white'}`}>{count}</span>}
              </button>
            ))}
          </nav>
        </div>
      </section>
      <div className="container-page py-8">{children}</div>
    </div>
  );
}
