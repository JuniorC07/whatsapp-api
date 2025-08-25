# WhatsApp Messaging API

This is a simple API built with **Node.js**, **Express**, **MongoDB**, and **Baileys** that allows you to authenticate a WhatsApp session via QR Code and send messages (text and/or images) to phone numbers in E.164 format.

---

## Requirements

* [Node.js](https://nodejs.org/) >= 18
* [MongoDB](https://www.mongodb.com/) running locally or remotely

---

## Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd whatsapp-api
   ```
2. Install dependencies:

   ```bash
   npm install
   ```
3. Create a `.env` file in the project root and configure environment variables (see below).
4. Run the server:

   ```bash
   npm run dev
   ```

---

## Environment Variables

Example `.env` file:

```env
APP_ENV=dev

DB_LOG=false
DB_STRING_CONNECTION=mongodb://<user>:<pass>@<server>:<port>?authMechanism=DEFAULT
DB_DATABASE=<database>
```

---

## API Documentation

Swagger documentation is available after starting the server:
👉 [http://localhost:3000/docs](http://localhost:3000/docs)

This provides details about available endpoints, input parameters, and responses.

---

## Endpoints

### 🔹 Health Check

`GET /healthz`
Checks if the API is running.

---

### 🔹 Get WhatsApp QR Code

`GET /whatsapp/qr`
Returns a QR code image (PNG/Base64) to authenticate the WhatsApp session.

---

### 🔹 Send WhatsApp Message

`POST /whatsapp/messages`
Sends a WhatsApp message with **text** and/or **image**.

**Body (multipart/form-data):**

* `phoneNumber` (string, required) – Phone number in E.164 format, e.g., `554999999999`
* `text` (string, required) – Message text
* `image` (file, optional) – Image file (JPG, PNG, WEBP, GIF)

---

The API will be available at [http://localhost:3000](http://localhost:3000).
API documentation: [http://localhost:3000/docs](http://localhost:3000/docs).

---

⚡ With this API you can:

* Authenticate a WhatsApp session via QR Code.
* Send text messages.
* Send images with captions (saved in `./uploads`).

---

## Docker & Docker-Compose

You can also run the API and MongoDB with **Docker Compose** without installing Node.js or MongoDB locally:

```bash
docker compose up -d --build
```

This will start two containers:

* **`whatsapp-api`** → Node.js application running on [http://localhost:3000](http://localhost:3000)
* **`mongo`** → MongoDB database running on `mongo:27017` (internal network)

Uploaded files are stored in `./uploads` (mapped as a volume).
MongoDB data is persisted in a Docker volume (`mongo_data`) so data is not lost when containers are restarted.

View logs:

```bash
docker compose logs -f api
docker compose logs -f mongo
```

Stop and remove containers:

```bash
docker compose down
```

---

## Testing

This project uses **Jest** with **ESM**. The available scripts are:

```json
"test": "NODE_OPTIONS=--experimental-vm-modules jest --runInBand --reporter=lcov --forceExit",
"test:coverage": "NODE_OPTIONS=--experimental-vm-modules jest --runInBand --coverage --reporter=lcov --forceExit",
"test:debug": "NODE_OPTIONS=--experimental-vm-modules node --inspect-brk node_modules/.bin/jest --runInBand --reporter=lcov --watchAll test/unit"
```

### Run tests

Run tests locally (outside Docker, since `devDependencies` are not installed in the production image):

```bash
npm test
```

Run with coverage report:

```bash
npm run test:coverage
```

The HTML coverage report will be generated at:
`coverage/lcov-report/index.html`

### Debugging tests

Run tests with Node.js Inspector enabled:

```bash
npm run test:debug
```

You can set breakpoints and step through the tests.

