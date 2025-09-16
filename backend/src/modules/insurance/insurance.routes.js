import { Router } from "express";
import { InsuranceController } from "./insurance.controller.js";
import { authGuard } from "../../core/middlewares/auth.guard.js";

const r = Router();

// thêm thẻ cho bệnh nhân + tự map soBHYT
r.post("/patients/:idBenhNhan/bhyt", authGuard(false), InsuranceController.addCard);

// cập nhật thẻ; ?setActive=true để đặt làm thẻ hiện hành
r.patch("/insurance/cards/:idBHYT", authGuard(false), InsuranceController.updateCard);

// liệt kê thẻ của 1 BN
r.get("/patients/:idBenhNhan/bhyt", authGuard(false), InsuranceController.listByPatient);

export default r;
