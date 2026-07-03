import { Hono } from "hono";
import type { HonoContextWithAuthAndOrg } from "../../types";
import productsRoute from "./products";
import searchRoute from "./search";
import uploadsRoute from "./uploads";

const catalogRoutes = new Hono<HonoContextWithAuthAndOrg>()
  .route("/products", productsRoute)
  .route("/search", searchRoute)
  .route("/uploads", uploadsRoute);

export default catalogRoutes;
