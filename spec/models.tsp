import "@typespec/http";

using Http;

namespace CallPlanner;

enum BookingStatus {
  active,
  cancelled,
}

model EventType {
  id: string;
  title: string;
  description?: string;
  @minValue(1)
  durationMinutes: int32;
}

model AvailableSlot {
  startAt: utcDateTime;
  endAt: utcDateTime;
}

model Booking {
  id: string;
  eventTypeId: string;
  startAt: utcDateTime;
  endAt: utcDateTime;
  guestName: string;
  guestEmail: string;
  status: BookingStatus;
}

model CreateEventTypeRequest {
  title: string;
  description?: string;
  @minValue(1)
  durationMinutes: int32;
}

model CreateBookingRequest {
  eventTypeId: string;
  startAt: utcDateTime;
  endAt: utcDateTime;
  guestName: string;
  guestEmail: string;
}

model EventTypeCreatedResponse {
  @statusCode
  statusCode: 201;

  @body
  body: EventType;
}

model EventTypeListResponse {
  @statusCode
  statusCode: 200;

  @body
  body: EventType[];
}

model AvailabilityResponse {
  @statusCode
  statusCode: 200;

  @body
  body: AvailableSlot[];
}

model BookingCreatedResponse {
  @statusCode
  statusCode: 201;

  @body
  body: Booking;
}

model BookingListResponse {
  @statusCode
  statusCode: 200;

  @body
  body: Booking[];
}

model BookingResponse {
  @statusCode
  statusCode: 200;

  @body
  body: Booking;
}
