import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-sky-600 text-white hover:bg-sky-500 focus-visible:outline-sky-600",
  outline: "border border-slate-300 bg-white hover:bg-slate-100 focus-visible:outline-slate-400",
  ghost: "hover:bg-slate-100 focus-visible:outline-slate-300"
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base"
};

export const Button = forwardRef(function Button(
  { className, variant = "default", size = "md", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant] ?? variants.default,
        sizes[size] ?? sizes.md,
        className
      )}
      {...props}
    />
  );
});
