import { describe, it, expect } from 'vitest';
import { contieneArtefactoAnonimizacion } from '@/lib/rag/search';

describe('contieneArtefactoAnonimizacion — filtro de contención para el RAG del chat', () => {
  it('detecta [Cliente_Anonimo]', () => {
    expect(contieneArtefactoAnonimizacion('El demandante [Cliente_Anonimo] presentó...')).toBe(true);
  });

  it('detecta [Telefono_Oculto]', () => {
    expect(contieneArtefactoAnonimizacion('Contacto: [Telefono_Oculto]')).toBe(true);
  });

  it('detecta [Expediente_Anonimizado]', () => {
    expect(contieneArtefactoAnonimizacion('Ref. [Expediente_Anonimizado]')).toBe(true);
  });

  it('detecta variantes con tilde', () => {
    expect(contieneArtefactoAnonimizacion('[Teléfono_Oculto]')).toBe(true);
  });

  it('texto legal normal no genera falso positivo', () => {
    expect(contieneArtefactoAnonimizacion('El que ejecutare una acción u omisión dolosa...')).toBe(false);
  });
});
