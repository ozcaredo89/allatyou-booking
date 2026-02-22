import { AdminCalendarClient } from './calendar-client';

// Forzamos a Vercel a tratar la página como dinámica (SSR)
// Esto soluciona el error 404 al evitar la generación estática
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <main>
      <AdminCalendarClient />
    </main>
  );
}