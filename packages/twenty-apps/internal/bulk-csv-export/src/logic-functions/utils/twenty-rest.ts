import {
  RestApiClient,
  RestApiClientError,
} from 'twenty-client-sdk/rest';

export type PageInfo = {
  hasNextPage?: boolean;
  endCursor?: string | null;
};

type ListResponse<T> = {
  data?: Record<string, T[]>;
  totalCount?: number;
  pageInfo?: PageInfo;
};

type OneResponse<T> = {
  data?: Record<string, T>;
};

const client = () => new RestApiClient();

export const errorMessage = (error: unknown): string => {
  if (error instanceof RestApiClientError) {
    const body = error.body;

    if (body && typeof body === 'object') {
      const messages = (body as { messages?: unknown; message?: unknown })
        .messages;

      if (Array.isArray(messages) && messages.length > 0) {
        return messages.map(String).join(' ');
      }

      if (typeof (body as { message?: unknown }).message === 'string') {
        return (body as { message: string }).message;
      }
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Export failed.';
};

export const restGetOne = async <T>(
  path: string,
  recordKey: string,
): Promise<T> => {
  const response = await client().get<OneResponse<T>>(path, {
    query: { depth: 0 },
  });
  const record = response.data?.[recordKey];

  if (!record) {
    throw new Error(`Record ${recordKey} was not returned by ${path}.`);
  }

  return record;
};

export const restList = async <T>(
  path: string,
  recordKey: string,
  query: Record<string, string | number | undefined>,
): Promise<{ records: T[]; totalCount: number; pageInfo: PageInfo }> => {
  const response = await client().get<ListResponse<T>>(path, { query });

  return {
    records: response.data?.[recordKey] ?? [],
    totalCount: response.totalCount ?? 0,
    pageInfo: response.pageInfo ?? {},
  };
};

export const restCreate = async <T>(
  path: string,
  recordKey: string,
  body: Record<string, unknown>,
): Promise<T> => {
  const response = await client().post<OneResponse<T>>(path, body);
  const record = response.data?.[recordKey];

  if (!record) {
    throw new Error(`Create ${recordKey} was not returned by ${path}.`);
  }

  return record;
};

export const restPatch = async <T>(
  path: string,
  recordKey: string,
  body: Record<string, unknown>,
): Promise<T> => {
  const response = await client().patch<OneResponse<T>>(path, body);
  const record = response.data?.[recordKey];

  if (!record) {
    throw new Error(`Update ${recordKey} was not returned by ${path}.`);
  }

  return record;
};
