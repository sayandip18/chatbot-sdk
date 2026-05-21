import React from 'react';
import { cn } from './lib/utils';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

export function Heading2XLSemibold120({ children, className }: TypographyProps) {
  return <span className={cn('text-2xl font-semibold leading-[1.2]', className)}>{children}</span>;
}

export function HeadingLgSemibold120({ children, className }: TypographyProps) {
  return <span className={cn('text-lg font-semibold leading-[1.2]', className)}>{children}</span>;
}

export function BodyBaseRegular24({ children, className }: TypographyProps) {
  return <span className={cn('text-base font-normal leading-6', className)}>{children}</span>;
}

export function BodyBaseMedium24({ children, className }: TypographyProps) {
  return <span className={cn('text-base font-medium leading-6', className)}>{children}</span>;
}

export function BodySmRegular20({ children, className }: TypographyProps) {
  return <span className={cn('text-sm font-normal leading-5', className)}>{children}</span>;
}

export function BodySmMedium20({ children, className }: TypographyProps) {
  return <span className={cn('text-sm font-medium leading-5', className)}>{children}</span>;
}

export function BodySmMedium100({ children, className }: TypographyProps) {
  return <span className={cn('text-sm font-medium leading-none', className)}>{children}</span>;
}

export function BodyXsRegular16({ children, className }: TypographyProps) {
  return <span className={cn('text-xs font-normal leading-4', className)}>{children}</span>;
}

export function LabelXsMedium16({ children, className }: TypographyProps) {
  return <span className={cn('text-xs font-medium leading-4', className)}>{children}</span>;
}
