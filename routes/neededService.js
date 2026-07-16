const express = require('express');
const router = express.Router();
const NeededService = require('../models/NeededService');
const auth = require('../middleware/auth');

// Default starting services
const defaultServices = [
  { name: 'Venue / Auditorium Booking', category: 'Venue', icon: '🏢' },
  { name: 'Makeup & Grooming (Groom)', category: 'Makeup', icon: '🤵' },
  { name: 'Makeup & Bridal Styling (Bride)', category: 'Makeup', icon: '💄' },
  { name: 'Photo & Video Services', category: 'Photography', icon: '📸' },
  { name: 'Event Planner / Decor Decorators', category: 'Decor', icon: '🎪' },
  { name: 'Entertainment & Music / DJ', category: 'Music', icon: '🎵' },
  { name: 'Food Catering Services', category: 'Catering', icon: '🍽️' },
  { name: 'Vehicle & Transport Logistics', category: 'Others', icon: '🚗' }
];

// GET all needed services (auto-seeds defaults if empty)
router.get('/', auth, async (req, res) => {
  try {
    let services = await NeededService.find({ weddingId: req.user.weddingId });
    if (services.length === 0) {
      // Auto-seed
      const seeded = defaultServices.map(s => ({
        ...s,
        weddingId: req.user.weddingId
      }));
      services = await NeededService.insertMany(seeded);
    }
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new needed service
router.post('/', auth, async (req, res) => {
  const { name, category, icon } = req.body;
  try {
    const service = new NeededService({
      weddingId: req.user.weddingId,
      name,
      category,
      icon: icon || '🏢'
    });
    const saved = await service.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH update needed service (completion status, name, category, icon)
router.patch('/:id', auth, async (req, res) => {
  const { name, category, icon, brideCompleted, groomCompleted } = req.body;
  try {
    const service = await NeededService.findOne({ _id: req.params.id, weddingId: req.user.weddingId });
    if (!service) return res.status(404).json({ message: 'Service not found' });

    if (name !== undefined) service.name = name;
    if (category !== undefined) service.category = category;
    if (icon !== undefined) service.icon = icon;
    if (brideCompleted !== undefined) service.brideCompleted = brideCompleted;
    if (groomCompleted !== undefined) service.groomCompleted = groomCompleted;

    const saved = await service.save();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE needed service
router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await NeededService.findOneAndDelete({ _id: req.params.id, weddingId: req.user.weddingId });
    if (!deleted) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
