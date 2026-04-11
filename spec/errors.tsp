import "@typespec/http";

using Http;

namespace CallPlanner;

@error
model BadRequestError {
  @statusCode
  statusCode: 400;

  code: "bad_request";
  message: string;
}

@error
model NotFoundError {
  @statusCode
  statusCode: 404;

  code: "not_found";
  message: string;
}

@error
model ConflictError {
  @statusCode
  statusCode: 409;

  code: "conflict";
  message: string;
}
