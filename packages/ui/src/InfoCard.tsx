import React from "react";
import { cn } from "./lib/utils";
import {
  Heading2XLSemibold120,
  HeadingLgSemibold120,
  BodySmRegular20,
} from "./typography";

interface InfoCardProps {
  title: string;
  subtitle?: string;
  className?: string;
  titleSize?: "xl" | "lg";
  topRightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function InfoCard({
  title,
  subtitle,
  className,
  titleSize = "lg",
  topRightIcon,
  children,
}: InfoCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white",
        className,
      )}
    >
      <div className="flex flex-row items-start justify-between p-4 border-b border-slate-200 shrink-0">
        <div className="flex flex-col gap-1">
          {titleSize === "xl" ? (
            <Heading2XLSemibold120>{title}</Heading2XLSemibold120>
          ) : (
            <HeadingLgSemibold120>{title}</HeadingLgSemibold120>
          )}
          {subtitle && (
            <BodySmRegular20 className="text-gray-500">
              {subtitle}
            </BodySmRegular20>
          )}
        </div>
        {topRightIcon && <div>{topRightIcon}</div>}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden p-6">{children}</div>
    </div>
  );
}
