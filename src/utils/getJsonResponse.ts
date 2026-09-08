export type JsonResponseOptions<TData = unknown, TAdditionalInfo = unknown> = {
  message?: string;
  data?: TData;
  additionalInfo?: TAdditionalInfo;
  error?: string;
};

export function getJsonResponse<TData = unknown, TAdditionalInfo = unknown>({
  message,
  data,
  additionalInfo,
  error,
}: JsonResponseOptions<TData, TAdditionalInfo>) {
  const response: {
    message?: string;
    data?: TData;
    additionalInfo?: TAdditionalInfo;
    error?: string;
  } = {};

  if (message !== undefined) response.message = message;
  if (data !== undefined) response.data = data;
  if (additionalInfo !== undefined) response.additionalInfo = additionalInfo;
  if (error !== undefined) response.error = error;

  return response;
}
