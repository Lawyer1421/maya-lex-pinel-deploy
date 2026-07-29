import type { Metadata } from 'next';
import PaginaMarketing from '@/components/v2/PaginaMarketing';
import { PAGINAS_PRODUCTO } from '@/lib/v2/paginas-marketing';

const config = PAGINAS_PRODUCTO['fundador'];

export const metadata: Metadata = {
  title: config.metaTitle,
  description: config.metaDescription,
};

export default function Page() {
  return <PaginaMarketing config={config} />;
}
