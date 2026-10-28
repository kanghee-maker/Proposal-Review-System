import { redirect } from 'next/navigation';
import { currentPrincipal, configurationReady } from '@/lib/session';
import PortalShell from './PortalShell';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!configurationReady()) redirect('/');
  const principal = await currentPrincipal();
  if (!principal) redirect('/');
  return <PortalShell>{children}</PortalShell>;
}
