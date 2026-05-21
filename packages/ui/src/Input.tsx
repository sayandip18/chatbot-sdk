import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id, ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs text-zinc-400">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-zinc-500 ${className}`}
        {...rest}
      />
    </div>
  );
}
