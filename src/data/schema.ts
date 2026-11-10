/**
 * Canonical data schema for Encarta Reborn.
 *
 * This is the single source of truth for the shape of place content (steering:
 * structure.md naming + tech.md data contract). The anti-feed manifesto law
 * "every factual claim must be sourced" is encoded here: the summary, every
 * Fact, and every Media item require at least one Source. Records that violate
 * this are invalid and must not render (enforced by validators.ts + SourceGate).
 */
import { z } from 'zod';

/** Licenses we accept. Anything else is not license-clean and must be dropped. */
export const LicenseSchema = z.enum([
  'CC0',
  'CC-BY',
  'CC-BY-SA',
  'public-domain',
  'ODbL',
  'other',
]);
export type License = z.infer<typeof LicenseSchema>;

/** A citation to an approved open dataset. */
export const SourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  license: LicenseSchema,
});
export type Source = z.infer<typeof SourceSchema>;

/** At least one source is required wherever facts are asserted. */
const NonEmptySources = z.array(SourceSchema).min(1);

export const FactSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  sources: NonEmptySources,
});
export type Fact = z.infer<typeof FactSchema>;

export const MediaSchema = z.object({
  kind: z.enum(['image', 'audio']),
  // Either an https URL, or a root-relative path to a file bundled with the app
  // (e.g. /media/paris-0.jpg). Bundled media is what makes the disc work offline
  // and keeps readers from contacting other sites just by opening an article.
  url: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith('https://') ||
        (value.startsWith('/') && !value.startsWith('//')),
      'Media url must be https:// or a root-relative path',
    ),
  alt: z.string().min(1), // descriptive alt text is required (Req 3.5)
  attribution: z.string().min(1),
  sources: NonEmptySources,
});
export type Media = z.infer<typeof MediaSchema>;

/**
 * A curiosity link. `reason` is restricted to graph-derived relationships only;
 * there is deliberately no field for engagement or personalization signals, so
 * manifesto law 2 ("no algorithmic recommendations") is structurally enforced.
 */
export const TrailLinkSchema = z.object({
  toId: z.string().min(1),
  reason: z.enum(['category', 'geography', 'topic']),
});
export type TrailLink = z.infer<typeof TrailLinkSchema>;

export const PlaceTypeSchema = z.enum([
  'country',
  'city',
  'landmark',
  'natural',
  'heritage',
]);
export type PlaceType = z.infer<typeof PlaceTypeSchema>;

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

export const PlaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: PlaceTypeSchema,
  coordinates: CoordinatesSchema,
  summary: z.object({
    text: z.string().min(1),
    sources: NonEmptySources, // the summary itself must be sourced (Req 3.3)
  }),
  facts: z.array(FactSchema),
  media: z.array(MediaSchema),
  trails: z.array(TrailLinkSchema),
  categories: z.array(z.string().min(1)), // feeds the trail graph
});
export type Place = z.infer<typeof PlaceSchema>;

export const SnapshotSchema = z.object({
  version: z.string().min(1),
  generatedAt: z.string().min(1),
  places: z.array(PlaceSchema),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;
