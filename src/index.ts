import "./types/express.js";

export { checkAuth } from "./middlewares/checkAuth.js";
export { checkRole } from "./middlewares/checkRole.js";
export { validationMiddleware } from "./middlewares/validationMiddleware.js";

export { validRoles } from "./constants/validRoles.js";
export type { Role } from "./constants/validRoles.js";

export { AppError } from "./errors/AppError.js";
export { globalErrorHandler } from "./errors/globalErrorHandler.js";
export { handlePrismaError } from "./errors/handlePrismaError.js";

export { getErrorMsg } from "./utils/getErrorMsg.js";
export { getSuccessMsg } from "./utils/getSuccessMsg.js";
export { getJsonResponse } from "./utils/getJsonResponse.js";
export type { JsonResponseOptions } from "./utils/getJsonResponse.js";

export {
  requiredFieldMsg,
  minLengthMsg,
  maxLengthMsg,
  invalidSchemaFormatMsg,
  invalidEmailMsg,
  invalidPasswordMsg,
  invalidDateFormatMsg,
  futureDateRequiredMsg,
  invalidNumberMsg,
  positiveNumberMsg,
  invalidUrlMsg,
} from "./utils/validationErrorMessages.js";

export type { ClerkUser } from "./types/ClerkUser.js";
