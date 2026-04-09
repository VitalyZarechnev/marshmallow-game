import type { ReactNode } from "react";

type ParagraphTag = "p" | "span";

interface ParagraphProps {
  readonly as?: ParagraphTag;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Paragraph({ as: Tag = "p", className, children }: ParagraphProps) {
  return <Tag className={className}>{children}</Tag>;
}
