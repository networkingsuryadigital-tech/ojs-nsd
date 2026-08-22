export const ARTICLE_LICENSES = [
  "CC_BY_4",
  "CC_BY_NC_4",
  "CC_BY_SA_4",
  "ALL_RIGHTS_RESERVED",
] as const;

export type ArticleLicense = (typeof ARTICLE_LICENSES)[number];

const LICENSE_RIGHTS_URL: Record<ArticleLicense, string> = {
  CC_BY_4: "https://creativecommons.org/licenses/by/4.0/",
  CC_BY_NC_4: "https://creativecommons.org/licenses/by-nc/4.0/",
  CC_BY_SA_4: "https://creativecommons.org/licenses/by-sa/4.0/",
  ALL_RIGHTS_RESERVED: "All rights reserved",
};

const LICENSE_LABEL: Record<ArticleLicense, string> = {
  CC_BY_4: "CC BY 4.0",
  CC_BY_NC_4: "CC BY-NC 4.0",
  CC_BY_SA_4: "CC BY-SA 4.0",
  ALL_RIGHTS_RESERVED: "All rights reserved",
};

export function isArticleLicense(value: string): value is ArticleLicense {
  return (ARTICLE_LICENSES as readonly string[]).includes(value);
}

export function validateLicense(value: string): ArticleLicense {
  if (!isArticleLicense(value)) {
    throw new Error(`Unknown article license: ${value}`);
  }
  return value;
}

export function mapLicenseToDublinCoreRights(
  license: ArticleLicense,
  customRightsUrl?: string | null,
): string {
  if (customRightsUrl?.trim()) {
    return customRightsUrl.trim();
  }
  return LICENSE_RIGHTS_URL[license];
}

export function licenseLabel(license: ArticleLicense): string {
  return LICENSE_LABEL[license];
}
