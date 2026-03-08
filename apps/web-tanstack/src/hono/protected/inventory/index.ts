import { Hono } from "hono";
import type { HonoContextWithAuth } from "../../types";
import metricsRoute from "./metrics";
import movementsRoute from "./movements";
import productsRoute from "./products";
import searchRoute from "./search";
import warehousesRoute from "./warehouses";

const inventoryRoutes = new Hono<HonoContextWithAuth>()
  .route("/products", productsRoute)
  .route("/warehouses", warehousesRoute)
  .route("/search", searchRoute)
  .route("/metrics", metricsRoute)
  .route("/movements", movementsRoute);

export default inventoryRoutes;
