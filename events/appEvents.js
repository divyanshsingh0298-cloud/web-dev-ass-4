// Central EventEmitter for event-driven features.
const EventEmitter = require('events');

class AppEmitter extends EventEmitter {}
const appEvents = new AppEmitter();

// Registers all listeners. `io` is passed in so events can push real-time notifications.
function registerListeners(io) {
  appEvents.on('user:registered', (user) => {
    console.log(`[event] user registered: ${user.username} (${user.email})`);
  });

  appEvents.on('user:loggedIn', (user) => {
    console.log(`[event] user logged in: ${user.username} at ${new Date().toISOString()}`);
  });

  appEvents.on('note:created', (note) => {
    console.log(`[event] note created: "${note.title}" by ${note.owner}`);
    io.to(`user:${note.owner}`).emit('notification', {
      type: 'note:created',
      message: `Note "${note.title}" was created`,
    });
  });

  appEvents.on('note:updated', (note) => {
    console.log(`[event] note updated: ${note._id}`);
    io.to(`user:${note.owner}`).emit('notification', {
      type: 'note:updated',
      message: `Note "${note.title}" was updated`,
    });
  });

  appEvents.on('note:deleted', (note) => {
    console.log(`[event] note deleted: ${note._id}`);
    io.to(`user:${note.owner}`).emit('notification', {
      type: 'note:deleted',
      message: `Note "${note.title}" was deleted`,
    });
  });

  appEvents.on('chat:message', (msg) => {
    console.log(`[event] chat message in #${msg.room} from ${msg.username}`);
  });
}

module.exports = { appEvents, registerListeners };
