import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import ChatInterface from '@/components/ChatInterface';

/**
 * /chat — Interfaz principal de chat con MAYA LEX IA
 *
 * Requiere sesión (gratuita o de pago) para que toda consulta quede
 * ligada al correo verificado del usuario — no a su IP. Sin esto, un
 * mismo cliente cambia de identidad entre dispositivos y el Plan Pro
 * pagado no lo reconoce en su celular si pagó desde la computadora.
 */
export default async function ChatPage() {
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect('/login?next=/chat&intent=signup');
  }

  return <ChatInterface />;
}

export const metadata = {
  title: 'Consulta jurídica',
  description: 'Chat de investigación jurídica hondureña — apoyo profesional, no asesoría legal',
  robots: { index: false, follow: false },
};
