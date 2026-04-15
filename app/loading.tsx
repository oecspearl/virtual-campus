import LoadingIndicator from '@/app/components/ui/LoadingIndicator';

export default function GlobalLoading() {
  return (
    <LoadingIndicator variant="books" size="lg" text="Loading..." fullCenter />
  );
}
