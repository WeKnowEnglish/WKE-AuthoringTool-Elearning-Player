"use client";

import { useEffect } from "react";
import {
  trackMarketingEvent,
  type MarketingEventName,
  type MarketingEventProps,
} from "@/lib/seo/marketing-events";

export function HomepageAnalytics() {
  useEffect(() => {
    trackMarketingEvent("homepage_view", {
      landingPage: "/",
      authState: "anonymous",
      userRole: "anonymous",
    });
  }, []);

  return null;
}

type TrackedLinkProps = {
  href: string;
  event: MarketingEventName;
  eventProps?: MarketingEventProps;
  className?: string;
  children: React.ReactNode;
};

export function TrackedMarketingLink({
  href,
  event,
  eventProps,
  className,
  children,
}: TrackedLinkProps) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => trackMarketingEvent(event, eventProps)}
    >
      {children}
    </a>
  );
}
