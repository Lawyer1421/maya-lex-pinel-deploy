import { NextRequest } from 'next/server';
import { updateSessionMiddleware } from '@/lib/supabase-ssr';

export async function middleware(request: NextRequest) {
  return await updateSessionMiddleware(request);
}

export const config = {
  matcher: [
    // Refresca sesión en todas las rutas excepto assets estáticos
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
