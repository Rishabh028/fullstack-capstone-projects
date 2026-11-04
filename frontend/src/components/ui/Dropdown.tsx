import React, { Fragment } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { cn } from '@/lib/utils';

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: (DropdownItem | { divider: true })[];
  align?: 'left' | 'right';
  className?: string;
  width?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className,
  width = 'w-48',
}) => {
  return (
    <Menu as="div" className={cn('relative inline-block text-left', className)}>
      <MenuButton as={Fragment}>{trigger}</MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems
          className={cn(
            'absolute z-30 mt-2 origin-top rounded-xl bg-white shadow-lg ring-1 ring-black/5 focus:outline-none divide-y divide-gray-100 py-1 border border-gray-100',
            align === 'right' ? 'right-0' : 'left-0',
            width
          )}
        >
          <div className="py-1">
            {items.map((item, index) => {
              if ('divider' in item && item.divider && !('label' in item)) {
                return <div key={`div-${index}`} className="my-1 border-t border-gray-100" />;
              }

              const dropdownItem = item as DropdownItem;

              return (
                <MenuItem key={index} disabled={dropdownItem.disabled}>
                  {({ active }) => (
                    <button
                      type="button"
                      onClick={dropdownItem.onClick}
                      disabled={dropdownItem.disabled}
                      className={cn(
                        'group flex w-full items-center px-4 py-2 text-sm transition-colors duration-150',
                        active ? (dropdownItem.danger ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-900') : (dropdownItem.danger ? 'text-red-600' : 'text-gray-700'),
                        dropdownItem.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {dropdownItem.icon && (
                        <span
                          className={cn(
                            'mr-3 h-4 w-4 shrink-0 transition-colors',
                            dropdownItem.danger
                              ? 'text-red-500 group-hover:text-red-600'
                              : 'text-gray-400 group-hover:text-gray-600'
                          )}
                        >
                          {dropdownItem.icon}
                        </span>
                      )}
                      <span className="truncate">{dropdownItem.label}</span>
                    </button>
                  )}
                </MenuItem>
              );
            })}
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  );
};

export default Dropdown;
