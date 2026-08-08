import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Home } from 'lucide-react';
import { Button } from '../components/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
      <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500 shadow-xl">
        <Film className="w-8 h-8 fill-red-600/20" />
      </div>

      <div className="space-y-2 max-w-md">
        <span className="text-xs font-mono text-red-500 uppercase tracking-widest font-bold">404 Error</span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Screening Room Not Found</h1>
        <p className="text-xs text-neutral-400">
          The requested page or endpoint path does not exist in the CinemaSeat frontend routing layout.
        </p>
      </div>

      <Link to="/">
        <Button variant="primary" icon={<Home className="w-4 h-4" />}>
          Return to Movies
        </Button>
      </Link>
    </div>
  );
};
