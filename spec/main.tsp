import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";
import "@typespec/rest";

import "./errors.tsp";
import "./models.tsp";
import "./routes.tsp";

using Http;

@service(#{ title: "Call Planner API" })
namespace CallPlanner;
