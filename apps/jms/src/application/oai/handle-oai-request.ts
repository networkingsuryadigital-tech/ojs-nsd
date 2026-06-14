import "server-only";

import { parseOaiIdentifier } from "@/domain/oai/identifier";
import {
  buildListFilters,
  decodeResumptionToken,
  encodeResumptionToken,
} from "@/domain/oai/resumption-token";
import {
  OAI_DC_METADATA_PREFIX,
  OAI_PAGE_SIZE,
  OAI_VERBS,
  type OaiVerb,
} from "@/domain/oai/types";
import {
  buildOaiResponseCacheKey,
  getCachedOaiResponse,
  getOaiCacheVersion,
  setCachedOaiResponse,
} from "@/infrastructure/oai/oai-cache";
import {
  fetchEarliestPublishedDatestamp,
  fetchOaiJournalContext,
  getOaiPublishedRecord,
  listOaiPublishedRecords,
  listOaiSets,
} from "@/infrastructure/oai/oai-repository";
import {
  buildGetRecordXml,
  buildIdentifyXml,
  buildListIdentifiersXml,
  buildListMetadataFormatsXml,
  buildListRecordsXml,
  buildListSetsXml,
  buildOaiErrorXml,
} from "@/infrastructure/oai/xml-builder";

export type HandleOaiRequestInput = {
  journalId: string;
  baseUrl: string;
  baseSiteUrl: string;
  repositoryHost: string;
  searchParams: URLSearchParams;
};

export type HandleOaiRequestResult = {
  xml: string;
  status: number;
};

function isOaiVerb(value: string): value is OaiVerb {
  return (OAI_VERBS as readonly string[]).includes(value);
}

function exclusiveResumptionConflict(
  searchParams: URLSearchParams,
): boolean {
  if (!searchParams.has("resumptionToken")) {
    return false;
  }
  return ["from", "until", "set", "metadataPrefix"].some((key) =>
    searchParams.has(key),
  );
}

export async function handleOaiRequest(
  input: HandleOaiRequestInput,
): Promise<HandleOaiRequestResult> {
  const verb = input.searchParams.get("verb");
  if (!verb) {
    return {
      xml: buildOaiErrorXml(input.baseUrl, "badVerb", "Missing verb argument."),
      status: 400,
    };
  }
  if (!isOaiVerb(verb)) {
    return {
      xml: buildOaiErrorXml(
        input.baseUrl,
        "badVerb",
        `Illegal OAI verb '${verb}'.`,
        { verb },
      ),
      status: 400,
    };
  }

  const journal = await fetchOaiJournalContext(input.journalId);
  if (!journal) {
    return {
      xml: buildOaiErrorXml(input.baseUrl, "badArgument", "Journal not found."),
      status: 404,
    };
  }

  switch (verb) {
    case "Identify":
      return handleIdentify(input, journal);
    case "ListMetadataFormats":
      return {
        xml: buildListMetadataFormatsXml(input.baseUrl),
        status: 200,
      };
    case "ListSets":
      return handleListSets(input);
    case "ListIdentifiers":
      return handleListIdentifiers(input, journal);
    case "ListRecords":
      return handleListRecords(input, journal);
    case "GetRecord":
      return handleGetRecord(input, journal);
    default:
      return {
        xml: buildOaiErrorXml(input.baseUrl, "badVerb", "Unsupported verb."),
        status: 400,
      };
  }
}

async function handleIdentify(
  input: HandleOaiRequestInput,
  journal: NonNullable<Awaited<ReturnType<typeof fetchOaiJournalContext>>>,
): Promise<HandleOaiRequestResult> {
  const earliest = await fetchEarliestPublishedDatestamp(input.journalId);
  return {
    xml: buildIdentifyXml(input.baseUrl, journal, earliest),
    status: 200,
  };
}

async function handleListSets(
  input: HandleOaiRequestInput,
): Promise<HandleOaiRequestResult> {
  const sets = await listOaiSets(input.journalId);
  if (sets.length === 0) {
    return {
      xml: buildOaiErrorXml(
        input.baseUrl,
        "noSetHierarchy",
        "No sets are available for this repository.",
        { verb: "ListSets" },
      ),
      status: 200,
    };
  }
  return {
    xml: buildListSetsXml(input.baseUrl, sets),
    status: 200,
  };
}

