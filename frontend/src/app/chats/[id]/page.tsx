import ChatDetailClient from './ChatDetailClient';

export function generateStaticParams() {
  return Array.from({ length: 50 }, (_, i) => ({ id: (i + 1).toString() }));
}

export default async function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatDetailClient id={id} />;
}
