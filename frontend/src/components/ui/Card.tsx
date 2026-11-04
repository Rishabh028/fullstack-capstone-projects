import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  headerBorder?: boolean;
  footer?: React.ReactNode;
  bodyClassName?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  headerBorder = true,
  footer,
  children,
  className,
  bodyClassName,
  ...props
}) => {
  const hasHeader = title || subtitle || action;

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200/80 bg-white shadow-sm transition-all duration-200',
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div
          className={cn(
            'flex items-center justify-between px-6 py-4',
            headerBorder && 'border-b border-gray-100'
          )}
        >
          <div>
            {title && (
              <h3 className="text-base font-semibold text-gray-900 leading-snug">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-gray-500 leading-normal">{subtitle}</p>
            )}
          </div>
          {action && <div className="ml-4 shrink-0">{action}</div>}
        </div>
      )}

      <div className={cn('px-6 py-5', bodyClassName)}>{children}</div>

      {footer && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-3.5 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
