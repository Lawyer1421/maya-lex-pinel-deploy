'use client';

/**
 * Interruptor «Consulta jurídica general» (Luna, P26). APAGADO por defecto; el consentimiento es una casilla aparte, también apagada, atada a
 * la versión del aviso. El texto del aviso es BORRADOR hasta que el propietario o su delegado jurídico lo autorice: mientras `AVISO_LUNA_AUTORIZADO_POR_PROPIETARIO` sea false este
 * componente no pinta nada (ver lib/luna/consent.ts y docs/luna/AVISO_LUNA_BORRADOR.md).
 */
import { AVISO_LUNA_AUTORIZADO_POR_PROPIETARIO, AVISO_LUNA_TEXTO, AVISO_LUNA_VERSION, type EstadoInterruptorLuna } from '@/lib/luna/consent';

interface Props {
  estado: EstadoInterruptorLuna;
  onChange: (estado: EstadoInterruptorLuna) => void;
  disabled?: boolean;
}

export default function LunaGeneralToggle({ estado, onChange, disabled }: Props) {
  if (!AVISO_LUNA_AUTORIZADO_POR_PROPIETARIO) return null;
  return (
    <div className="mb-2 text-xs text-gray-300" data-aviso-version={AVISO_LUNA_VERSION}>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={estado.activo}
          disabled={disabled}
          // Apagar el interruptor borra la aceptación: volver a encenderlo exige aceptar de nuevo.
          onChange={(e) => onChange({ activo: e.target.checked, aceptado: e.target.checked ? estado.aceptado : false })}
        />
        Consulta jurídica general
      </label>
      {estado.activo && (
        <div className="mt-1 rounded border border-white/10 p-2">
          <p>{AVISO_LUNA_TEXTO}</p>
          <label className="mt-1 flex items-center gap-2">
            <input type="checkbox" checked={estado.aceptado} disabled={disabled} onChange={(e) => onChange({ activo: true, aceptado: e.target.checked })} />
            He leído y acepto el aviso de privacidad
          </label>
        </div>
      )}
    </div>
  );
}
