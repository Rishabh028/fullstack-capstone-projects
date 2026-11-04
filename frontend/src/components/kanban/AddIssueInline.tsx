import React, { useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/20/solid';

export interface AddIssueInlineProps {
  onAdd: (title: string) => Promise<void> | void;
  placeholder?: string;
}

export const AddIssueInline: React.FC<AddIssueInlineProps> = ({
  onAdd,
  placeholder = 'What needs to be done? Press Enter to save',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAdd(title.trim());
      setTitle('');
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setTitle('');
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center space-x-1.5 rounded-lg py-2 text-xs font-semibold text-gray-500 hover:bg-gray-200/60 hover:text-gray-800 transition-colors"
      >
        <PlusIcon className="h-4 w-4" />
        <span>Add Issue</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-white p-2.5 shadow-sm border border-indigo-300">
      <input
        type="text"
        autoFocus
        value={title}
        disabled={isSubmitting}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="block w-full border-0 p-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
      />
      <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2">
        <span className="text-[10px] text-gray-400">Esc to cancel</span>
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => {
              setTitle('');
              setIsOpen(false);
            }}
            className="p-1 rounded text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default AddIssueInline;
