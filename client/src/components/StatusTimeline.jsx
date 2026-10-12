import { CheckIcon, XIcon } from './Icons';
import { formatDate, formatTime, label } from '../utils/format';
import { APPLICATION_STEPS } from '../utils/options';

export default function StatusTimeline({ application }) {
  const { status, statusHistory = [] } = application;
  const ended = status === 'rejected' || status === 'withdrawn';
  const reached = new Set(statusHistory.map((t) => t.status));
  const steps = ended ? [...APPLICATION_STEPS.filter((s) => reached.has(s)), status] : APPLICATION_STEPS;
  const currentIndex = steps.indexOf(status);

  return (
    <div>
      <ol className="flex items-start">
        {steps.map((step, i) => {
          const done = i <= currentIndex;
          const bad = ended && step === status;
          return (
            <li key={step} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && <span className={`absolute right-1/2 top-4 h-1 w-full -translate-y-1/2 ${i <= currentIndex ? (bad ? 'bg-red-300' : 'bg-clay') : 'bg-sand'}`} />}
              <span
                className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold ${
                  bad ? 'border-red-500 bg-red-500 text-white' : done ? 'border-clay bg-clay text-white' : 'border-sand bg-white text-muted'
                } ${i === currentIndex && !bad ? 'ring-4 ring-clay/25' : ''}`}
              >
                {bad ? <XIcon size={14} strokeWidth={3} /> : done ? <CheckIcon size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`mt-2 text-[11px] font-bold sm:text-xs ${done ? 'text-forest' : 'text-muted'}`}>{label(step)}</span>
            </li>
          );
        })}
      </ol>

      <ul className="mt-6 space-y-4 border-l-2 border-sand pl-5">
        {[...statusHistory].reverse().map((t, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-clay" />
            <p className="text-sm font-bold text-forest">
              {label(t.status)} <span className="font-normal text-muted">· {formatDate(t.changedAt)} {formatTime(t.changedAt)}</span>
            </p>
            {t.note && <p className="text-sm text-ink/80">“{t.note}”</p>}
            {t.changedBy?.name && <p className="text-xs text-muted">by {t.changedBy.name}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
