import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { HomeIcon } from '@heroicons/react/24/outline';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 font-extrabold text-3xl mb-6 shadow-sm">
        404
      </div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        Sorry, the page or resource you are looking for doesn't exist or has been moved.
      </p>
      <div className="mt-6">
        <Button
          onClick={() => navigate('/dashboard')}
          leftIcon={<HomeIcon className="h-4 w-4" />}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
