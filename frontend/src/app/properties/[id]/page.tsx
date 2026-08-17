import PropertyDetailsClient from '@/app/properties/[id]/PropertyDetailsClient';

export function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' },
  ];
}

export default function PropertyDetailsPage({ params }: { params: { id: string } }) {
  return <PropertyDetailsClient id={params.id} />;
}
