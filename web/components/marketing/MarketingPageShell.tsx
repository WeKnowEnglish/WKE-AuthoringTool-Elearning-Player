import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PillarBreadcrumbs } from "@/components/marketing/PillarBreadcrumbs";
import { SiteFooter } from "@/components/landing/SiteFooter";
import type { BreadcrumbItem } from "@/lib/seo/json-ld";

type Props = {
  breadcrumbs: BreadcrumbItem[];
  children: React.ReactNode;
};

export function MarketingPageShell({ breadcrumbs, children }: Props) {
  return (
    <div className="min-h-dvh bg-[var(--landing-page-bg)] text-kid-ink">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <PillarBreadcrumbs items={breadcrumbs} />
        <div className="marketing-prose">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
