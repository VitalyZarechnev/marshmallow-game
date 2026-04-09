import type { ReactNode } from "react";

type HeadlineLevel = 1 | 2 | 3;

interface HeadlineProps {
  readonly level?: HeadlineLevel;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Headline({ level = 1, className, children }: HeadlineProps) {
  const Tag = `h${level}` as const;
  return <Tag className={className}>{children}</Tag>;
}
