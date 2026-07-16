const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Wedding = require('../models/Wedding');
const Vendor = require('../models/Vendor');
const TimelineEvent = require('../models/TimelineEvent');
const Guest = require('../models/Guest');
const Expense = require('../models/Expense');
const ProgramDetail = require('../models/ProgramDetail');

const JWT_SECRET = process.env.JWT_SECRET || 'wedstack-secret-key-12345';

// Helper to generate token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, weddingId: user.weddingId, side: user.role === 'Planner' ? 'Shared' : user.role, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role, weddingCode, totalBudget, weddingDate } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let wedding;

    if (weddingCode) {
      // 1. Join Existing Wedding
      wedding = await Wedding.findOne({ weddingCode: weddingCode.trim().toUpperCase() });
      if (!wedding) {
        return res.status(404).json({ message: 'Wedding invite code not found.' });
      }

      // Check if slot is occupied
      if (role === 'Bride' && wedding.brideId) {
        return res.status(400).json({ message: 'Bride slot is already occupied for this wedding code.' });
      }
      if (role === 'Groom' && wedding.groomId) {
        return res.status(400).json({ message: 'Groom slot is already occupied for this wedding code.' });
      }
    } else {
      // 2. Start a New Wedding
      const randomCode = 'WED-' + Math.floor(1000 + Math.random() * 9000);
      wedding = new Wedding({
        totalBudget: Number(totalBudget) || 45000,
        budgetSplitRatio: 50,
        weddingDate: weddingDate ? new Date(weddingDate) : new Date(),
        weddingCode: randomCode
      });
      await wedding.save();
    }

    const user = new User({
      name,
      email,
      password,
      role: role || 'Bride',
      weddingId: wedding._id
    });
    await user.save();

    // Update wedding slot references
    if (user.role === 'Bride') {
      wedding.brideId = user._id;
    } else if (user.role === 'Groom') {
      wedding.groomId = user._id;
    }
    await wedding.save();

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, weddingId: user.weddingId }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, weddingId: user.weddingId }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user profile
router.get('/me', async (req, res) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ message: 'No auth token' });
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Seeding function to generate premium example data
async function seedWeddingData(weddingId) {
  // Check if already seeded
  const count = await Vendor.countDocuments({ weddingId });
  if (count > 0) return;

  // 1. Seed some Vendors
  const vendors = [
    {
      weddingId,
      sideVisibility: 'Shared',
      allowCrossView: true,
      vendorName: 'Elegance Photography',
      category: 'Photography',
      status: 'Shortlisted',
      packages: [
        {
          packageName: 'Classic Collection',
          totalCost: 3500,
          deliverables: ['8 Hours Coverage', 'Digital Album', '1 Lead Photographer'],
          finePrint: [
            { item: 'Extra Coverage Hour', costPerUnit: 200, unit: 'hour' },
            { item: 'Additional Album Spread', costPerUnit: 50, unit: 'spread' }
          ]
        },
        {
          packageName: 'Premium Cinematic',
          totalCost: 5500,
          deliverables: ['10 Hours Coverage', 'Premium Video Film', '2 Photographers', '1 Drone Pilot'],
          finePrint: [
            { item: 'Extra Coverage Hour', costPerUnit: 250, unit: 'hour' }
          ]
        }
      ]
    },
    {
      weddingId,
      sideVisibility: 'Bride',
      allowCrossView: false,
      vendorName: 'Blossom Bridal Makeup',
      category: 'Makeup',
      status: 'Booked',
      packages: [
        {
          packageName: 'Bridal Glow Pack',
          totalCost: 1200,
          deliverables: ['Airbrush Makeup', 'Hairstyling', 'Saree Draping', '1 Trial Session'],
          finePrint: [
            { item: 'Extra Bridesmaid Makeup', costPerUnit: 150, unit: 'guest' }
          ]
        }
      ]
    },
    {
      weddingId,
      sideVisibility: 'Groom',
      allowCrossView: false,
      vendorName: 'Sartorial Groom Suits',
      category: 'Events',
      status: 'Quoted',
      packages: [
        {
          packageName: 'Tuxedo Ensemble',
          totalCost: 800,
          deliverables: ['Bespoke Velvet Tuxedo', 'Shirt & Bowtie', 'Alterations included'],
          finePrint: [
            { item: 'Late Alteration Fee', costPerUnit: 100, unit: 'request' }
          ]
        }
      ]
    },
    {
      weddingId,
      sideVisibility: 'Shared',
      allowCrossView: true,
      vendorName: 'Feast & Flavour Catering',
      category: 'Catering',
      status: 'Discovered',
      packages: [
        {
          packageName: 'Deluxe Buffet',
          totalCost: 7500,
          deliverables: ['3 Course Meal', 'Soft Drinks', 'Live Pasta Station'],
          finePrint: [
            { item: 'Extra Guest Plate', costPerUnit: 45, unit: 'guest' }
          ]
        }
      ]
    }
  ];

  await Vendor.insertMany(vendors);

  // 2. Seed Timeline
  const baseDate = new Date();
  baseDate.setHours(0,0,0,0);

  const timelineEvents = [
    {
      weddingId,
      eventDay: baseDate,
      startTime: '08:00 AM',
      durationMinutes: 120,
      activityTitle: 'Bridal Makeup Session',
      assignedSide: 'Bride',
      coordinatorId: 'Maid of Honor (Jane +1-555-9011)'
    },
    {
      weddingId,
      eventDay: baseDate,
      startTime: '10:00 AM',
      durationMinutes: 60,
      activityTitle: 'Groom Preparation',
      assignedSide: 'Groom',
      coordinatorId: 'Best Man (Mark +1-555-2244)'
    },
    {
      weddingId,
      eventDay: baseDate,
      startTime: '11:30 AM',
      durationMinutes: 90,
      activityTitle: 'First Look & Portraits',
      assignedSide: 'Shared',
      coordinatorId: 'Coordinator (Sarah +1-555-4499)'
    },
    {
      weddingId,
      eventDay: baseDate,
      startTime: '01:30 PM',
      durationMinutes: 60,
      activityTitle: 'Wedding Ceremony',
      assignedSide: 'Shared',
      coordinatorId: 'Coordinator (Sarah +1-555-4499)'
    },
    {
      weddingId,
      eventDay: baseDate,
      startTime: '03:00 PM',
      durationMinutes: 120,
      activityTitle: 'Cocktail Hour & Reception Setup',
      assignedSide: 'Shared',
      coordinatorId: 'Banquet Lead (Dave +1-555-8833)'
    }
  ];

  await TimelineEvent.insertMany(timelineEvents);

  // 3. Seed Guests
  const guests = [
    { weddingId, name: 'Eleanor Vance', side: 'Bride', rsvpStatus: 'Confirmed', eventAccess: ['Ceremony', 'Reception'] },
    { weddingId, name: 'Robert Vance', side: 'Bride', rsvpStatus: 'Confirmed', eventAccess: ['Ceremony', 'Reception'] },
    { weddingId, name: 'James Miller', side: 'Groom', rsvpStatus: 'Invited', eventAccess: ['Ceremony', 'Reception'] },
    { weddingId, name: 'Clara Miller', side: 'Groom', rsvpStatus: 'Declined', eventAccess: ['Ceremony'] },
    { weddingId, name: 'Uncle George', side: 'Mutual', rsvpStatus: 'Confirmed', eventAccess: ['Ceremony', 'Reception'] }
  ];

  await Guest.insertMany(guests);

  // 4. Seed Expenses
  const expenses = [
    { weddingId, title: 'Catering downpayment deposit', amount: 3500, category: 'Catering', paidBy: 'Shared', isPaid: true, paidDate: new Date() },
    { weddingId, title: 'Photographer retainer fee', amount: 1500, category: 'Photography', paidBy: 'Bride', isPaid: true, paidDate: new Date() },
    { weddingId, title: 'Alteration fittings deposit', amount: 400, category: 'Attire', paidBy: 'Groom', isPaid: false }
  ];
  await Expense.insertMany(expenses);

  // 5. Seed Program Details
  const programDetails = [
    { weddingId, category: 'Music', key: 'Grand Entry Song', value: 'Marry You - Bruno Mars', side: 'Shared' },
    { weddingId, category: 'Music', key: 'Bride Entry Song', value: 'A Thousand Years', side: 'Bride' },
    { weddingId, category: 'Cake & Dessert', key: 'Wedding Cake Flavour', value: 'Vanilla Berry Fusion', side: 'Shared' }
  ];
  await ProgramDetail.insertMany(programDetails);
}

module.exports = router;
