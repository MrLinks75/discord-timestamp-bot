# Discord Timestamp & Event Bot

A secure Discord bot for generating timestamps and managing events with timezone support. Perfect for communities spanning multiple regions, gaming groups, and any server that needs to coordinate activities.

## Features

- Generate timestamps in any format Discord supports
- Convert times to/from any timezone
- Create and manage events with an RSVP system
- Automatic event reminders
- User-specific timezone settings
- Secure data storage with encryption

## Installation

1. Ensure you have Node.js v16.9.0 or newer installed

2. Clone this repository
   git clone https://github.com/yourusername/discord-timestamp-bot.git
   cd discord-timestamp-bot

Install dependencies
bashnpm install

Create a Discord application and bot

Go to the Discord Developer Portal
Create a new application and add a bot
Enable SERVER MEMBERS INTENT under "Privileged Gateway Intents"
Copy your bot token


Set up configuration
bashcp .env.example .env
# Edit .env with your bot token

Generate an encryption key
bashnode -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add this key to your .env file

Start the bot
bashnpm start

Invite the bot to your server

Use the OAuth2 URL Generator in the Developer Portal
Select scopes: bot, applications.commands
Select permissions: Send Messages, Embed Links, Use External Emojis, Read Message History, Add Reactions, Use Slash Commands


Usage
Timestamp Commands

/timestamp time:3:14PM - Generate a timestamp
/set-timezone timezone:America/New_York - Set your default timezone
/now - Get current timestamp in all formats
/in amount:2 unit:hours - Get timestamp for 2 hours from now

Event Commands

/create-event name:Game Night time:8pm - Create a new event (Admin only)
/quick-event name_and_time:Game Night tomorrow 8pm - Quickly create an event (Admin only)
/list-events - List all upcoming events
/event id:ABC123 - View a specific event
/delete-event id:ABC123 - Delete an event (Admin only)
/edit-event id:ABC123 time:9pm - Modify an event (Admin only)

Time Format Examples
The bot understands many time formats:

Standard times: 3:14PM, 15:23
Times without separator: 1520 (for 15:20)
AM/PM variations: 3PM, 3 PM, 3:14am
Special keywords: now, today, tomorrow
Combined formats: tomorrow 8pm, 3pm Friday
Relative times: in 2 hours
ISO dates: 2023-05-20 15:30
Unix timestamps: 1667219160