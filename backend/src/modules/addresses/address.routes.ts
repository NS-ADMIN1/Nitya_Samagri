// src/modules/addresses/address.routes.ts
//
// A customer's saved delivery addresses. Every route needs a login.
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { IdParamSchema } from "../../utils/validators";
import { AddressCreateSchema, AddressUpdateSchema } from "./address.schema";
import * as addressController from "./address.controller";

const router = Router();

router.use(authenticate);

router.get("/",       addressController.list);
router.get("/:id",    validate(IdParamSchema, "params"), addressController.getOne);
router.post("/",      validate(AddressCreateSchema), addressController.create);
router.patch("/:id",  validate(IdParamSchema, "params"), validate(AddressUpdateSchema), addressController.update);
router.delete("/:id", validate(IdParamSchema, "params"), addressController.remove);

export default router;
