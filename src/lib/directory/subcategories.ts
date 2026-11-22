export type CategoryNode = { id: string; name: string; parent_id: string | null; visibility: string };

export function subcategoriesFor(rows: CategoryNode[], parentId: string) {
  return rows.filter((c) => c.parent_id === parentId && c.visibility !== "retired");
}

export function validSubcategory(row: Pick<CategoryNode, "parent_id" | "visibility"> | null, parentId: string) {
  return row !== null && row.parent_id === parentId && row.visibility !== "retired";
}