import "@typespec/http";

using Http;

namespace CallPlanner;

@route("/event-types")
@tag("Event Types")
interface EventTypes {
  /**
   * Owner-facing operation.
   * Creates a new event type with a positive duration.
   */
  @post
  create(@body body: CreateEventTypeRequest): EventTypeCreatedResponse | BadRequestError;

  /**
   * Guest-facing and owner-facing operation.
   * Returns the list of bookable event types.
   */
  @get
  list(): EventTypeListResponse;

  /**
   * Guest-facing operation.
   * Returns only free slots for the selected event type during the next 14 days.
   * Returned slots are already aligned to the event type duration.
   */
  @get
  @route("/{eventTypeId}/availability")
  getAvailability(@path eventTypeId: string): AvailabilityResponse | NotFoundError;
}

@route("/bookings")
@tag("Bookings")
interface Bookings {
  /**
   * Guest-facing operation.
   * Creates a booking for a free interval that matches the selected event type duration.
   * The same interval cannot be booked twice, even across different event types.
   */
  @post
  create(
    @body body: CreateBookingRequest,
  ): BookingCreatedResponse | BadRequestError | NotFoundError | ConflictError;

  /**
   * Owner-facing operation.
   * Returns both active and cancelled bookings to preserve history.
   */
  @get
  list(): BookingListResponse;

  /**
   * Owner-facing and guest-facing operation.
   * Changes the booking status to cancelled instead of deleting the booking.
   * Cancelling a booking makes its interval available again.
   */
  @post
  @route("/{bookingId}:cancel")
  cancel(@path bookingId: string): BookingResponse | NotFoundError | ConflictError;
}
