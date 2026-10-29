'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ProjectPageProps {
  params: { id: string };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id;

  useEffect(() => {
    const filename = searchParams.get('filename') || '';
    const language = searchParams.get('language') || '';
    const query = new URLSearchParams();
    if (filename) query.set('filename', filename);
    if (language) query.set('language', language);

    router.replace(`/editor/${projectId}${query.toString() ? `?${query.toString()}` : ''}`);
  }, [projectId, router, searchParams]);

  return (
    <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center text-brand-muted text-sm font-mono">
      Opening Caption Editor...
    </div>
  );
}
