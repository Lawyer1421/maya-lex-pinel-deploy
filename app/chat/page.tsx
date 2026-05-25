import ChatInterface from '@/components/ChatInterface';

/**
 * /chat — Interfaz principal de chat con MAYA LEX IA
 * Server Component wrapper — ChatInterface es Client Component
 */
export default function ChatPage() {
  return <ChatInterface />;
}

export const metadata = {
  title: 'Consulta Jurídica · MAYA LEX IA PINEL HN',
  description: 'Chat jurídico inteligente para Honduras — Derecho Civil, Penal, Notarial y Laboral',
};
