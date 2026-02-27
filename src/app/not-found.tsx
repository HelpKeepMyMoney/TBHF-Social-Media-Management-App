import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-warm flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-6 shadow-lg">
          <Heart className="w-7 h-7 text-white fill-white" />
        </div>
        <h1 className="text-4xl font-bold text-stone-900 mb-2">404</h1>
        <p className="text-stone-500 mb-6">This page could not be found.</p>
        <Link
          href="/"
          className="btn-primary inline-flex items-center justify-center px-5 py-2.5 text-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
