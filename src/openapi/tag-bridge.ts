import { OpenAPIObject, OperationObject } from 'openapi3-ts/oas31';
import { TrafficEntry } from '../traffic/types';
import { tagEntries, groupByTag, builtinTagRules, TagRule } from '../traffic/tagger';

export function collectTagsFromEntries(
  entries: TrafficEntry[],
  rules: TagRule[] = builtinTagRules
): string[] {
  const tagged = tagEntries(entries, rules);
  const tagSet = new Set<string>();
  for (const entry of tagged) {
    for (const tag of entry.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

export function applyTagsToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[],
  rules: TagRule[] = builtinTagRules
): OpenAPIObject {
  const tagged = tagEntries(entries, rules);
  const byTag = groupByTag(tagged);

  const topLevelTags = Object.keys(byTag).map((tag) => ({ name: tag }));
  const existingTagNames = new Set((doc.tags ?? []).map((t) => t.name));
  const newTags = topLevelTags.filter((t) => !existingTagNames.has(t.name));

  const updatedDoc: OpenAPIObject = {
    ...doc,
    tags: [...(doc.tags ?? []), ...newTags],
  };

  if (!updatedDoc.paths) return updatedDoc;

  const paths = { ...updatedDoc.paths };

  for (const [tag, taggedEntries] of Object.entries(byTag)) {
    for (const entry of taggedEntries) {
      const pathItem = paths[entry.path];
      if (!pathItem) continue;
      const method = entry.method.toLowerCase() as keyof typeof pathItem;
      const operation = pathItem[method] as OperationObject | undefined;
      if (!operation) continue;
      const existingTags: string[] = operation.tags ?? [];
      if (!existingTags.includes(tag)) {
        (pathItem[method] as OperationObject) = {
          ...operation,
          tags: [...existingTags, tag],
        };
      }
    }
  }

  return { ...updatedDoc, paths };
}
