export type JsonResponseOptions<TData = unknown, TAdditionalInfo = unknown> = {
  success: boolean;
  message?: string;
  data?: TData;
  additionalInfo?: TAdditionalInfo;
  error?: string;
};

export function getJsonResponse<TData = unknown, TAdditionalInfo = unknown>({
  success,
  message,
  data,
  additionalInfo,
  error,
}: JsonResponseOptions<TData, TAdditionalInfo>) {
  const response: {
    success: boolean;
    message?: string;
    data?: TData;
    additionalInfo?: TAdditionalInfo;
    error?: string;
  } = { success };

  if (message !== undefined) response.message = message;
  if (data !== undefined) response.data = data;
  if (additionalInfo !== undefined) response.additionalInfo = additionalInfo;
  if (error !== undefined) response.error = error;

  return response;
}
