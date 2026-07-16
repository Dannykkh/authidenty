import { z } from "zod";

export type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const apiErrorSchema = z.object({
  message: z.string().min(1).max(240).optional(),
});

export class ApiResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiResponseError";
  }
}

export async function postJson<T>(
  path: string,
  body: unknown,
  responseSchema: z.ZodType<T>,
  fetcher: Fetcher = fetch,
): Promise<T> {
  const response = await fetcher(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let responseBody: unknown;

  try {
    responseBody = await response.json();
  } catch {
    throw new ApiResponseError("The server returned an unexpected response.");
  }

  if (!response.ok) {
    const errorBody = apiErrorSchema.safeParse(responseBody);
    throw new ApiResponseError(
      errorBody.success && errorBody.data.message
        ? errorBody.data.message
        : "The request could not be completed.",
    );
  }

  const parsed = responseSchema.safeParse(responseBody);

  if (!parsed.success) {
    throw new ApiResponseError("The server returned an unexpected response.");
  }

  return parsed.data;
}
