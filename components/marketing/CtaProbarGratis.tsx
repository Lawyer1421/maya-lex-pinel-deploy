'use client';

import Link from 'next/link';
import { SIGNUP_HREF } from '@/lib/marketing/cta';
import { trackCampaignEvent } from '@/lib/analytics/campaign';

interface CtaProbarGratisProps {
  children: string;
  className: string;
  source: string;
}

export default function CtaProbarGratis({ children, className, source }: CtaProbarGratisProps) {
  return (
    <Link
      href={SIGNUP_HREF}
      className={className}
      onClick={() => trackCampaignEvent('cta_probar_gratis', { source })}
    >
      {children}
    </Link>
  );
}
