const express = require('express');
const router = express.Router();
const ProgramDetail = require('../models/ProgramDetail');
const auth = require('../middleware/auth');

// Get all planning details
router.get('/', auth, async (req, res) => {
  try {
    const details = await ProgramDetail.find({ weddingId: req.user.weddingId });
    res.json(details);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create/Update detail
router.post('/', auth, async (req, res) => {
  const { category, key, value, side, mediaUrl } = req.body;
  try {
    // If the key already exists for this wedding, update it. Otherwise, create a new one.
    let detail = await ProgramDetail.findOne({
      weddingId: req.user.weddingId,
      category,
      key
    });

    if (detail) {
      detail.value = value;
      detail.side = side || detail.side;
      detail.mediaUrl = mediaUrl !== undefined ? mediaUrl : detail.mediaUrl;
      await detail.save();
    } else {
      detail = new ProgramDetail({
        weddingId: req.user.weddingId,
        category,
        key,
        value,
        side: side || req.user.side,
        mediaUrl
      });
      await detail.save();
    }
    res.status(200).json(detail);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete detail
router.delete('/:id', auth, async (req, res) => {
  try {
    const detail = await ProgramDetail.findOneAndDelete({ _id: req.params.id, weddingId: req.user.weddingId });
    if (!detail) return res.status(404).json({ message: 'Detail not found' });
    res.json({ message: 'Detail deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
