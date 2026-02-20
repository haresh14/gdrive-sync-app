import { z } from 'zod';

export const SyncModeSchema = z.enum(['mirror', 'one-way-lr', 'one-way-rl', 'two-way']);

export const LocalPathSchema = z.object({
  type: z.literal('local'),
  path: z.string().min(1),
});

export const DrivePathSchema = z.object({
  type: z.literal('drive'),
  accountId: z.string().min(1),
  folderId: z.string().min(1),
  folderName: z.string().optional(),
});

export const SyncPathSchema = z.union([LocalPathSchema, DrivePathSchema]);

export const FolderPairSchema = z.object({
  source: SyncPathSchema,
  target: SyncPathSchema,
});

export const SyncConfigSchema = z.object({
  version: z.number().min(1),
  name: z.string().min(1),
  folderPairs: z.array(FolderPairSchema),
  syncMode: SyncModeSchema,
  settingsPath: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type SyncConfigInput = z.infer<typeof SyncConfigSchema>;
