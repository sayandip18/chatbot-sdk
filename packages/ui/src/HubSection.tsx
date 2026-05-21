import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './lib/utils';
import { HeadingLgSemibold120 } from './typography';

interface HubSectionTab {
  key: string;
  selected: boolean;
  onClick: () => void;
  label: string;
}

interface HubSectionProps {
  title: string;
  Icon: LucideIcon;
  sections?: HubSectionTab[];
  children: React.ReactNode;
}

export function HubSection({ title, Icon, sections, children }: HubSectionProps) {
  return (
    <div className="flex flex-col min-w-[365px] h-full border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200 shrink-0">
        <Icon className="w-5 h-5 text-emerald-600" />
        <HeadingLgSemibold120>{title}</HeadingLgSemibold120>
      </div>
      {sections && sections.length > 0 && (
        <div className="flex flex-row border-b border-slate-200 shrink-0">
          {sections.map((tab) => (
            <button
              key={tab.key}
              onClick={tab.onClick}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                tab.selected
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </div>
    </div>
  );
}
