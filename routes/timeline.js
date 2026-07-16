const express = require('express');
const router = express.Router();
const TimelineEvent = require('../models/TimelineEvent');
const auth = require('../middleware/auth');

// Helper to convert "HH:MM AM/PM" to minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + minutes;
}

// Helper to convert minutes from midnight to "HH:MM AM/PM"
function minutesToTime(mins) {
  // Clamp to 24h wrap
  const totalMins = (mins + 1440) % 1440;
  let hours = Math.floor(totalMins / 60);
  const minutes = totalMins % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  
  const paddedMins = minutes.toString().padStart(2, '0');
  const paddedHours = displayHours.toString().padStart(2, '0');
  
  return `${paddedHours}:${paddedMins} ${ampm}`;
}

// Get all timeline events
router.get('/', auth, async (req, res) => {
  const { weddingId, side } = req.user;
  try {
    const events = await TimelineEvent.find({ weddingId }).sort({ eventDay: 1 });
    
    // Sort events by time on the server
    const sortedEvents = events.sort((a, b) => {
      const dateA = new Date(a.eventDay).getTime();
      const dateB = new Date(b.eventDay).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    res.json(sortedEvents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create timeline event
router.post('/', auth, async (req, res) => {
  const { weddingId } = req.user;
  const { eventDay, startTime, durationMinutes, activityTitle, assignedSide, coordinatorId, linkedVendorId, locationName, coordinates } = req.body;
  try {
    const newEvent = new TimelineEvent({
      weddingId,
      eventDay: eventDay || new Date(),
      startTime: startTime || '09:00 AM',
      durationMinutes: durationMinutes || 30,
      activityTitle,
      assignedSide: assignedSide || 'Shared',
      coordinatorId: coordinatorId || 'General Coordinator',
      linkedVendorId: linkedVendorId || null,
      locationName: locationName || '',
      coordinates: coordinates || ''
    });
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update single event
router.patch('/:id', auth, async (req, res) => {
  try {
    const event = await TimelineEvent.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.user.weddingId },
      req.body,
      { new: true }
    );
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Dynamic Cascading Time Sync
// PATCH /api/timeline/shift-time
router.patch('/shift-time', auth, async (req, res) => {
  const { eventId, shiftMinutes } = req.body;
  
  if (!eventId || typeof shiftMinutes !== 'number') {
    return res.status(400).json({ message: 'eventId and shiftMinutes are required' });
  }

  try {
    // 1. Find the target event
    const sourceEvent = await TimelineEvent.findOne({ _id: eventId, weddingId: req.user.weddingId });
    if (!sourceEvent) {
      return res.status(404).json({ message: 'Source timeline event not found' });
    }

    const sourceMinutes = timeToMinutes(sourceEvent.startTime);
    const eventDate = new Date(sourceEvent.eventDay);

    // 2. Query all events for the same wedding day
    const sameDayEvents = await TimelineEvent.find({
      weddingId: req.user.weddingId,
      eventDay: {
        $gte: new Date(eventDate.setHours(0, 0, 0, 0)),
        $lte: new Date(eventDate.setHours(23, 59, 59, 999))
      }
    });

    const updatedEvents = [];

    // 3. Shift source event and subsequent events
    for (const ev of sameDayEvents) {
      const evMins = timeToMinutes(ev.startTime);
      // Shift if it's the source event OR if it starts after the source event
      if (ev._id.toString() === eventId || evMins >= sourceMinutes) {
        const newMins = evMins + shiftMinutes;
        ev.startTime = minutesToTime(newMins);
        await ev.save();
        updatedEvents.push(ev);
      }
    }

    res.json({
      message: `Shifted ${updatedEvents.length} events successfully.`,
      updatedEvents
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete timeline event
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await TimelineEvent.findOneAndDelete({ _id: req.params.id, weddingId: req.user.weddingId });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
