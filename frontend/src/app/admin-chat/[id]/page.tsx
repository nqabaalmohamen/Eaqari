import AdminChatClient from './AdminChatClient';

export function generateStaticParams() {
  return Array.from({ length: 50 }, (_, i) => ({ id: (i + 1).toString() }));
}

export default async function AdminChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminChatClient id={id} />;
}
