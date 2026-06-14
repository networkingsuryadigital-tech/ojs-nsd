import { notFound } from "next/navigation";

import { getJournalPageForCurrentRequest } from "@/application/journal/get-journal-public-site";
import { TenantPageView } from "@/components/tenant/tenant-views";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function JournalStaticPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getJournalPageForCurrentRequest(slug);

  if (!result) {
    notFound();
  }

  return (
    <TenantPageView
      site={result.journal}
      slug={slug}
      title={result.page.title}
      content={result.page.content}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const result = await getJournalPageForCurrentRequest(slug);
  if (!result) {
    return {};
  }

  return {
    title: `${result.page.title} — ${result.journal.name}`,
  };
}
