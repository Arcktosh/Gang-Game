import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { itemDefinitions, itemImages } from '../schema';

export type ItemImageCatalogEntry = {
  itemKey: string;
  itemName: string;
  itemCategory: string;
  itemDescription: string;
  imageContentType: string | null;
  imageByteSize: number | null;
  imageAltText: string | null;
  imageSha256: string | null;
  imageCreatedAt: Date | null;
  imageUpdatedAt: Date | null;
};

export type ItemImageAsset = {
  itemKey: string;
  contentType: string;
  byteSize: number;
  altText: string;
  sha256: string;
  imageData: Uint8Array;
  updatedAt: Date;
};

function rowsFromExecuteResult(result: unknown) {
  return Array.isArray(result) ? result : ((result as { rows?: unknown[] } | null)?.rows ?? []);
}

function normalizeImageBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (typeof value === 'string') {
    const hex = value.startsWith('\\x') ? value.slice(2) : value;

    if (/^[0-9a-f]+$/i.test(hex) && hex.length % 2 === 0) {
      return Uint8Array.from(Buffer.from(hex, 'hex'));
    }
  }

  return null;
}

export async function listItemImageCatalog(): Promise<ItemImageCatalogEntry[]> {
  const rows = await db
    .select({
      itemKey: itemDefinitions.key,
      itemName: itemDefinitions.name,
      itemCategory: itemDefinitions.category,
      itemDescription: itemDefinitions.description,
      imageContentType: itemImages.contentType,
      imageByteSize: itemImages.byteSize,
      imageAltText: itemImages.altText,
      imageSha256: itemImages.sha256,
      imageCreatedAt: itemImages.createdAt,
      imageUpdatedAt: itemImages.updatedAt,
    })
    .from(itemDefinitions)
    .leftJoin(itemImages, eq(itemDefinitions.key, itemImages.itemKey))
    .orderBy(asc(itemDefinitions.name));

  return rows;
}

export async function getItemImageAsset(itemKey: string): Promise<ItemImageAsset | null> {
  const result = await db.execute(sql`
    select
      item_key as "itemKey",
      content_type as "contentType",
      byte_size as "byteSize",
      alt_text as "altText",
      sha256,
      image_data as "imageData",
      updated_at as "updatedAt"
    from item_images
    where item_key = ${itemKey}
    limit 1
  `);
  const row = rowsFromExecuteResult(result)[0] as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  const imageData = normalizeImageBytes(row.imageData);

  if (!imageData) {
    throw new Error(`Stored product image for ${itemKey} could not be decoded.`);
  }

  return {
    itemKey: String(row.itemKey),
    contentType: String(row.contentType),
    byteSize: Number(row.byteSize),
    altText: String(row.altText ?? ''),
    sha256: String(row.sha256),
    imageData,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(String(row.updatedAt)),
  };
}

export async function upsertItemImage(input: {
  itemKey: string;
  contentType: string;
  byteSize: number;
  altText: string;
  imageData: Uint8Array;
  sha256: string;
  updatedByUserId: string;
}) {
  const item = await db.query.itemDefinitions.findFirst({
    columns: { key: true, name: true },
    where: eq(itemDefinitions.key, input.itemKey),
  });

  if (!item) {
    return null;
  }

  await db.execute(sql`
    insert into item_images (
      item_key,
      content_type,
      byte_size,
      alt_text,
      image_data,
      sha256,
      updated_by_user_id,
      updated_at
    ) values (
      ${input.itemKey},
      ${input.contentType},
      ${input.byteSize},
      ${input.altText},
      ${Buffer.from(input.imageData)},
      ${input.sha256},
      ${input.updatedByUserId},
      now()
    )
    on conflict (item_key) do update set
      content_type = excluded.content_type,
      byte_size = excluded.byte_size,
      alt_text = excluded.alt_text,
      image_data = excluded.image_data,
      sha256 = excluded.sha256,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_at = now()
  `);

  return {
    itemKey: item.key,
    itemName: item.name,
    contentType: input.contentType,
    byteSize: input.byteSize,
    altText: input.altText,
    sha256: input.sha256,
  };
}

export async function deleteItemImage(itemKey: string) {
  const result = await db
    .delete(itemImages)
    .where(eq(itemImages.itemKey, itemKey))
    .returning({ itemKey: itemImages.itemKey });

  return result[0] ?? null;
}
