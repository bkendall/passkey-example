# Passkey Authentication Example

This project demonstrates a simple implementation of Passkey authentication (WebAuthn) using Node.js, Express, and the `@simplewebauthn` library. It provides a basic frontend to register and log in users using biometric authentication (Touch ID, Face ID, Windows Hello, etc.) or security keys.

## Features

- **User Registration**: Register a new user and associate a Passkey authenticator.
- **User Login**: Log in using a registered Passkey.
- **Session Management**: Simple session management using cookies.
- **In-Memory Storage**: Uses `lru-cache` for storing user data and authentication challenges (Note: Data is lost when the server restarts).
- **Static Resource Caching**: Static assets in `public/` are cached for 5 minutes.

## Tech Stack

- **Backend**: Node.js, Express
- **WebAuthn Library**: [@simplewebauthn/server](https://simplewebauthn.dev/docs/packages/server)
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Frontend WebAuthn**: [@simplewebauthn/browser](https://simplewebauthn.dev/docs/packages/browser) (loaded via CDN)

## Prerequisites

- **Node.js**: Version 24 or higher (as specified in `package.json`).

## Installation

1.  Clone the repository:

    ```bash
    git clone <repository-url>
    cd passkey-example
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  (Optional) Configure environment variables:
    Copy `.env.example` to `.env` and adjust as needed.
    ```bash
    cp .env.example .env
    ```

## Configuration

The application can be configured using environment variables:

- `PORT`: The port the server listens on (default: `3000`).
- `RP_ID`: The Relying Party ID, effectively the hostname (default: `localhost`).
- `EXPECTED_ORIGIN`: The expected origin for WebAuthn requests (default: `http://localhost:3000`).

## Development

- **Format Code**:
  ```bash
  npm run format
  ```

## Usage

1.  Start the server:

    ```bash
    node server.js
    ```

    The server will start on `http://localhost:3000` (or the port specified in the `PORT` environment variable).

2.  Open your browser and navigate to `http://localhost:3000`.

3.  **Register**:
    - Enter a username in the "Register" section.
    - Click "Register".
    - Follow the browser's prompts to create a Passkey (e.g., scan your fingerprint or use Face ID).

4.  **Login**:
    - Enter the same username in the "Login" section.
    - Click "Login".
    - Follow the browser's prompts to authenticate with your Passkey.

## Project Structure

- `server.js`: Main Express server file handling API routes and WebAuthn logic.
- `public/`: Contains static frontend files.
  - `index.html`: The main HTML page.
  - `client.js`: Frontend logic for handling UI and WebAuthn calls.
  - `style.css`: Basic styling.

## Important Notes

- **Data Persistence**: This example uses in-memory storage (`lru-cache`) for simplicity. **All user data and registered credentials will be lost if you restart the server.** For a production application, you should use a persistent database (e.g., MongoDB, PostgreSQL).
- **Security**: This is a demonstration project. In a production environment, ensure you serve the application over HTTPS (WebAuthn requires a secure context, although `localhost` is treated as secure for development).

## Deployment

This project is configured for deployment on **Google Cloud App Hosting**.

- See `apphosting.prod.yaml` for configuration details.
- Ensure environment variables (`RP_ID`, `EXPECTED_ORIGIN`) are set correctly in your deployment environment to match your production domain.