async function handleListIdentifiers(
  input: HandleOaiRequestInput,
  journal: NonNullable<Awaited<ReturnType<typeof fetchOaiJournalContext>>>,
): Promise<HandleOaiRequestResult> {
  return handleListPage(input, journal, "ListIdentifiers");
}

async function handleListRecords(
  input: HandleOaiRequestInput,
  journal: NonNullable<Awaited<ReturnType<typeof fetchOaiJournalContext>>>,
): Promise<HandleOaiRequestResult> {
  return handleListPage(input, journal, "ListRecords");
}

async function handleListPage(
  input: HandleOaiRequestInput,
  journal: NonNullable<Awaited<ReturnType<typeof fetchOaiJournalContext>>>,
  verb: "ListIdentifiers" | "ListRecords",
): Promise<HandleOaiRequestResult> {
  if (exclusiveResumptionConflict(input.searchParams)) {
    return {
      xml: buildOaiErrorXml(
        input.baseUrl,
        "badArgument",
        "resumptionToken may not be combined with from, until, set, or metadataPrefix.",
        { verb },
      ),
      status: 400,
    };
  }

  const cacheVersion = await getOaiCacheVersion(input.journalId);
  let metadataPrefix = input.searchParams.get("metadataPrefix") ?? undefined;
  let filtersResult = buildListFilters({
    from: input.searchParams.get("from"),
    until: input.searchParams.get("until"),
    set: input.searchParams.get("set"),
  });
  let cursor: string | undefined;

  const resumptionToken = input.searchParams.get("resumptionToken");
  if (resumptionToken) {
    const decoded = decodeResumptionToken(resumptionToken);
    if (!decoded.ok || decoded.state.journalId !== input.journalId) {
      return {
        xml: buildOaiErrorXml(
          input.baseUrl,
          "badResumptionToken",
          "Invalid or expired resumption token.",
          { verb, resumptionToken },
        ),
        status: 400,
      };
    }
    if (decoded.state.verb !== verb) {
      return {
        xml: buildOaiErrorXml(
          input.baseUrl,
          "badResumptionToken",
          "Resumption token does not match verb.",
          { verb, resumptionToken },
        ),
        status: 400,
      };
    }
    if (decoded.state.cacheVersion !== cacheVersion) {
      return {
        xml: buildOaiErrorXml(
          input.baseUrl,
          "badResumptionToken",
          "Resumption token is no longer valid.",
          { verb, resumptionToken },
        ),
        status: 400,
      };
    }
    metadataPrefix = decoded.state.metadataPrefix;
    filtersResult = { ok: true, filters: decoded.state.filters };
    cursor = decoded.state.cursor;
  }

  if (!metadataPrefix) {
    return {
      xml: buildOaiErrorXml(
        input.baseUrl,
        "badArgument",
        "Missing metadataPrefix argument.",
        { verb },
      ),
      status: 400,
    };
  }
  if (metadataPrefix !== OAI_DC_METADATA_PREFIX) {
    return {
      xml: buildOaiErrorXml(
        input.baseUrl,
        "cannotDisseminateFormat",
        `Metadata format '${metadataPrefix}' is not supported.`,
        { verb, metadataPrefix },
      ),
      status: 400,
    };
  }
  if (!filtersResult.ok) {
    return {
      xml: buildOaiErrorXml(input.baseUrl, "badArgument", filtersResult.reason, {
        verb,
        metadataPrefix,
      }),
      status: 400,
    };
  }

  const requestAttributes = {
    verb,
    metadataPrefix,
    ...(input.searchParams.get("from")
      ? { from: input.searchParams.get("from")! }
      : {}),
    ...(input.searchParams.get("until")
      ? { until: input.searchParams.get("until")! }
      : {}),
    ...(input.searchParams.get("set")
      ? { set: input.searchParams.get("set")! }
      : {}),
    ...(resumptionToken ? { resumptionToken } : {}),
  };

  if (verb === "ListRecords" && !resumptionToken) {
    const cacheKey = buildOaiResponseCacheKey({
      journalId: input.journalId,
      verb,
      metadataPrefix,
      from: input.searchParams.get("from") ?? "",
      until: input.searchParams.get("until") ?? "",
      set: input.searchParams.get("set") ?? "",
      version: String(cacheVersion),
    });
    const cached = await getCachedOaiResponse(cacheKey);
    if (cached) {
      return { xml: cached, status: 200 };
    }
  }

  const page = await listOaiPublishedRecords(
    input.journalId,
    filtersResult.filters,
    { cursor, limit: OAI_PAGE_SIZE },
  );

  if (page.noRecordsMatch) {
    return {
      xml: buildOaiErrorXml(
        input.baseUrl,
        "noRecordsMatch",
        "No records match the given criteria.",
        requestAttributes,
      ),
      status: 200,
    };
  }

  const nextToken =
    page.hasMore && page.nextCursor
      ? encodeResumptionToken({
          journalId: input.journalId,
          verb,
          metadataPrefix,
          filters: filtersResult.filters,
          cursor: page.nextCursor,
          cacheVersion,
        })
      : undefined;

  if (verb === "ListIdentifiers") {
    return {
      xml: buildListIdentifiersXml(
        input.baseUrl,
        page.records,
        input.repositoryHost,
        requestAttributes,
        nextToken,
      ),
      status: 200,
    };
  }

  const xml = buildListRecordsXml(
    input.baseUrl,
    page.records,
    journal,
    input.repositoryHost,
    input.baseSiteUrl,
    requestAttributes,
    nextToken,
  );

  if (!resumptionToken) {
    const cacheKey = buildOaiResponseCacheKey({
      journalId: input.journalId,
      verb,
      metadataPrefix,
      from: input.searchParams.get("from") ?? "",
      until: input.searchParams.get("until") ?? "",
      set: input.searchParams.get("set") ?? "",
      version: String(cacheVersion),
    });
    await setCachedOaiResponse(cacheKey, xml);
  }

  return { xml, status: 200 };
}

