import { Link } from 'react-router-dom';
import { PageHeader } from '../components/shared';

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <PageHeader title="Page not found" />
      <p className="text-sm text-muted-foreground">The page you were looking for doesn't exist.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-forest-700 hover:underline">
        ← Back to Overview
      </Link>
    </div>
  );
}
