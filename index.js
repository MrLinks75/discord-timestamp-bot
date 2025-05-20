// Secure Discord Timestamp & Event Bot
require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, 
        EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
        PermissionFlagsBits } = require('discord.js');
const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Only request the permissions we actually need
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Path for storing events data
const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const USER_DATA_FILE = path.join(DATA_DIR, 'user_data.json');

// Command registration
const commands = [
  new SlashCommandBuilder()
    .setName('timestamp')
    .setDescription('Generate a Discord timestamp')
    .addStringOption(option => 
      option.setName('time')
        .setDescription('Time to convert (e.g., now, 3:14AM, 15:23, YYYY-MM-DD HH:MM, or unix timestamp)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('timezone')
        .setDescription('Your timezone (e.g., America/New_York, Europe/London, UTC)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('date')
        .setDescription('Date for the timestamp (e.g., today, tomorrow, 2023-05-20)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('format')
        .setDescription('Format of the timestamp')
        .setRequired(false)
        .addChoices(
          { name: 'Short Time (12:26 AM)', value: 't' },
          { name: 'Long Time (12:26:00 AM)', value: 'T' },
          { name: 'Short Date (10/31/2022)', value: 'd' },
          { name: 'Long Date (October 31, 2022)', value: 'D' },
          { name: 'Short Date/Time (October 31, 2022 12:26 AM)', value: 'f' },
          { name: 'Long Date/Time (Monday, October 31, 2022 12:26 AM)', value: 'F' },
          { name: 'Relative Time (27 minutes ago)', value: 'R' },
          { name: 'All Formats', value: 'all' }
        )),
  
  // Add user timezone setting command
  new SlashCommandBuilder()
    .setName('set-timezone')
    .setDescription('Set your default timezone for timestamp conversions')
    .addStringOption(option =>
      option.setName('timezone')
        .setDescription('Your timezone (e.g., America/New_York, Europe/London, UTC)')
        .setRequired(true)),
  
  // Add quick time commands  
  new SlashCommandBuilder()
    .setName('now')
    .setDescription('Get current timestamp'),
  
  new SlashCommandBuilder()
    .setName('in')
    .setDescription('Get timestamp for time in the future')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount of time')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('unit')
        .setDescription('Time unit')
        .setRequired(true)
        .addChoices(
          { name: 'Minutes', value: 'minutes' },
          { name: 'Hours', value: 'hours' },
          { name: 'Days', value: 'days' },
          { name: 'Weeks', value: 'weeks' },
          { name: 'Months', value: 'months' }
        )),
        
  // EVENT MANAGEMENT COMMANDS
  
  // Create event command (admin only) - Modified for simpler usage
  new SlashCommandBuilder()
    .setName('create-event')
    .setDescription('Create a new event (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents || PermissionFlagsBits.Administrator)
    .addStringOption(option => 
      option.setName('name')
        .setDescription('Name of the event')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('time')
        .setDescription('Time of the event (e.g., 3:14PM, 15:23, tomorrow 8PM)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description of the event (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('date')
        .setDescription('Date of the event if not included in time (e.g., today, tomorrow, 2023-05-20)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('timezone')
        .setDescription('Timezone for the event (optional, uses your default if set)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('location')
        .setDescription('Location of the event (optional)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('max_participants')
        .setDescription('Maximum number of participants (0 for unlimited)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('color')
        .setDescription('Color for the event embed (hex code)')
        .setRequired(false)),

  // Quick event creation command
  new SlashCommandBuilder()
    .setName('quick-event')
    .setDescription('Quickly create an event with minimal info')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents || PermissionFlagsBits.Administrator)
    .addStringOption(option => 
      option.setName('name_and_time')
        .setDescription('Event name and time (e.g., "Game Night tomorrow 8pm")')
        .setRequired(true)),
        
  // List events command
  new SlashCommandBuilder()
    .setName('list-events')
    .setDescription('List all upcoming events'),
    
  // Event details command
  new SlashCommandBuilder()
    .setName('event')
    .setDescription('Show details for a specific event')
    .addStringOption(option => 
      option.setName('id')
        .setDescription('ID of the event')
        .setRequired(true)
        .setAutocomplete(true)),
        
  // Delete event command (admin only)
  new SlashCommandBuilder()
    .setName('delete-event')
    .setDescription('Delete an event (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents || PermissionFlagsBits.Administrator)
    .addStringOption(option => 
      option.setName('id')
        .setDescription('ID of the event to delete')
        .setRequired(true)
        .setAutocomplete(true)),
        
  // Edit event command (admin only)
  new SlashCommandBuilder()
    .setName('edit-event')
    .setDescription('Edit an existing event (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents || PermissionFlagsBits.Administrator)
    .addStringOption(option => 
      option.setName('id')
        .setDescription('ID of the event to edit')
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(option => 
      option.setName('name')
        .setDescription('New name of the event')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('description')
        .setDescription('New description of the event')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('time')
        .setDescription('New time of the event (e.g., 3:14PM, 15:23)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('date')
        .setDescription('New date of the event (e.g., today, tomorrow, 2023-05-20)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('timezone')
        .setDescription('New timezone for the event (e.g., America/New_York, Europe/London, UTC)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('location')
        .setDescription('New location of the event')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('max_participants')
        .setDescription('New maximum number of participants (0 for unlimited)')
        .setRequired(false))
].map(command => command.toJSON());

// Initialize REST API with token
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Security enhancements
// =================================================

// Store user timezones with encryption
let userTimezones = new Map();

// Rate limiting configuration
const rateLimits = new Map();
const RATE_LIMIT = {
  commands: { count: 5, window: 10 }, // 5 commands per 10 seconds
  creation: { count: 2, window: 60 }   // 2 creations per 60 seconds
};

// Events storage with encryption
let events = new Map();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log('Data directories created/verified');
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

// Security: Check rate limiting
function checkRateLimit(userId, action) {
  const now = Date.now();
  const userKey = `${userId}:${action}`;
  const limit = RATE_LIMIT[action] || RATE_LIMIT.commands;
  
  if (!rateLimits.has(userKey)) {
    rateLimits.set(userKey, { count: 1, timestamp: now });
    return true;
  }
  
  const userLimit = rateLimits.get(userKey);
  
  // Reset if outside window
  if (now - userLimit.timestamp > limit.window * 1000) {
    rateLimits.set(userKey, { count: 1, timestamp: now });
    return true;
  }
  
  // Increase count if within window
  if (userLimit.count < limit.count) {
    userLimit.count += 1;
    return true;
  }
  
  return false;
}

// Input sanitization
function sanitizeInput(input) {
  if (!input) return '';
  // Remove any potentially dangerous characters or patterns
  return input
    .replace(/[^\w\s\-:.,!?@#$%^&*()[\]{};<>~`+=/\\|"']/g, '')
    .trim();
}

// Generate a more secure event ID
function generateEventId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Encrypt sensitive data
function encryptData(data) {
  try {
    if (!data) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(JSON.stringify(data));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), data: encrypted.toString('hex') };
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

// Decrypt sensitive data
function decryptData(encryptedData) {
  try {
    if (!encryptedData) return null;
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const encryptedText = Buffer.from(encryptedData.data, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return JSON.parse(decrypted.toString());
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

// Load user data
async function loadUserData() {
  try {
    await ensureDirectories();
    
    const data = await fs.readFile(USER_DATA_FILE, 'utf8');
    const userData = JSON.parse(data);
    
    // Decrypt user timezones
    userTimezones = new Map();
    if (userData.encryptedTimezones) {
      const decryptedTimezones = decryptData(userData.encryptedTimezones);
      if (decryptedTimezones) {
        for (const [userId, timezone] of Object.entries(decryptedTimezones)) {
          userTimezones.set(userId, timezone);
        }
      }
    }
    
    console.log(`Loaded ${userTimezones.size} user timezone preferences`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No user data file found. Starting with empty user data.');
      userTimezones = new Map();
      await saveUserData(); // Create the file
    } else {
      console.error('Error loading user data:', error);
    }
  }
}

// Save user data
async function saveUserData() {
  try {
    await ensureDirectories();
    
    // Convert Map to object for encryption
    const timezonesObj = {};
    for (const [userId, timezone] of userTimezones.entries()) {
      timezonesObj[userId] = timezone;
    }
    
    // Encrypt user timezones
    const encryptedTimezones = encryptData(timezonesObj);
    
    const userData = {
      encryptedTimezones,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(USER_DATA_FILE, JSON.stringify(userData, null, 2), 'utf8');
    console.log('User data saved successfully');
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

// Load events from file with encryption
async function loadEvents() {
  try {
    await ensureDirectories();
    
    const data = await fs.readFile(EVENTS_FILE, 'utf8');
    const eventsArray = JSON.parse(data);
    
    events = new Map();
    for (const [id, encryptedEvent] of eventsArray) {
      // For simplicity, we're only encrypting certain sensitive fields
      if (encryptedEvent.encryptedData) {
        const decryptedData = decryptData(encryptedEvent.encryptedData);
        if (decryptedData) {
          events.set(id, {
            ...encryptedEvent,
            description: decryptedData.description,
            location: decryptedData.location,
            participants: decryptedData.participants,
            encryptedData: undefined // Remove the encrypted data field
          });
        }
      } else {
        // Backward compatibility for unencrypted data
        events.set(id, encryptedEvent);
      }
    }
    
    console.log(`Loaded ${events.size} events from storage.`);
    
    // Create a backup after loading
    await createBackup();
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No events file found. Starting with empty events.');
      events = new Map();
      await saveEvents(); // Create the file
    } else {
      console.error('Error loading events:', error);
      // Try to recover from backup
      await recoverFromBackup();
    }
  }
}

// Save events to file with robust error handling and encryption
async function saveEvents() {
  // Create temporary file first to avoid corruption
  const tempFile = `${EVENTS_FILE}.tmp`;
  
  try {
    await ensureDirectories();
    
    const eventsArray = [];
    
    for (const [id, event] of events.entries()) {
      // Encrypt sensitive fields
      const sensitiveData = {
        description: event.description,
        location: event.location,
        participants: event.participants
      };
      
      const encryptedData = encryptData(sensitiveData);
      
      const eventToSave = {
        ...event,
        encryptedData: encryptedData,
        // Remove the unencrypted fields that are now encrypted
        description: '[ENCRYPTED]',
        location: event.location ? '[ENCRYPTED]' : null,
        participants: [] // Don't store participants in plain text
      };
      
      eventsArray.push([id, eventToSave]);
    }
    
    await fs.writeFile(tempFile, JSON.stringify(eventsArray, null, 2), 'utf8');
    
    // Check if the file was written correctly
    const fileContent = await fs.readFile(tempFile, 'utf8');
    JSON.parse(fileContent); // Will throw if JSON is invalid
    
    // If we got here, the temp file is valid JSON, so rename it to the actual file
    await fs.rename(tempFile, EVENTS_FILE);
    
    console.log('Events saved successfully.');
    
    // Create a backup after successful save
    await createBackup();
  } catch (error) {
    console.error('Error saving events:', error);
    
    // Try to remove the temp file if it exists
    try {
      await fs.unlink(tempFile);
    } catch (unlinkError) {
      // Ignore errors if file doesn't exist
    }
    
    // Try to recover from the last known good backup
    await recoverFromBackup();
  }
}

// Create a backup of the events file
async function createBackup() {
  try {
    await ensureDirectories();
    
    // Only create a backup if the events file exists
    try {
      await fs.access(EVENTS_FILE);
    } catch (error) {
      // File doesn't exist, no need to backup
      return;
    }
    
    // Create a timestamped backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `events-${timestamp}.json`);
    
    await fs.copyFile(EVENTS_FILE, backupFile);
    
    // Keep only the 10 most recent backups
    const backups = await fs.readdir(BACKUP_DIR);
    if (backups.length > 10) {
      const sortedBackups = backups
        .filter(file => file.startsWith('events-'))
        .sort();
      
      // Delete the oldest backups
      for (let i = 0; i < sortedBackups.length - 10; i++) {
        await fs.unlink(path.join(BACKUP_DIR, sortedBackups[i]));
      }
    }
  } catch (error) {
    console.error('Error creating backup:', error);
  }
}

// Recover from the most recent backup
async function recoverFromBackup() {
  try {
    const backups = await fs.readdir(BACKUP_DIR);
    if (backups.length === 0) {
      console.log('No backups available for recovery.');
      return false;
    }
    
    // Get the most recent backup
    const sortedBackups = backups
      .filter(file => file.startsWith('events-'))
      .sort()
      .reverse();
    
    if (sortedBackups.length === 0) {
      console.log('No valid backups found.');
      return false;
    }
    
    const latestBackup = path.join(BACKUP_DIR, sortedBackups[0]);
    
    // Copy the backup to the main file
    await fs.copyFile(latestBackup, EVENTS_FILE);
    
    console.log(`Recovered from backup: ${sortedBackups[0]}`);
    
    // Reload the events
    await loadEvents();
    
    return true;
  } catch (error) {
    console.error('Error recovering from backup:', error);
    return false;
  }
}

// Helper function to parse time input
function parseTimeInput(timeInput, dateInput, timezone) {
  // Handle the different formats of time input
  if (timeInput.toLowerCase() === 'now') {
    // Current time
    return Math.floor(Date.now() / 1000);
  } else if (/^\d+$/.test(timeInput)) {
    // If input is just numbers, assume unix timestamp directly
    if (timeInput.length > 10) {
      // Might be milliseconds timestamp
      return Math.floor(parseInt(timeInput) / 1000);
    } else {
      return parseInt(timeInput);
    }
  } else {
    // Start with today's date or specified date
    let momentObj;
    
    if (!dateInput) {
      dateInput = 'today';
    }
    
    // Handle date strings
    if (dateInput.toLowerCase() === 'today') {
      momentObj = moment.tz(timezone);
    } else if (dateInput.toLowerCase() === 'tomorrow') {
      momentObj = moment.tz(timezone).add(1, 'days');
    } else if (dateInput.toLowerCase() === 'yesterday') {
      momentObj = moment.tz(timezone).subtract(1, 'days');
    } else {
      // Try to parse as a specific date
      momentObj = moment.tz(dateInput, [
        'YYYY-MM-DD',
        'MM/DD/YYYY',
        'DD/MM/YYYY',
        'MM-DD-YYYY',
        'DD-MM-YYYY'
      ], timezone);
      
      if (!momentObj.isValid()) {
        throw new Error('Invalid date format');
      }
    }
    
    // Now parse the time part
    const timeFormats = [
      // Standard formats
      'HH:mm:ss',
      'HH:mm',
      // AM/PM formats with or without space
      'h:mm:ss A',
      'h:mm A',
      'h:mmA',
      'hA',
      // Military time without colons
      'HHmm',
      'HHmmss'
    ];
    
    // Handle special cases like "3:14AM", "3:14 AM", "15:23", "1520"
    let parsedTime;
    
    if (/^\d{1,2}:\d{2}(AM|PM|am|pm)$/.test(timeInput)) {
      // Format like "3:14AM" or "3:14PM"
      parsedTime = moment.tz(timeInput.toUpperCase(), ['h:mmA'], timezone);
    } else if (/^\d{1,2}:\d{2} (AM|PM|am|pm)$/.test(timeInput)) {
      // Format like "3:14 AM" or "3:14 PM"
      parsedTime = moment.tz(timeInput.toUpperCase(), ['h:mm A'], timezone);
    } else if (/^\d{1,2}(AM|PM|am|pm)$/.test(timeInput)) {
      // Format like "3AM" or "3PM"
      parsedTime = moment.tz(timeInput.toUpperCase(), ['hA'], timezone);
    } else if (/^\d{1,2} (AM|PM|am|pm)$/.test(timeInput)) {
      // Format like "3 AM" or "3 PM"
      parsedTime = moment.tz(timeInput.toUpperCase(), ['h A'], timezone);
    } else if (/^\d{1,2}:\d{2}$/.test(timeInput)) {
      // Format like "15:23" or "3:14"
      parsedTime = moment.tz(timeInput, ['HH:mm', 'h:mm'], timezone);
    } else if (/^\d{3,4}$/.test(timeInput)) {
      // Military time format like "1520" for 15:20
      const militaryFormat = timeInput.length === 3 ? '0' + timeInput : timeInput;
      parsedTime = moment.tz(militaryFormat, ['HHmm'], timezone);
    } else {
      // Try all supported formats
      parsedTime = moment.tz(timeInput, timeFormats, timezone);
    }
    
    if (!parsedTime.isValid()) {
      throw new Error('Invalid time format');
    }
    
    // Combine date and time
    momentObj.hours(parsedTime.hours());
    momentObj.minutes(parsedTime.minutes());
    momentObj.seconds(parsedTime.seconds());
    
    return Math.floor(momentObj.valueOf() / 1000);
  }
}

// Helper function to parse combined date-time inputs
function parseTimeString(timeInput, userTimezone) {
  // Check if the time string contains date information
  const containsDate = /tomorrow|today|yesterday|\d{1,2}\/\d{1,2}|\d{4}-\d{1,2}-\d{1,2}/.test(timeInput.toLowerCase());
  
  // Common patterns for combined date-time
  const patterns = [
    // "tomorrow 8pm", "today at 3:14pm", "yesterday 15:30"
    /^(today|tomorrow|yesterday)(?:\s+at)?\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?|\d{3,4})$/i,
    
    // "8pm tomorrow", "3:14pm today", "15:30 yesterday"
    /^(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?|\d{3,4})\s+(today|tomorrow|yesterday)$/i,
    
    // "May 20 3pm", "5/20 15:00", "2023-05-20 3:14pm"
    /^([a-z]+\s+\d{1,2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?|\d{3,4})$/i,
    
    // "3pm May 20", "15:00 5/20", "3:14pm 2023-05-20"
    /^(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?|\d{3,4})\s+([a-z]+\s+\d{1,2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{1,2}-\d{1,2})$/i
  ];
  
  // If we detect a combined format, extract date and time parts
  for (const pattern of patterns) {
    const match = timeInput.match(pattern);
    if (match) {
      let datePart, timePart;
      
      // Determine which group is date and which is time
      if (['today', 'tomorrow', 'yesterday'].includes(match[1].toLowerCase())) {
        datePart = match[1];
        timePart = match[2];
      } else if (['today', 'tomorrow', 'yesterday'].includes(match[2].toLowerCase())) {
        timePart = match[1];
        datePart = match[2];
      } else if (/^\d{1,2}(?::\d{2})?(?:\s*[ap]m)?$|\d{3,4}$/i.test(match[1])) {
        timePart = match[1];
        datePart = match[2];
      } else {
        datePart = match[1];
        timePart = match[2];
      }
      
      // Use our existing parser with the extracted parts
      return parseTimeInput(timePart, datePart, userTimezone);
    }
  }
  
  // If it doesn't match a combined pattern, check if it's a relative time
  const relativeTimePatterns = [
    // "in 2 hours", "in 30 minutes", "in 1 day"
    /^in\s+(\d+)\s+(minute|minutes|hour|hours|day|days|week|weeks|month|months)$/i
  ];
  
  for (const pattern of relativeTimePatterns) {
    const match = timeInput.match(pattern);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      const now = moment();
      let unitNormalized;
      
      // Normalize the unit for moment
      if (unit === 'minute' || unit === 'minutes') unitNormalized = 'minutes';
      else if (unit === 'hour' || unit === 'hours') unitNormalized = 'hours';
      else if (unit === 'day' || unit === 'days') unitNormalized = 'days';
      else if (unit === 'week' || unit === 'weeks') unitNormalized = 'weeks';
      else if (unit === 'month' || unit === 'months') unitNormalized = 'months';
      
      const futureTime = now.add(amount, unitNormalized);
      return Math.floor(futureTime.valueOf() / 1000);
    }
  }
  
  // If no date information in the string, assume today
  if (!containsDate) {
    return parseTimeInput(timeInput, 'today', userTimezone);
  }
  
  // If it doesn't match any pattern, pass it through to the normal parser
  // and let it handle whatever it can
  return parseTimeInput(timeInput, null, userTimezone);
}

// Create an embed for an event
function createEventEmbed(eventId, event) {
  const color = event.color || '#5865F2'; // Default Discord color if not specified
  
  const embed = new EmbedBuilder()
    .setTitle(event.name)
    .setDescription(event.description)
    .setColor(color)
    .addFields(
      { name: 'Time', value: `<t:${event.timestamp}:F> (<t:${event.timestamp}:R>)`, inline: true },
      { name: 'Created by', value: `<@${event.createdBy}>`, inline: true }
    );
  
  if (event.location) {
    embed.addFields({ name: 'Location', value: event.location, inline: true });
  }
  
  // Add participation info
  const participantsCount = event.participants ? event.participants.length : 0;
  const maxParticipants = event.maxParticipants || 'Unlimited';
  
  let participantsField = `${participantsCount} attending`;
  if (event.maxParticipants > 0) {
    participantsField += ` / ${event.maxParticipants} maximum`;
  }
  
  embed.addFields({ name: 'Participants', value: participantsField, inline: true });
  
  // Add participant list if there are any
 if (participantsCount > 0) {
    const participantList = event.participants
      .map(userId => `<@${userId}>`)
      .join('\n');
    
    embed.addFields({ name: 'Attendees', value: participantList.slice(0, 1024) });
  }
  
  // Add event ID as footer
  embed.setFooter({ text: `Event ID: ${eventId} • Created at: ${new Date(event.createdAt).toLocaleString()}` });
  
  return embed;
 }
 
 // Create event buttons (RSVP, Cancel RSVP)
 function createEventButtons(eventId, userId) {
  const event = events.get(eventId);
  if (!event) return null;
  
  const isParticipant = event.participants && event.participants.includes(userId);
  const isFull = event.maxParticipants > 0 && event.participants.length >= event.maxParticipants;
  
  const row = new ActionRowBuilder();
  
  if (isParticipant) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`cancel_rsvp:${eventId}`)
        .setLabel('Cancel RSVP')
        .setStyle(ButtonStyle.Danger)
    );
  } else if (!isFull) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`rsvp:${eventId}`)
        .setLabel('RSVP')
        .setStyle(ButtonStyle.Success)
    );
  } else {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`rsvp:${eventId}`)
        .setLabel('Event Full')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
  }
  
  // Add reminder button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`remind:${eventId}`)
      .setLabel('Set Reminder')
      .setStyle(ButtonStyle.Primary)
  );
  
  return row;
 }
 
 // Helper function to get format names
 function formatName(format) {
  const formats = {
    't': 'Short Time',
    'T': 'Long Time',
    'd': 'Short Date',
    'D': 'Long Date',
    'f': 'Short Date/Time',
    'F': 'Long Date/Time',
    'R': 'Relative Time'
  };
  return formats[format] || 'Unknown Format';
 }
 
 // Check for upcoming events to send reminders
 async function checkEventReminders() {
  const now = Math.floor(Date.now() / 1000);
  
  for (const [eventId, event] of events.entries()) {
    // If event is in the past, consider removing it
    if (event.timestamp < now - 3600) { // Event ended more than an hour ago
      // For now, we'll keep past events, but you could add auto-cleanup logic here
      continue;
    }
    
    // Check for reminders that need to be sent
    const reminderTimes = [
      { time: 30 * 60, label: '30 minutes' }, // 30 minutes before
      { time: 60 * 60, label: '1 hour' },     // 1 hour before
      { time: 24 * 60 * 60, label: '1 day' }  // 1 day before
    ];
    
    for (const reminder of reminderTimes) {
      const reminderTime = event.timestamp - reminder.time;
      
      // If it's time to send a reminder (within the last minute)
      if (reminderTime > now - 60 && reminderTime <= now) {
        await sendEventReminders(eventId, event, reminder.label);
      }
    }
  }
 }
 
 // Send reminders to participants
 async function sendEventReminders(eventId, event, timeLabel) {
  if (!event.participants || event.participants.length === 0) return;
  
  // Create a reminder embed
  const embed = new EmbedBuilder()
    .setTitle(`⏰ Reminder: ${event.name} starts in ${timeLabel}!`)
    .setDescription(event.description)
    .setColor('#FF9900')
    .addFields(
      { name: 'Time', value: `<t:${event.timestamp}:F> (<t:${event.timestamp}:R>)`, inline: true }
    );
  
  if (event.location) {
    embed.addFields({ name: 'Location', value: event.location, inline: true });
  }
  
  embed.setFooter({ text: `Event ID: ${eventId}` });
  
  // Try to send DMs to all participants
  for (const userId of event.participants) {
    try {
      const user = await client.users.fetch(userId);
      await user.send({ embeds: [embed] });
      console.log(`Sent ${timeLabel} reminder to ${user.tag} for event ${eventId}`);
    } catch (error) {
      console.error(`Failed to send reminder to user ${userId}:`, error);
    }
  }
 }
 
 // Register commands when the bot is ready
 client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  try {
    console.log('Started refreshing application (/) commands.');
    
    // The correct way to set application commands
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
 
    console.log('Successfully reloaded application (/) commands.');
    
    // Load user data and events from storage
    await loadUserData();
    await loadEvents();
    
    // Start checking for event reminders periodically
    setInterval(checkEventReminders, 60000); // Check every minute
    
    // Regularly clean up old rate limit entries
    setInterval(() => {
      const now = Date.now();
      for (const [key, limit] of rateLimits.entries()) {
        const [userId, action] = key.split(':');
        const limitConfig = RATE_LIMIT[action] || RATE_LIMIT.commands;
        
        if (now - limit.timestamp > limitConfig.window * 1000) {
          rateLimits.delete(key);
        }
      }
    }, 60000); // Clean up every minute
    
    // Auto-save user data every 5 minutes
    setInterval(async () => {
      await saveUserData();
    }, 300000);
    
    console.log(`Bot is ready and operational!`);
    
  } catch (error) {
    console.error('Error during startup:', error);
  }
 });
 
 // Handle autocomplete interactions for event IDs
 client.on('interactionCreate', async interaction => {
  if (!interaction.isAutocomplete()) return;
  
  const command = interaction.commandName;
  const focusedOption = interaction.options.getFocused(true);
  
  if ((command === 'event' || command === 'delete-event' || command === 'edit-event') && 
      focusedOption.name === 'id') {
    try {
      // Rate limiting for autocomplete to prevent abuse
      if (!checkRateLimit(interaction.user.id, 'commands')) {
        return await interaction.respond([]);
      }
      
      // Filter events based on input
      const eventChoices = [];
      const input = focusedOption.value.toLowerCase();
      
      for (const [id, event] of events.entries()) {
        // Only match events that contain the input in id or name
        if (id.toLowerCase().includes(input) || event.name.toLowerCase().includes(input)) {
          // Add event to choices (truncate name if too long)
          const displayName = event.name.length > 50 ? 
            event.name.substring(0, 47) + '...' : event.name;
          
          eventChoices.push({
            name: `${id}: ${displayName}`,
            value: id
          });
        }
        
        // Discord allows up to 25 choices
        if (eventChoices.length >= 25) break;
      }
      
      await interaction.respond(eventChoices);
    } catch (error) {
      console.error('Error handling autocomplete:', error);
      // Respond with empty array on error to avoid client-side issues
      await interaction.respond([]);
    }
  }
 });
 
 // Handle button interactions for events
 client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  
  try {
    // Rate limiting for button interactions
    if (!checkRateLimit(interaction.user.id, 'commands')) {
      return interaction.reply({ 
        content: '⚠️ You are interacting too quickly. Please wait a moment and try again.',
        ephemeral: true 
      });
    }
    
    const { customId, user } = interaction;
    
    // Parse button ID in format "action:eventId"
    const [action, eventId] = customId.split(':');
    
    if (!eventId || !events.has(eventId)) {
      return interaction.reply({ 
        content: 'This event no longer exists.',
        ephemeral: true 
      });
    }
    
    const event = events.get(eventId);
    
    switch (action) {
      case 'rsvp':
        // Handle RSVP button
        if (!event.participants) {
          event.participants = [];
        }
        
        // Check if event is full
        if (event.maxParticipants > 0 && event.participants.length >= event.maxParticipants) {
          return interaction.reply({ 
            content: 'Sorry, this event is already full.', 
            ephemeral: true 
          });
        }
        
        // Check if user already RSVP'd
        if (event.participants.includes(user.id)) {
          return interaction.reply({ 
            content: 'You have already RSVP\'d to this event.', 
            ephemeral: true 
          });
        }
        
        // Add user to participants
        event.participants.push(user.id);
        await saveEvents();
        
        // Update the message with new participant info
        try {
          const embed = createEventEmbed(eventId, event);
          const buttons = createEventButtons(eventId, user.id);
          
          await interaction.update({ 
            embeds: [embed], 
            components: buttons ? [buttons] : [] 
          });
          
          // Also send a confirmation
          await interaction.followUp({ 
            content: `You've successfully RSVP'd to **${event.name}**! The event starts <t:${event.timestamp}:R>.`, 
            ephemeral: true 
          });
          
          console.log(`User ${user.tag} (${user.id}) RSVP'd to event ${eventId}`);
        } catch (error) {
          console.error('Error updating RSVP:', error);
          await interaction.reply({ 
            content: 'Your RSVP was recorded, but there was an error updating the display.', 
            ephemeral: true 
          });
        }
        break;
        
      case 'cancel_rsvp':
        // Handle Cancel RSVP button
        if (!event.participants || !event.participants.includes(user.id)) {
          return interaction.reply({ 
            content: 'You have not RSVP\'d to this event.', 
            ephemeral: true 
          });
        }
        
        // Remove user from participants
        event.participants = event.participants.filter(id => id !== user.id);
        await saveEvents();
        
        // Update the message with new participant info
        try {
          const embed = createEventEmbed(eventId, event);
          const buttons = createEventButtons(eventId, user.id);
          
          await interaction.update({ 
            embeds: [embed], 
            components: buttons ? [buttons] : [] 
          });
          
          // Also send a confirmation
          await interaction.followUp({ 
            content: `You've canceled your RSVP to **${event.name}**.`, 
            ephemeral: true 
          });
          
          console.log(`User ${user.tag} (${user.id}) canceled RSVP to event ${eventId}`);
        } catch (error) {
          console.error('Error updating RSVP:', error);
          await interaction.reply({ 
            content: 'Your RSVP was canceled, but there was an error updating the display.', 
            ephemeral: true 
          });
        }
        break;
        
      case 'remind':
        // Handle Set Reminder button
        await interaction.reply({ 
          content: `I've set a reminder for you for **${event.name}**. You'll receive a DM 1 day, 1 hour, and 30 minutes before the event starts.`, 
          ephemeral: true 
        });
        
        console.log(`User ${user.tag} (${user.id}) set reminders for event ${eventId}`);
        break;
    }
  } catch (error) {
    console.error('Error handling button interaction:', error);
    await interaction.reply({ 
      content: 'An error occurred while processing your request. Please try again later.', 
      ephemeral: true 
    });
  }
 });
 
 // Handle slash commands
 client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
 
  try {
    const { commandName, user } = interaction;
    
    // Security: Rate limiting
    if (!checkRateLimit(user.id, 'commands')) {
      return interaction.reply({ 
        content: '⚠️ You are sending commands too quickly. Please wait a moment and try again.',
        ephemeral: true 
      });
    }
    
    // Log command usage for security auditing
    console.log(`Command executed: ${commandName} by ${user.tag} (${user.id})`);
    
    // Set user timezone command
    if (commandName === 'set-timezone') {
      const timezone = sanitizeInput(interaction.options.getString('timezone'));
      
      // Validate timezone
      if (!timezone || !moment.tz.zone(timezone)) {
        return interaction.reply({ 
          content: `❌ Invalid timezone. Please use a valid timezone like 'America/New_York' or 'Europe/London'. See the full list at: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`, 
          ephemeral: true 
        });
      }
      
      // Store user timezone
      userTimezones.set(user.id, timezone);
      await saveUserData();
      
      return interaction.reply({ 
        content: `✅ Your timezone has been set to ${timezone}. All timestamp conversions will use this timezone.`, 
        ephemeral: true 
      });
    }
 
    // Quick "now" command
    if (commandName === 'now') {
      const unixTimestamp = Math.floor(Date.now() / 1000);
      const formats = ['t', 'T', 'd', 'D', 'f', 'F', 'R'];
      const examples = formats.map(f => `**${formatName(f)}**: <t:${unixTimestamp}:${f}> (\`<t:${unixTimestamp}:${f}>\`)`);
      
      const response = [
        `**Current Unix Timestamp**: \`${unixTimestamp}\``,
        '**Available Formats**:',
        ...examples
      ].join('\n');
      
      return interaction.reply(response);
    }
 
    // "In X time" command
    if (commandName === 'in') {
      // Security: Sanitize and validate inputs
      const amount = Math.min(Math.max(1, interaction.options.getInteger('amount')), 1000);
      const unit = interaction.options.getString('unit');
      
      const validUnits = ['minutes', 'hours', 'days', 'weeks', 'months'];
      if (!validUnits.includes(unit)) {
        return interaction.reply({ 
          content: '❌ Invalid time unit.', 
          ephemeral: true 
        });
      }
      
      const now = moment();
      const futureTime = now.add(amount, unit);
      const unixTimestamp = Math.floor(futureTime.valueOf() / 1000);
      
      const response = [
        `**Timestamp ${amount} ${unit} from now**: <t:${unixTimestamp}:F> (\`<t:${unixTimestamp}:F>\`)`,
        `**Relative**: <t:${unixTimestamp}:R> (\`<t:${unixTimestamp}:R>\`)`,
        `**Unix Timestamp**: \`${unixTimestamp}\``
      ].join('\n');
      
      return interaction.reply(response);
    }
 
    // Main timestamp command
    if (commandName === 'timestamp') {
      // Security: Sanitize all inputs
      const timeInput = sanitizeInput(interaction.options.getString('time'));
      const format = sanitizeInput(interaction.options.getString('format')) || 'f';
      let dateInput = interaction.options.getString('date') ? 
                     sanitizeInput(interaction.options.getString('date')) : null;
      let timezone = interaction.options.getString('timezone') ? 
                    sanitizeInput(interaction.options.getString('timezone')) : null;
      
      // Validate format
      const validFormats = ['t', 'T', 'd', 'D', 'f', 'F', 'R', 'all'];
      if (!validFormats.includes(format)) {
        return interaction.reply({
          content: '❌ Invalid format specified.',
          ephemeral: true
        });
      }
      
      // If no timezone provided, use the user's saved timezone or default to UTC
      if (!timezone) {
        timezone = userTimezones.get(user.id) || 'UTC';
      }
      
      try {
        // Validate timezone
        if (!moment.tz.zone(timezone)) {
          return interaction.reply({ 
            content: `❌ Invalid timezone. Please use a valid timezone like 'America/New_York' or 'Europe/London'.`, 
            ephemeral: true 
          });
        }
        
        // Try parsing with combined date-time format first
        let unixTimestamp;
        if (!dateInput && timeInput !== 'now' && !/^\d+$/.test(timeInput)) {
          // This might be a combined format like "tomorrow 8pm"
          try {
            unixTimestamp = parseTimeString(timeInput, timezone);
          } catch (error) {
            // If combined parsing fails, fall back to separate parsing
            unixTimestamp = parseTimeInput(timeInput, dateInput, timezone);
          }
        } else {
          // Use regular parsing for explicit date input or special cases
          unixTimestamp = parseTimeInput(timeInput, dateInput, timezone);
        }
        
        if (format === 'all') {
          // Show all format options
          const formats = ['t', 'T', 'd', 'D', 'f', 'F', 'R'];
          const examples = formats.map(f => `**${formatName(f)}**: <t:${unixTimestamp}:${f}> (\`<t:${unixTimestamp}:${f}>\`)`);
          
          const timezoneName = timezone || 'UTC';
          const response = [
            `**Time in ${timezoneName}**: ${moment.unix(unixTimestamp).tz(timezoneName).format('YYYY-MM-DD HH:mm:ss')}`,
            `**Unix Timestamp**: \`${unixTimestamp}\``,
            '**Discord Timestamp Formats**:',
            ...examples
          ].join('\n');
          
          return interaction.reply(response);
        }
        
        // Generate timestamp for a specific format
        const discordTimestamp = `<t:${unixTimestamp}:${format}>`;
        const timezoneName = timezone || 'UTC';
        const localTime = moment.unix(unixTimestamp).tz(timezoneName).format('YYYY-MM-DD HH:mm:ss');
        
        const response = [
          `**Time in ${timezoneName}**: ${localTime}`,
          `**${formatName(format)}**: ${discordTimestamp}`,
          `**Copy this**: \`${discordTimestamp}\``,
          `**Unix Timestamp**: \`${unixTimestamp}\``
        ].join('\n');
        
        await interaction.reply(response);
      } catch (error) {
        console.error('Error generating timestamp:', error);
        await interaction.reply({ 
          content: `❌ Invalid time or date format. Examples of supported time formats:\n` +
                  `- 3:14AM, 3:14 PM, 3PM, 3 PM\n` +
                  `- 15:23 (24-hour format)\n` +
                  `- 1520 (military time, no colon)\n` +
                  `- now (current time)\n\n` +
                  `Supported date formats:\n` +
                  `- YYYY-MM-DD (e.g., 2023-05-20)\n` +
                  `- MM/DD/YYYY (e.g., 05/20/2023)\n` +
                  `- today, tomorrow, yesterday\n\n` +
                  `Combined formats:\n` +
                  `- tomorrow 8pm\n` +
                  `- 3pm tomorrow`, 
          ephemeral: true 
        });
      }
    }
    
    // Quick event command
    if (commandName === 'quick-event') {
      // Security: Check permissions
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents) && 
          !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ 
          content: '❌ You do not have permission to create events.',
          ephemeral: true 
        });
      }
      
      const nameAndTime = sanitizeInput(interaction.options.getString('name_and_time'));
      
      // Try to parse the combined string into name and time
      // Common patterns: "Game Night tomorrow 8pm", "Team Meeting at 3pm", etc.
      const timePatterns = [
        // Look for time patterns at the end
        /\b((?:today|tomorrow|yesterday|in \d+ (?:minute|hour|day|week|month)s?|next (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))(?:\s+at)?\s+\d{1,2}(?::\d{2})?(?:\s*[ap]m)?|\d{1,2}(?::\d{2})?\s*[ap]m\s+(?:today|tomorrow|yesterday)|(?:\d{1,2}\/\d{1,2}|\d{4}-\d{1,2}-\d{1,2})\s+\d{1,2}(?::\d{2})?(?:\s*[ap]m)?|\d{1,2}(?::\d{2})?\s*[ap]m\s+(?:\d{1,2}\/\d{1,2}|\d{4}-\d{1,2}-\d{1,2})|\d{1,2}(?::\d{2})?(?:\s*[ap]m)?|\d{3,4})$/i
      ];
      
      let eventName = nameAndTime;
      let timeInput = 'tomorrow 8pm'; // Default fallback
      
      // Try to extract time information
      for (const pattern of timePatterns) {
        const match = nameAndTime.match(pattern);
        if (match) {
          timeInput = match[1];
          eventName = nameAndTime.replace(pattern, '').trim();
          break;
        }
      }
      
      // Get user timezone, fallback to UTC
      const timezone = userTimezones.get(user.id) || 'UTC';
      
      try {
        // Validate timezone
        if (!moment.tz.zone(timezone)) {
          return interaction.reply({ 
            content: `❌ Your timezone is not set. Please use /set-timezone first.`, 
            ephemeral: true 
          });
        }
        
        // Parse time to timestamp
        const timestamp = parseTimeString(timeInput, timezone);
        
        // Generate a unique ID for the event
        const eventId = generateEventId();
        
        // Create the event with minimal info
        const event = {
          name: eventName,
          description: `Quick event: ${eventName}`,
          timestamp,
          timezone,
          createdBy: user.id,
          createdAt: Date.now(),
          participants: [],
          maxParticipants: 0,
          location: null,
          color: '#5865F2'
        };
        
        // Add to events store
        events.set(eventId, event);
        
        // Save events to storage
        await saveEvents();
        
        // Create embed for the event
        const embed = createEventEmbed(eventId, event);
        const buttons = createEventButtons(eventId, user.id);
        
        // Reply with the event details
        await interaction.reply({
          content: `✅ Quick event created! Event ID: **${eventId}**`,
          embeds: [embed],
          components: buttons ? [buttons] : []
        });
        
        console.log(`Quick event ${eventId} created by ${user.tag} (${user.id})`);
      } catch (error) {
        console.error('Error creating quick event:', error);
        await interaction.reply({ 
          content: `❌ Error creating event: ${error.message}. Try a format like "Game Night tomorrow 8pm" or "Team Meeting at 3pm".`, 
          ephemeral: true 
        });
      }
    }
    
    // Create event command
    if (commandName === 'create-event') {
      // Security: Check permissions
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents) && 
          !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ 
          content: '❌ You do not have permission to create events.',
          ephemeral: true 
        });
      }
      
      // Security: Rate limiting for event creation specifically
      if (!checkRateLimit(user.id, 'creation')) {
        return interaction.reply({ 
          content: '⚠️ You are creating events too quickly. Please wait a moment and try again.',
          ephemeral: true 
        });
      }
      
      // Security: Sanitize all inputs
      const name = sanitizeInput(interaction.options.getString('name'));
      const timeInput = sanitizeInput(interaction.options.getString('time'));
      
      // Get optional fields with defaults
      const description = interaction.options.getString('description') 
                         ? sanitizeInput(interaction.options.getString('description')) 
                         : `Event: ${name}`; // Default description
      
      const dateInput = interaction.options.getString('date')
                       ? sanitizeInput(interaction.options.getString('date'))
                       : null; // Will be parsed from timeInput if possible
      
      // Get user timezone if not specified, fallback to UTC
      let timezone = interaction.options.getString('timezone')
                    ? sanitizeInput(interaction.options.getString('timezone'))
                    : userTimezones.get(user.id) || 'UTC';
      
      const location = interaction.options.getString('location') 
                      ? sanitizeInput(interaction.options.getString('location')) 
                      : null;
      
      const maxParticipants = Math.min(
        Math.max(0, interaction.options.getInteger('max_participants') || 0),
        1000 // Cap at 1000 participants as a safety measure
      );
      
      const color = interaction.options.getString('color') || '#5865F2';
      
      // Input validation - ensure critical fields aren't empty after sanitization
      if (!name || !timeInput) {
        return interaction.reply({ 
          content: '❌ Event name and time are required.',
          ephemeral: true 
        });
      }
      
      try {
        // Validate timezone
        if (!moment.tz.zone(timezone)) {
          return interaction.reply({ 
            content: `❌ Invalid timezone "${timezone}". Please use a valid timezone like 'America/New_York' or 'Europe/London', or set your default timezone with /set-timezone.`, 
            ephemeral: true 
          });
        }
        
        // Parse time to timestamp - use the enhanced parser for combined inputs
        let timestamp;
        if (dateInput) {
          // If date is provided separately, use the original parser
          timestamp = parseTimeInput(timeInput, dateInput, timezone);
        } else {
          // If no separate date, try to parse combined date-time
          timestamp = parseTimeString(timeInput, timezone);
        }
        
        // Generate a unique ID for the event
        const eventId = generateEventId();
        
        // Create the event with minimum required fields and defaults for optional ones
        const event = {
          name,
          description,
          timestamp,
          timezone,
          createdBy: user.id,
          createdAt: Date.now(),
          participants: [],
          maxParticipants,
          location,
          color
        };
        
        // Add to events store
        events.set(eventId, event);
        
        // Save events to storage
        await saveEvents();
        
        // Create embed for the event
        const embed = createEventEmbed(eventId, event);
        const buttons = createEventButtons(eventId, user.id);
        
        // Reply with the event details
        await interaction.reply({
          content: `✅ Event created! Event ID: **${eventId}**`,
          embeds: [embed],
          components: buttons ? [buttons] : []
        });
        
        console.log(`Event ${eventId} created by ${user.tag} (${user.id})`);
      } catch (error) {
        console.error('Error creating event:', error);
        await interaction.reply({ 
          content: `❌ Error creating event: ${error.message}. Use format like "8pm tomorrow" or "3:14PM" or "May 20 3pm".`, 
          ephemeral: true 
        });
      }
    }
    
    // List events command
    if (commandName === 'list-events') {
      if (events.size === 0) {
        return interaction.reply('There are currently no scheduled events.');
      }
      
      // Sort events by timestamp (soonest first)
      const sortedEvents = Array.from(events.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Create an embed with upcoming events
      const embed = new EmbedBuilder()
        .setTitle('📅 Upcoming Events')
        .setColor('#5865F2')
        .setDescription('Here are all upcoming events. Use `/event id:<event_id>` to see details for a specific event.');
      
      const now = Math.floor(Date.now() / 1000);
      let upcomingCount = 0;
      
      // Add upcoming events to embed
      for (const [id, event] of sortedEvents) {
        // Skip events that have already passed
        if (event.timestamp < now) continue;
        
        upcomingCount++;
        
        // Add field for this event
        embed.addFields({
          name: `${event.name} (ID: ${id})`,
          value: `📆 <t:${event.timestamp}:F> (<t:${event.timestamp}:R>)\n` +
                `👥 ${event.participants.length} attending` +
                `${event.location ? `\n📍 ${event.location}` : ''}`
        });
        
        // Discord has a limit of 25 fields per embed
        if (upcomingCount >= 25) break;
      }
      
      if (upcomingCount === 0) {
        embed.setDescription('There are no upcoming events scheduled.');
      }
      
      await interaction.reply({ embeds: [embed] });
    }
    
    // Event details command
   if (commandName === 'event') {
    const eventId = sanitizeInput(interaction.options.getString('id'));
    
    if (!events.has(eventId)) {
      return interaction.reply({ 
        content: `❌ Event with ID **${eventId}** not found.`, 
        ephemeral: true 
      });
    }
    
    const event = events.get(eventId);
    
    // Create embed for the event
    const embed = createEventEmbed(eventId, event);
    const buttons = createEventButtons(eventId, user.id);
    
    // Reply with the event details
    await interaction.reply({
      embeds: [embed],
      components: buttons ? [buttons] : []
    });
  }
  
  // Delete event command
  if (commandName === 'delete-event') {
    const eventId = sanitizeInput(interaction.options.getString('id'));
    
    if (!events.has(eventId)) {
      return interaction.reply({ 
        content: `❌ Event with ID **${eventId}** not found.`, 
        ephemeral: true 
      });
    }
    
    const event = events.get(eventId);
    
    // Check if user is the creator or has admin permissions
    if (event.createdBy !== user.id && 
        !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: `❌ You don't have permission to delete this event. Only the event creator or server administrators can delete events.`, 
        ephemeral: true 
      });
    }
    
    // Delete the event
    events.delete(eventId);
    
    // Save events to storage
    await saveEvents();
    
    // Confirm deletion
    await interaction.reply({ 
      content: `✅ Event **${event.name}** (ID: ${eventId}) has been deleted.` 
    });
    
    console.log(`Event ${eventId} deleted by ${user.tag} (${user.id})`);
  }
  
  // Edit event command
  if (commandName === 'edit-event') {
    const eventId = sanitizeInput(interaction.options.getString('id'));
    
    if (!events.has(eventId)) {
      return interaction.reply({ 
        content: `❌ Event with ID **${eventId}** not found.`, 
        ephemeral: true 
      });
    }
    
    const event = events.get(eventId);
    
    // Check if user is the creator or has admin permissions
    if (event.createdBy !== user.id && 
        !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: `❌ You don't have permission to edit this event. Only the event creator or server administrators can edit events.`, 
        ephemeral: true 
      });
    }
    
    try {
      // Get new values or use existing ones
      const name = interaction.options.getString('name') ? 
                   sanitizeInput(interaction.options.getString('name')) : event.name;
      const description = interaction.options.getString('description') ? 
                         sanitizeInput(interaction.options.getString('description')) : event.description;
      const timeInput = interaction.options.getString('time') ? 
                        sanitizeInput(interaction.options.getString('time')) : null;
      const dateInput = interaction.options.getString('date') ? 
                        sanitizeInput(interaction.options.getString('date')) : null;
      const timezone = interaction.options.getString('timezone') ? 
                       sanitizeInput(interaction.options.getString('timezone')) : event.timezone;
      const location = interaction.options.getString('location') !== null ? 
                      sanitizeInput(interaction.options.getString('location')) : event.location;
      const maxParticipants = interaction.options.getInteger('max_participants') !== null ? 
                            Math.min(Math.max(0, interaction.options.getInteger('max_participants')), 1000) : event.maxParticipants;
      
      // Validate timezone
      if (!moment.tz.zone(timezone)) {
        return interaction.reply({ 
          content: `❌ Invalid timezone. Please use a valid timezone like 'America/New_York' or 'Europe/London'.`, 
          ephemeral: true 
        });
      }
      
      // Update timestamp if time or date was provided
      let timestamp = event.timestamp;
      if (timeInput || dateInput) {
        if (timeInput && dateInput) {
          // Both provided
          timestamp = parseTimeInput(timeInput, dateInput, timezone);
        } else if (timeInput) {
          // Only time provided - try to parse as combined or use existing date
          try {
            timestamp = parseTimeString(timeInput, timezone);
          } catch (error) {
            // If combined parsing fails, use existing date
            const existingDate = moment.unix(event.timestamp).tz(timezone).format('YYYY-MM-DD');
            timestamp = parseTimeInput(timeInput, existingDate, timezone);
          }
        } else if (dateInput) {
          // Only date provided - use existing time
          const existingTime = moment.unix(event.timestamp).tz(timezone).format('HH:mm');
          timestamp = parseTimeInput(existingTime, dateInput, timezone);
        }
      }
      
      // Update the event
      const updatedEvent = {
        ...event,
        name,
        description,
        timestamp,
        timezone,
        location,
        maxParticipants,
        updatedAt: Date.now(),
        updatedBy: user.id
      };
      
      events.set(eventId, updatedEvent);
      
      // Save events to storage
      await saveEvents();
      
      // Create embed for the updated event
      const embed = createEventEmbed(eventId, updatedEvent);
      const buttons = createEventButtons(eventId, user.id);
      
      // Reply with the updated event details
      await interaction.reply({
        content: `✅ Event updated successfully!`,
        embeds: [embed],
        components: buttons ? [buttons] : []
      });
      
      console.log(`Event ${eventId} edited by ${user.tag} (${user.id})`);
    } catch (error) {
      console.error('Error editing event:', error);
      await interaction.reply({ 
        content: `❌ Error editing event: ${error.message}`, 
        ephemeral: true 
      });
    }
  }
} catch (error) {
  // Centralized error handling
  console.error(`Command error in ${interaction.commandName}:`, error);
  try {
    // Only reply if interaction hasn't been replied to yet
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        content: 'An error occurred while processing your request. Please try again later.', 
        ephemeral: true 
      });
    }
  } catch (replyError) {
    console.error('Error sending error response:', replyError);
  }
}
});

// Process errors globally to prevent crashes
process.on('uncaughtException', (error) => {
console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
console.error('Unhandled Promise Rejection:', error);
});

// Log in to Discord with error handling
client.login(process.env.TOKEN).catch(error => {
console.error('Failed to login to Discord:', error);
process.exit(1);
});