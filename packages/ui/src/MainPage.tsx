import React from 'react';
import { Heading2XLSemibold120 } from './typography';

interface MainPageProps {
  title: string;
  actionComponent?: React.ReactNode;
  children: React.ReactNode;
}

export function MainPage({ title, actionComponent, children }: MainPageProps) {
  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      <div className="flex flex-row items-center justify-between px-8 py-4 border-b border-slate-200 shrink-0">
        <Heading2XLSemibold120>{title}</Heading2XLSemibold120>
        {actionComponent && <div className="flex flex-row gap-2">{actionComponent}</div>}
      </div>
      <div className="flex-1 overflow-hidden p-8">
        {children}
      </div>
    </div>
  );
}
