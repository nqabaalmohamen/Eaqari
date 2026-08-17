import ChatDetailClient from './ChatDetailClient';

export function generateStaticParams() {
  return Array.from({ length: 50 }, (_, i) => ({ id: (i + 1).toString() }));
}

export default function ChatDetailPage({ params }: { params: { id: string } }) {
  return <ChatDetailClient id={params.id} />;
}
