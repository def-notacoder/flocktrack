export function formatBirdOrigin(origin: string, originDetail?: string | null) {
  if (origin === "OTHER" && originDetail?.trim()) return originDetail.trim();
  return origin.replace(/_/g, " ");
}