async function handleGetRecord(
  input: HandleOaiRequestInput,
  journal: NonNullable<Awaited<ReturnType<typeof fetchOaiJournalContext>>>,
): Promise<HandleOaiRequestResult> {
  const identifier = input.searchParams.get("identifier");
  const metadataPrefix = input.searchParams.get("metadataPrefix");
  if (!identifier || !metadataPrefix) {
    return {
      xml: buildOaiErrorXml(
        input.baseUrl,
        "badArgument",
        "identifier and metadataPrefix are required.",
        { verb: "GetRecord" },
      ),
      status: 400,
    };
  }
  if (metadataPrefix !== OAI_DC_METADATA_PREFIX) {
    return {
      xml: buildOaiErrorXml(
        input.baseUrl,
        "cannotDisseminateFormat",
        `Metadata format '${metadataPrefix}' is not supported.`,
        { verb: "GetRecord", identifier, metadataPrefix },
      ),
      status: 400,
    };
  }

  const parsed = parseOaiIdentifier(identifier, input.repositoryHost);
  if (!parsed.ok) {
    return {
      xml: buildOaiErrorXml(
        input.baseUrl,
        "idDoesNotExist",
        "Unknown identifier.",
        { verb: "GetRecord", identifier, metadataPrefix },
      ),
      status: 200,
    };
  }

  const record = await getOaiPublishedRecord(input.journalId, parsed.submissionId);
  if (!record) {
    return {
      xml: buildOaiErrorXml(
        input.baseUrl,
        "idDoesNotExist",
        "Unknown identifier.",
        { verb: "GetRecord", identifier, metadataPrefix },
      ),
      status: 200,
    };
  }

  return {
    xml: buildGetRecordXml(
      input.baseUrl,
      record,
      journal,
      input.repositoryHost,
      input.baseSiteUrl,
      metadataPrefix,
    ),
    status: 200,
  };
}
