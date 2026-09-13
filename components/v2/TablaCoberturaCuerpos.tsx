import {
  AVISO_FAIL_CLOSED,
  CUERPOS_COBERTURA,
  type EstadoCuerpo,
} from '@/lib/marketing/cobertura-corpus';

function claseEstado(estado: EstadoCuerpo): string {
  if (estado === 'presente_vigente') return 'border-verify/35 bg-verify/10 text-verify-light';
  if (estado === 'staging_sin_promote') return 'border-gold/30 bg-gold/10 text-gold-light';
  return 'border-white/15 bg-white/5 text-ivory-muted';
}

export default function TablaCoberturaCuerpos() {
  return (
    <section aria-labelledby="tabla-cuerpos-titulo" className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h2 id="tabla-cuerpos-titulo" className="font-serif text-2xl font-bold text-ivory sm:text-3xl">
        Estado por cuerpo normativo
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ivory-dim">
        {AVISO_FAIL_CLOSED}
      </p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/[0.08]">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <caption className="sr-only">
            Cobertura del corpus hondureño por cuerpo, sin conteos inventados
          </caption>
          <thead className="bg-obsidian-light text-[11px] uppercase tracking-[0.14em] text-ivory-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Cuerpo</th>
              <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
              <th scope="col" className="px-4 py-3 font-semibold">Nota</th>
            </tr>
          </thead>
          <tbody>
            {CUERPOS_COBERTURA.map((fila) => (
              <tr key={fila.cuerpo} className="border-t border-white/[0.06] bg-obsidian/40">
                <th scope="row" className="px-4 py-3 font-medium text-ivory">{fila.cuerpo}</th>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${claseEstado(fila.estado)}`}>
                    {fila.etiqueta}
                  </span>
                </td>
                <td className="px-4 py-3 text-ivory-dim">{fila.nota}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
