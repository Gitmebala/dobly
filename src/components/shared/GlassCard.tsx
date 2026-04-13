import { forwardRef, type HTMLAttributes } from "react";

const GlassCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function GlassCard(
  { className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`glass relative overflow-hidden rounded-[1.25rem] border border-[var(--glass-border)] bg-[var(--glass)] p-6 ${className ?? ""}`}
      {...props}
    >
      {children}
    </div>
  );
});

export default GlassCard;
