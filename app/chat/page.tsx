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
    redirect('/login?next=/chat');
  }

  return <ChatInterface />;
}

export const metadata = {
  title: 'Consulta Jurídica · MAYA LEX IA PINEL HN',
  description: 'Chat jurídico inteligente para Honduras — Derecho Civil, Penal, Notarial y Laboral',
};
