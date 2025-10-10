import { Router } from "express";
import authRouter from "./modules/auth/index.js";
import insuranceRouter from "./modules/insurance/insurance.routes.js";
import patientRouter from "./modules/patient/patient.routes.js";
import specialtyRouter from "./modules/specialty/specialty.routes.js";
import clinicRouter from "./modules/clinic/clinic.routes.js";
import doctorRouter from "./modules/doctor/doctor.routes.js";
import workshiftRoutes from "./modules/workshift/workshift.routes.js";
import scheduleRouter from "./modules/schedule/schedule.routes.js"
import appointmentRoutes from "./modules/appointment/appointment.routes.js"
import paymentRoutes from "./modules/payment/payment.router.js"
import userRoutes from "./modules/users/users.routes.js"
const api = Router();

// /api/v1/auth/...
api.use("/auth", authRouter);

// /api/v1/patients/... ; /api/v1/insurance/cards/...
api.use("/", insuranceRouter);
api.use("/", patientRouter);
api.use("/", specialtyRouter);
api.use("/", clinicRouter);
api.use("/", doctorRouter);
api.use("/", workshiftRoutes);
api.use("/", scheduleRouter);
api.use("/", appointmentRoutes);
api.use("/", paymentRoutes);
api.use("/", userRoutes);

export default api;
