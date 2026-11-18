import React, { Fragment } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string | number;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  selectedIndex?: number;
  onChange?: (index: number) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  selectedIndex,
  onChange,
  variant = 'underline',
  className,
}) => {
  return (
    <TabGroup
      selectedIndex={selectedIndex}
      onChange={onChange}
      className={cn('w-full', className)}
    >
      <TabList
        className={cn(
          'flex space-x-1',
          variant === 'underline'
            ? 'border-b border-gray-200'
            : 'rounded-xl bg-gray-100 p-1'
        )}
      >
        {tabs.map((tab) => (
          <Tab as={Fragment} key={tab.id}>
            {({ selected }) => (
              <button
                type="button"
                className={cn(
                  'flex items-center text-sm font-medium transition-all focus:outline-none whitespace-nowrap',
                  variant === 'underline'
                    ? cn(
                        'py-3 px-4 border-b-2 -mb-px',
                        selected
                          ? 'border-indigo-600 text-indigo-600 font-semibold'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      )
                    : cn(
                        'rounded-lg py-2 px-3.5',
                        selected
                          ? 'bg-white text-gray-900 shadow-sm font-semibold'
                          : 'text-gray-600 hover:text-gray-900'
                      )
                )}
              >
                {tab.icon && <span className="mr-2 h-4 w-4 shrink-0">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'ml-2 rounded-full py-0.5 px-2 text-xs font-semibold',
                      selected
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-200 text-gray-600'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )}
          </Tab>
        ))}
      </TabList>

      <TabPanels className="mt-4 focus:outline-none">
        {tabs.map((tab) => (
          <TabPanel key={tab.id} className="focus:outline-none">
            {tab.content}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
};

export default Tabs;
