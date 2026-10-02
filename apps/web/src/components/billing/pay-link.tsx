"use client";

import Link, { type LinkProps } from "next/link";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { usePaywall } from "@/lib/use-paywall";

export function PayLink({
  href,
  className,
  style,
  children,
  onClick,
}: {
  href: LinkProps["href"];
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const { lapsed, block } = usePaywall();

  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={(event) => {
        if (lapsed) {
          event.preventDefault();
          block();
          return;
        }
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}

