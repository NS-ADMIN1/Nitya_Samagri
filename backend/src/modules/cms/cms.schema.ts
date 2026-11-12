// src/modules/cms/cms.schema.ts
//
// The fields of each content kind are validated by its Mongoose schema
// (database/models/CmsContent.ts); only the URL parts are checked here.
import { z } from "zod";
import { objectId } from "../../utils/validators";

export const CmsItemParamsSchema = z.object({
  resource: z.string().min(1),
  id:       objectId(),
});
