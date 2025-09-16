import { Router } from "express";
import adminRoutes from "./admin/admin.routes.js";
import doctorRoutes from "./doctor/doctor.routes.js";
import patientRoutes from "./patient/patient.routes.js";

const authRouter = Router();
authRouter.use("/admin", adminRoutes);
authRouter.use("/doctor", doctorRoutes);
authRouter.use("/patient", patientRoutes);

export default authRouter;
