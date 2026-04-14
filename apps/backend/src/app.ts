import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";

import { InMemoryBookingRepository } from "./repositories/inMemoryBookingRepository.js";
import { InMemoryEventTypeRepository } from "./repositories/inMemoryEventTypeRepository.js";
import { InMemoryScheduleRepository } from "./repositories/inMemoryScheduleRepository.js";
import { registerBookingRoutes } from "./routes/bookingRoutes.js";
import { registerEventTypeRoutes } from "./routes/eventTypeRoutes.js";
import { registerScheduleRoutes } from "./routes/scheduleRoutes.js";
import { BookingService } from "./services/bookingService.js";
import { EventTypeService } from "./services/eventTypeService.js";
import { ScheduleService } from "./services/scheduleService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultFrontendDistDir = path.resolve(__dirname, "../../frontend/dist");

type CreateAppOptions = {
  frontendDistDir?: string;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = Fastify({ logger: false });
  const scheduleRepository = new InMemoryScheduleRepository();
  const eventTypeRepository = new InMemoryEventTypeRepository();
  const bookingRepository = new InMemoryBookingRepository();
  const scheduleService = new ScheduleService(scheduleRepository);
  const eventTypeService = new EventTypeService(eventTypeRepository, bookingRepository);
  const bookingService = new BookingService(bookingRepository, eventTypeRepository, scheduleRepository);

  registerScheduleRoutes(app, scheduleService);
  registerEventTypeRoutes(app, eventTypeService);
  registerBookingRoutes(app, bookingService);
  registerFrontendRoutes(app, options.frontendDistDir ?? defaultFrontendDistDir);

  return app;
}

function registerFrontendRoutes(app: FastifyInstance, frontendDistDir: string) {
  if (!existsSync(frontendDistDir)) {
    return;
  }

  app.register(fastifyStatic, {
    root: frontendDistDir,
    prefix: "/",
    index: false,
    wildcard: false,
  });

  app.get("/", async (_, reply) => reply.sendFile("index.html"));

  app.get("/*", async (request, reply) => {
    if (isApiRoute(request.url) || path.posix.extname(request.url)) {
      return reply.code(404).send();
    }

    return reply.sendFile("index.html");
  });
}

function isApiRoute(url: string): boolean {
  return (
    url === "/schedule" ||
    url.startsWith("/schedule/") ||
    url === "/event-types" ||
    url.startsWith("/event-types/") ||
    url === "/bookings" ||
    url.startsWith("/bookings/") ||
    url === "/owner/event-types" ||
    url.startsWith("/owner/event-types/")
  );
}
