import React, { useState } from 'react';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { User } from '@/types';

export interface AvatarProps {
  user?: Partial<User> | null;
  name?: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showStatus?: boolean;
  status?: 'online' | 'busy' | 'offline';
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const statusSizeClasses = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-3.5 w-3.5',
};

const statusColorClasses = {
  online: 'bg-emerald-500 ring-white',
  busy: 'bg-red-500 ring-white',
  offline: 'bg-gray-400 ring-white',
};

export const Avatar: React.FC<AvatarProps> = ({
  user,
  name,
  src,
  size = 'md',
  className,
  showStatus = false,
  status = 'online',
}) => {
  const [imageError, setImageError] = useState(false);

  const fullName =
    name ||
    (user
      ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'User'
      : 'User');

  const avatarSrc = !imageError ? src || user?.avatar : null;
  const initials = getInitials(fullName);
  const colorClass = getAvatarColor(fullName);

  return (
    <div className={cn('relative inline-flex shrink-0 select-none items-center justify-center', className)}>
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={fullName}
          onError={() => setImageError(true)}
          className={cn('rounded-full object-cover ring-1 ring-black/5', sizeClasses[size])}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full font-semibold ring-1 ring-black/5 uppercase shadow-inner',
            sizeClasses[size],
            colorClass
          )}
          title={fullName}
        >
          {initials}
        </div>
      )}

      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2',
            statusSizeClasses[size],
            statusColorClasses[status]
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
