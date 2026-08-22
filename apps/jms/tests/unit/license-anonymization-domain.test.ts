import { describe, expect, it } from "vitest";

import {
  mapLicenseToDublinCoreRights,
  validateLicense,
} from "@/domain/publishing/license";
import {
  stripDocxAppPropertiesXml,
  stripDocxCorePropertiesXml,
} from "@/domain/review/anonymization";

describe("article license", () => {
  it("maps CC-BY to Dublin Core rights URL", () => {
    expect(validateLicense("CC_BY_4")).toBe("CC_BY_4");
    expect(mapLicenseToDublinCoreRights("CC_BY_4")).toBe(
      "https://creativecommons.org/licenses/by/4.0/",
    );
  });

  it("prefers custom rights URL", () => {
    expect(
      mapLicenseToDublinCoreRights("CC_BY_4", "https://example.com/rights"),
    ).toBe("https://example.com/rights");
  });
});

describe("DOCX metadata strip", () => {
  it("clears creator and lastModifiedBy from core.xml", () => {
    const xml = `<?xml version="1.0"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:creator>Budi Penulis</dc:creator>
  <cp:lastModifiedBy>Budi Penulis</cp:lastModifiedBy>
  <dc:title>Naskah Rahasia</dc:title>
</cp:coreProperties>`;
    const stripped = stripDocxCorePropertiesXml(xml);
    expect(stripped).not.toContain("Budi Penulis");
    expect(stripped).not.toContain("Naskah Rahasia");
    expect(stripped).toContain("<dc:creator></dc:creator>");
  });

  it("clears Company from app.xml", () => {
    const xml = `<Properties><Company>Universitas Contoh</Company><Manager>Andi</Manager></Properties>`;
    const stripped = stripDocxAppPropertiesXml(xml);
    expect(stripped).not.toContain("Universitas Contoh");
    expect(stripped).not.toContain("Andi");
  });
});
