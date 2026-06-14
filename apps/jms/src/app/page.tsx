import { getRequestTenantContext } from "@/application/journal/get-journal-public-site";
import { PlatformHomeView } from "@/components/platform/platform-home-view";
import { TenantHomeView } from "@/components/tenant/tenant-views";

export default async function HomePage() {
  const context = await getRequestTenantContext();

  if (context.kind === "tenant") {
    return <TenantHomeView site={context.site} />;
  }

  return <PlatformHomeView />;
}

export async function generateMetadata() {
  const context = await getRequestTenantContext();
  if (context.kind !== "tenant") {
    return {};
  }

  return {
    title: context.site.name,
  };
}
