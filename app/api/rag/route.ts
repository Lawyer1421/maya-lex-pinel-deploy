/**
 * GET/POST /api/rag
 * MAYA PENAL — Endpoint de búsqueda RAG
 *
 * GET /api/rag?q=artículo+294+CPP&k=5
 * POST /api/rag { consulta, k, coleccion }
 *
 * Response:
 *   { fragmentos, articulos_encontrados, backend, contexto_formateado }
 */

import { NextRequest, NextResponse } from 'next/server';
import { buscarRAG, formatearContextoRAG } from '@/lib/rag/search';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const k = parseInt(searchParams.get('k') ?? '5', 10);
  const coleccion = searchParams.get('coleccion') ?? 'cpp_honduras';

  if (!q || q.trim().length < 5) {
    return NextResponse.json(
      { error: 'Parámetro q requerido (mínimo 5 caracteres)' },
      { status: 400 }
    );
  }

  const resultado = await buscarRAG(q, k, coleccion);
  const contexto = formatearContextoRAG(resultado);

  return NextResponse.json({
    ...resultado,
    contexto_formateado: contexto,
  });
}

export async function POST(req: NextRequest) {
  let body: { consulta?: string; k?: number; coleccion?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { consulta, k = 5, coleccion = 'cpp_honduras' } = body;

  if (!consulta || consulta.trim().length < 5) {
    return NextResponse.json(
      { error: 'consulta requerida (mínimo 5 caracteres)' },
      { status: 400 }
    );
  }

  const resultado = await buscarRAG(consulta, k, coleccion);
  const contexto = formatearContextoRAG(resultado);

  return NextResponse.json({
    ...resultado,
    contexto_formateado: contexto,
  });
}
