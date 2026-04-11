## 1. `tsp init`

При инициализации бери шаблон REST API, чтобы у тебя сразу была нормальная структура под HTTP-контракт.

## 2. Сразу зафиксировать границы MVP

До написания кода в `.tsp` определи, что **входит**, а что **не входит** в первую версию.

Для твоего случая хороший MVP такой:

Входит:

* `EventType`
* `Slot`
* `Booking`
* публичное получение event type по `slug`
* получение слотов
* создание бронирования
* отмена бронирования

Пока не входит:

* collective
* round-robin
* recurring bookings
* routing forms
* workflows/webhooks
* полноценное управление командой

То есть в контракте ты можешь **сразу предусмотреть поля** вроде `bookingMode`, но реально в MVP поддерживать только `oneOnOne`.

---

## 3. Не начинай с эндпоинтов. Начни с доменной модели

Сначала опиши основные сущности как модели.

Я бы шел в таком порядке:

### Сначала:

* `User`
* `EventType`
* `Booking`

### Потом:

* `AvailabilityRule`
* `Slot`

Почему так:

* `Slot` обычно вычисляемая сущность
* она зависит от `EventType`, availability и bookings
* поэтому ее удобнее описывать после базовых моделей

---

## 4. Затем опиши enums

Это очень помогает сразу сделать контракт аккуратным.

Например:

* `LocationType`
* `BookingMode`
* `BookingStatus`

Примерно такие:

* `googleMeet`
* `zoom`
* `phone`
* `inPerson`
* `customLink`

и

* `oneOnOne`
* `collective`
* `roundRobin`

и

* `confirmed`
* `cancelled`
* `rescheduled`

Даже если часть значений пока не реализуется, контракт уже будет выглядеть взросло.

---

## 5. Потом опиши request/response модели отдельно

Это важный шаг. Новички часто делают ошибку: используют одну и ту же модель и для хранения, и для API-запросов.

Лучше разделять:

* `CreateEventTypeRequest`
* `EventType`
* `CreateBookingRequest`
* `Booking`
* `CancelBookingRequest`
* `ListSlotsQuery`

Почему это хорошо:

* контракт становится яснее
* проще валидировать поля
* меньше ломается при изменениях

---

## 6. Только после этого переходи к операциям

Я бы добавлял их именно в таком порядке:

### Шаг 1. Event types

* `POST /event-types`
* `GET /event-types`
* `GET /event-types/{id}`
* `GET /public/event-types/{slug}`

### Шаг 2. Slots

* `GET /slots?eventTypeId=...&start=...&end=...&timeZone=...`

### Шаг 3. Bookings

* `POST /bookings`
* `GET /bookings/{id}`
* `POST /bookings/{id}/cancel`

### Шаг 4. Если останутся силы

* `PATCH /bookings/{id}` для reschedule

---

## 7. Сначала делай happy path, потом ошибки

То есть сначала опиши успешные ответы:

* `201 Created`
* `200 OK`

А уже потом добавь типовые ошибки:

* `400 Bad Request`
* `404 Not Found`
* `409 Conflict` — очень полезен для бронирования, если слот уже занят

Для твоего проекта `409 Conflict` почти точно нужен.

---

## 8. После каждой законченной части компилируй контракт

Не жди, пока напишешь все.

Рабочий ритм такой:

* добавил enums
* `tsp compile .`
* добавил `EventType`
* `tsp compile .`
* добавил `POST /event-types`
* `tsp compile .`

Так ты быстрее поймаешь ошибки в синтаксисе и аннотациях.

---

## 9. Потом сгенерируй OpenAPI и проверь контракт глазами фронтендера

Когда будет готов первый набор:

* event types
* slots
* bookings

посмотри на контракт как будто ты фронтенд-разработчик:

* понятно ли, какие поля обязательные
* понятны ли ответы
* достаточно ли данных для UI
* нет ли двусмысленностей в статусах и датах

---

## 10. Уже потом раскладывай `.tsp` по файлам

На старте можно даже сделать все в одном `main.tsp`, но как только структура станет понятной, лучше разнести.

Например:

* `main.tsp`
* `models/user.tsp`
* `models/event-type.tsp`
* `models/booking.tsp`
* `models/slot.tsp`
* `routes/event-types.tsp`
* `routes/bookings.tsp`
* `routes/slots.tsp`
* `common/enums.tsp`

---

## Я бы рекомендовал тебе следующий практический маршрут

После `tsp init`:

### Шаг 1

Создай минимальный каркас:

* namespace сервиса
* imports
* service title

### Шаг 2

Опиши enums:

* `LocationType`
* `BookingMode`
* `BookingStatus`

### Шаг 3

Опиши модели:

* `User`
* `EventType`
* `Booking`
* `AvailabilityRule`
* `Slot`

### Шаг 4

Опиши request/response DTO:

* `CreateEventTypeRequest`
* `CreateBookingRequest`
* `CancelBookingRequest`

### Шаг 5

Опиши первые 3 операции:

* `POST /event-types`
* `GET /public/event-types/{slug}`
* `GET /slots`

### Шаг 6

Добавь:

* `POST /bookings`
* `GET /bookings/{id}`
* `POST /bookings/{id}/cancel`

### Шаг 7

Добавь ошибки и статусы ответа

---

## Что бы я делал на твоем месте прямо сейчас

Не распылялся бы на все сущности сразу.
Первый инкремент сделал бы такой:

1. `EventType`
2. `GET /public/event-types/{slug}`
3. `GET /slots`
4. `POST /bookings`

Это уже почти полный публичный booking flow.

---

## Очень важное решение для тебя сейчас

Тебе нужно выбрать один из двух подходов:

### Вариант А. Сначала описать только публичный flow

* публичный event type
* слоты
* booking

Плюс:

* быстрее
* ближе к главной пользовательской ценности

### Вариант Б. Сначала описать кабинет организатора

* создание event type
* список event types
* availability

Плюс:

* логичнее с точки зрения домена

Для учебного проекта я бы выбрал **сначала публичный flow**, а потом кабинет организатора.

---

## Мой совет в одной фразе

После `tsp init` делай не “все модели сразу”, а **один сквозной сценарий целиком**:
`public event type -> slots -> booking`.

Это даст тебе первый живой контракт очень быстро.