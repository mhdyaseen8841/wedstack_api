const express = require('express');
const router = express.Router();
const Guest = require('../models/Guest');
const auth = require('../middleware/auth');

// Get all guests
router.get('/', auth, async (req, res) => {
  try {
    const guests = await Guest.find({ weddingId: req.user.weddingId });
    res.json(guests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create guest
router.post('/', auth, async (req, res) => {
  const { name, side, rsvpStatus, eventAccess } = req.body;
  try {
    const guest = new Guest({
      weddingId: req.user.weddingId,
      name,
      side: side || (req.user.side === 'Shared' ? 'Mutual' : req.user.side),
      rsvpStatus: rsvpStatus || 'Invited',
      eventAccess: eventAccess || []
    });
    await guest.save();
    res.status(201).json(guest);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update guest
router.patch('/:id', auth, async (req, res) => {
  try {
    const guest = await Guest.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.user.weddingId },
      req.body,
      { new: true }
    );
    if (!guest) return res.status(404).json({ message: 'Guest not found' });
    res.json(guest);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete guest
router.delete('/:id', auth, async (req, res) => {
  try {
    const guest = await Guest.findOneAndDelete({ _id: req.params.id, weddingId: req.user.weddingId });
    if (!guest) return res.status(404).json({ message: 'Guest not found' });
    res.json({ message: 'Guest deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
