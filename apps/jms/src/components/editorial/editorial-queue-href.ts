export type EditorialQueueHrefInput = {
  status?: string;
  pipeline?: string;
  attention?: "overdue";
};

export function editorialQueueHref(
  input: EditorialQueueHrefInput = {},
): string {
  const params = new URLSearchParams();
  if (input.status) {
    params.set("status", input.status);
  } else if (input.pipeline) {
    params.set("pipeline", input.pipeline);
  }
  if (input.attention) {
    params.set("attention", input.attention);
  }
  const query = params.toString();
  return query ? `/editorial/submissions?${query}` : "/editorial/submissions";
}
