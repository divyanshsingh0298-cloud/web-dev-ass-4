const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/Note');
const { authenticate } = require('../middleware/auth');
const { appEvents } = require('../events/appEvents');

const router = express.Router();
router.use(authenticate); // every notes route is protected

const validId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid note id' });
  }
  next();
};

// A user may only touch their own notes; admins may touch any
const canAccess = (note, user) => note.owner.toString() === user.id || user.role === 'admin';

// CREATE
router.post('/', async (req, res) => {
  const { title, content } = req.body;
  if (!title) return res.status(400).json({ message: 'title is required' });

  const note = await Note.create({ title, content, owner: req.user.id });
  appEvents.emit('note:created', note);
  res.status(201).json(note);
});

// READ ALL (own notes; admin can pass ?all=true)
router.get('/', async (req, res) => {
  const filter = req.user.role === 'admin' && req.query.all === 'true' ? {} : { owner: req.user.id };
  const notes = await Note.find(filter).sort({ createdAt: -1 });
  res.json(notes);
});

// READ ONE
router.get('/:id', validId, async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  if (!canAccess(note, req.user)) return res.status(403).json({ message: 'Forbidden' });
  res.json(note);
});

// UPDATE
router.put('/:id', validId, async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  if (!canAccess(note, req.user)) return res.status(403).json({ message: 'Forbidden' });

  if (req.body.title !== undefined) note.title = req.body.title;
  if (req.body.content !== undefined) note.content = req.body.content;
  await note.save();

  appEvents.emit('note:updated', note);
  res.json(note);
});

// DELETE
router.delete('/:id', validId, async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  if (!canAccess(note, req.user)) return res.status(403).json({ message: 'Forbidden' });

  await note.deleteOne();
  appEvents.emit('note:deleted', note);
  res.json({ message: 'Note deleted' });
});

module.exports = router;
