import type { ReactNode, MouseEventHandler } from "react";
import "./Button.scss";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  readonly variant?: ButtonVariant;
  readonly className?: string;
  readonly children: ReactNode;
  readonly onClick?: MouseEventHandler<HTMLButtonElement>;
  readonly ariaLabel?: string;
}

export function Button({
  variant = "secondary",
  className,
  children,
  onClick,
  ariaLabel,
}: ButtonProps) {
  const classes = ["button", `button--${variant}`, className].filter(Boolean).join(" ");
  return (
    <button className={classes} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
