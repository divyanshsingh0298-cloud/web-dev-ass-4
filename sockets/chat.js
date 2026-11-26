const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const { appEvents } = require('../events/appEvents');

module.exports = function setupChat(io) {
  // Authenticate every socket connection with the JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: token required'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  const online = new Map(); // userId -> number of open connections

  io.on('connection', (socket) => {
    const { id, username } = socket.user;
    console.log(`[socket] ${username} connected (${socket.id})`);

    // Personal room for private notifications (used by EventEmitter listeners)
    socket.join(`user:${id}`);

    online.set(id, (online.get(id) || 0) + 1);
    io.emit('presence', { username, status: 'online' });

    socket.on('room:join', (room) => {
      if (typeof room !== 'string' || !room.trim()) return;
      socket.join(room);
      socket.to(room).emit('room:system', { message: `${username} joined #${room}` });
    });

    socket.on('room:leave', (room) => {
      socket.leave(room);
      socket.to(room).emit('room:system', { message: `${username} left #${room}` });
    });

    socket.on('chat:message', async ({ room, text } = {}) => {
      if (!room || !text || !text.trim()) return;
      try {
        const saved = await Message.create({ room, sender: id, username, text: text.trim() });
        const payload = {
          id: saved._id,
          room,
          username,
          text: saved.text,
          createdAt: saved.createdAt,
        };
        io.to(room).emit('chat:message', payload);
        appEvents.emit('chat:message', payload);
      } catch (err) {
        socket.emit('error:message', { message: 'Could not send message' });
      }
    });

    socket.on('chat:typing', ({ room } = {}) => {
      if (room) socket.to(room).emit('chat:typing', { username });
    });

    socket.on('disconnect', () => {
      const count = (online.get(id) || 1) - 1;
      if (count <= 0) {
        online.delete(id);
        io.emit('presence', { username, status: 'offline' });
      } else {
        online.set(id, count);
      }
      console.log(`[socket] ${username} disconnected`);
    });
  });
};
