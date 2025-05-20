# Discord Timestamp & Event Bot

A secure and feature-rich Discord bot for generating Discord timestamps, managing events with RSVP and reminders, and providing various time-related utilities.

## Features

**Timestamp Utilities:**
*   **`/timestamp`**: Generate versatile Discord timestamps.
    *   Flexible time input (e.g., "now", "3:14PM", "15:23", "YYYY-MM-DD HH:MM", Unix timestamps).
    *   Optional date and timezone inputs.
    *   Supports common timezone aliases (e.g., EST, PST, UTC).
    *   Choose from various Discord timestamp formats (Short Time, Long Time, Short Date, Long Date, Short Date/Time, Long Date/Time, Relative Time) or display all.
*   **`/now`**: Quickly get the current time in all Discord timestamp formats and as a Unix timestamp.
*   **`/in`**: Get a timestamp for a specified amount of time in the future (e.g., "/in 30 minutes", "/in 2 days").
*   **`/set-timezone`**: Set your default timezone for all timestamp conversions, stored securely.

**Event Management:**
*   **Event Creation:**
    *   **`/create-event`**: Create detailed events with name, time, description, date, timezone, location, max participants, a user to mention, and embed color. (Admin/Event Manager permissioned)
    *   **`/quick-event`**: Quickly create events with a combined name and time string (e.g., "Game Night tomorrow 8pm") and an optional user mention. (Admin/Event Manager permissioned)
*   **Event Interaction & Viewing:**
    *   **`/list-events`**: View all upcoming scheduled events.
    *   **`/event <id>`**: Show detailed information and RSVP options for a specific event.
    *   **RSVP System**: Buttons ("RSVP", "Cancel RSVP") allow users to join or leave events. Participant count and list are displayed.
*   **Event Administration:**
    *   **`/edit-event <id>`**: Modify details of an existing event. (Admin/Event Creator permissioned)
    *   **`/delete-event <id>`**: Remove an event. (Admin/Event Creator permissioned)
*   **Notifications & Reminders:**
    *   **Event Start Announcement**: When an event starts, a message is posted in the channel where the event was created, pinging all attendees.
    *   **Automated Reminders**: Participants receive DM reminders 1 day, 1 hour, and 30 minutes before an event starts.
    *   **`/force-reminder <event_id>`**: Manually trigger a reminder DM to all participants of an event. (Admin/Event Creator permissioned)
    *   **`/test-dm <event_id>`**: Allows a user to test if they can receive DMs from the bot for a specific event they are RSVP'd to.

**Security & Data Handling:**
*   **Encrypted Data Storage**: Event details (description, location, participants) and user timezone preferences are encrypted before being saved to JSON files (`events.json`, `user_data.json`).
*   **Secure Event IDs**: Event IDs are generated using cryptographically random bytes.
*   **Rate Limiting**: Basic rate limiting is in place to prevent command abuse.
*   **Input Sanitization**: User inputs are sanitized to mitigate potential risks.
*   **Automated Backups**: `events.json` is backed up regularly, with old backups being pruned.
*   **Error Handling**: Robust error handling for file operations and Discord API interactions.

## Prerequisites

*   Node.js (v16.x or higher recommended)
*   npm (usually comes with Node.js)
*   A Discord Bot Application (created via the [Discord Developer Portal](https://discord.com/developers/applications))

## Setup

1.  **Clone the Repository:**
    ```bash
    git clone <your-private-github-repo-url>
    cd discord-timestamp-bot
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Create Environment File:**
    Create a `.env` file in the root directory of the project. This file will store your bot's token and encryption key.
    ```
    TOKEN=your_discord_bot_token_here
    ENCRYPTION_KEY=your_32_byte_hex_encryption_key_here
    ```
    *   **`TOKEN`**: Your Discord bot token from the Discord Developer Portal.
    *   **`ENCRYPTION_KEY`**: A 32-byte (64-character hex string) random key for encrypting sensitive data. You can generate one using Node.js crypto:
        ```javascript
        // Run this in a Node.js console:
        // require('crypto').randomBytes(32).toString('hex')
        ```
        **Important**: Keep this key secret and backed up. Losing it will mean previously encrypted data cannot be decrypted.

4.  **Configure Bot Permissions & Intents (Discord Developer Portal):**
    Navigate to your application on the Discord Developer Portal:
    *   **Bot Page:**
        *   **Privileged Gateway Intents:**
            *   Enable "SERVER MEMBERS INTENT"
            *   Enable "MESSAGE CONTENT INTENT" (While this bot primarily uses slash commands, having it enabled can be useful for future features or debugging. If you are certain no message content is needed, you might be able to leave it off, but DMs and some user interactions sometimes benefit from it.)
        *   Note: The `DirectMessages` intent is implicitly handled by the bot's code when it needs to send DMs.
    *   **OAuth2 URL Generator:**
        *   Select the following **scopes**:
            *   `bot`
            *   `applications.commands`
        *   Select the necessary **Bot Permissions**. A good starting set includes:
            *   Send Messages
            *   Send Messages in Threads
            *   Embed Links
            *   Read Message History
            *   Mention @everyone, @here, and All Roles
            *   Manage Events
            *   View Channels
        *   Use the generated URL to invite your bot to your Discord server(s).

5.  **Data Directory:**
    The bot will automatically create a `data/` directory with `events.json`, `user_data.json`, and `data/backups/` if they don't exist on the first run.

## Running the Bot

```bash
npm start
```
This will start the bot using `node index.js` as defined in your `package.json`.

## Key Files

*   **`index.js`**: Main application code for the bot.
*   **`data/events.json`**: Stores event data (encrypted where necessary).
*   **`data/user_data.json`**: Stores user-specific data like timezone preferences (encrypted).
*   **`data/backups/`**: Contains timestamped backups of `events.json`.
*   **`.env`**: Stores your bot token and encryption key (this file should be in `.gitignore` and not committed).
*   **`package.json`**: Defines project dependencies and scripts.

## Contributing

This is a private repository. For modifications, clone the repository and make changes in your local environment.

## License

This project is licensed under the [ISC License](LICENSE).