import "server-only";

import { z } from "zod";

import {
  actorIsCorrespondingAuthor,
  validateAuthorList,
} from "@/domain/submission/author-metadata";
import type {
  CreateDraftSubmissionInput,
  CreateDraftSubmissionResult,
  SubmissionRole,
} from "@/domain/submission/types";
import {
  createDraftSubmissionRecords,
  findSectionInJournal,
  findUserById,
} from "@/infrastructure/submission/submission-repository";

const authorSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().optional(),
  affiliation: z.string().trim().max(300).optional(),
  orcid: z.string().trim().max(30).optional(),
  order: z.number().int().min(1),
  isCorresponding: z.boolean(),
});

const createDraftSubmissionSchema = z.object({
  journalId: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1).optional(),
  primaryLanguage: z.string().trim().min(2).max(10).optional(),
  authors: z.array(authorSchema).min(1),
  translation: z.object({
    language: z.string().trim().min(2).max(10),
    title: z.string().trim().min(3).max(500),
    abstract: z.string().trim().min(10).max(10_000),
    keywords: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  }),
});

export async function createDraftSubmission(
  input: CreateDraftSubmissionInput,
): Promise<CreateDraftSubmissionResult> {
  const parsed = createDraftSubmissionSchema.parse(input);
  validateAuthorList(parsed.authors);

  const actor = await findUserById(parsed.actorUserId);
  if (!actor) {
    throw new Error("Actor user not found.");
  }

  if (parsed.sectionId) {
    const section = await findSectionInJournal(parsed.journalId, parsed.sectionId);
    if (!section) {
      throw new Error("Section not found in this journal.");
    }
  }

  const participantRoles: SubmissionRole[] = ["AUTHOR"];
  if (
    actorIsCorrespondingAuthor(parsed.authors, actor.email, actor.name)
  ) {
    participantRoles.push("CORRESPONDING_AUTHOR");
  }

  const primaryLanguage = parsed.primaryLanguage ?? parsed.translation.language;

  return createDraftSubmissionRecords(parsed.journalId, {
    actorUserId: parsed.actorUserId,
    sectionId: parsed.sectionId,
    primaryLanguage,
    authors: parsed.authors,
    translation: parsed.translation,
    participantRoles,
  });
}
