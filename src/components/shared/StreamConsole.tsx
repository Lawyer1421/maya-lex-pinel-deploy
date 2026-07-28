'use client';

import { useMemo } from 'react';
import { useAlertsSocket } from '@/src/hooks/useAlertsSocket';

interface StreamConsoleProps {
  isVisible?: boolean;
}

const STAGE_LABELS = [
  { key: 'ollama', label: 'Ollama', percent: 20 },
  { key: 'minimax', label: 'MiniMax', percent: 40 },
  { key: 'tavily', label: 'Tavily', percent: 60 },
  { key: 'claude', label: 'Claude', percent: 100 },
] as const;

export default function StreamConsole({ isVisible = true }: StreamConsoleProps) {
  const { alerts } = useAlertsSocket({ autoConnect: true });

  const progress = useMemo(() => {
    const stageMatch = alerts.find((alert) => alert.message.includes('Ollama') || alert.message.includes('MiniMax') || alert.message.includes('Tavily') || alert.message.includes('Claude'));
    if (!stageMatch) {
      return 20;
    }

    if (stageMatch.message.includes('MiniMax')) return 40;
    if (stageMatch.message.includes('Tavily')) return 60;
    if (stageMatch.message.includes('Claude')) return 100;
    return 20;
  }, [alerts]);

  const findings = useMemo(() => alerts.filter((alert) => alert.metadata?.eventType === 'FINDING_DISCOVERED'), [alerts]);
  const resolutions = useMemo(() => alerts.filter((alert) => alert.metadata?.eventType === 'RESOLUTION_RECOMMENDED'), [alerts]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-jade/20 bg-slate-950/70 p-4 text-sm text-white/80 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-jade/80">Auditor híbrido 4 etapas</p>
          <p className="font-semibold text-white">Monitoreo en tiempo real</p>
        </div>
        <div className="rounded-full border border-jade/30 px-3 py-1 text-xs text-jade">
          {progress}%
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-jade via-cyan-400 to-gold transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {STAGE_LABELS.map((stage) => {
          const active = progress >= stage.percent;
          return (
            <div key={stage.key} className={`rounded-xl border px-3 py-2 text-xs ${active ? 'border-jade/40 bg-jade/10 text-jade' : 'border-white/10 bg-white/5 text-white/40'}`}>
              <div className="font-semibold">{stage.label}</div>
              <div>{stage.percent}%</div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Hallazgos</p>
          <ul className="mt-2 space-y-2">
            {findings.length > 0 ? findings.map((alert) => <li key={alert.id} className="text-sm text-white/80">• {alert.message}</li>) : <li className="text-sm text-white/50">Esperando hallazgos...</li>}
          </ul>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Recomendaciones</p>
          <ul className="mt-2 space-y-2">
            {resolutions.length > 0 ? resolutions.map((alert) => <li key={alert.id} className="text-sm text-white/80">• {alert.message}</li>) : <li className="text-sm text-white/50">Esperando recomendación final...</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
