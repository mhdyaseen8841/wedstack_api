const express = require('express');
const router = express.Router();
const Wedding = require('../models/Wedding');
const Vendor = require('../models/Vendor');
const TimelineEvent = require('../models/TimelineEvent');
const auth = require('../middleware/auth');

// Get current wedding profile
router.get('/', auth, async (req, res) => {
  try {
    const wedding = await Wedding.findById(req.user.weddingId)
      .populate('brideId', 'name email')
      .populate('groomId', 'name email');
    if (!wedding) return res.status(404).json({ message: 'Wedding profile not found' });
    res.json(wedding);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update wedding profile (budget, ratio, date, permissions)
router.patch('/', auth, async (req, res) => {
  const { 
    totalBudget, 
    budgetSplitRatio, 
    groomBudget,
    brideBudget,
    weddingDate,
    brideAllowsMutual,
    groomAllowsMutual,
    brideAllowsLedgerShare,
    groomAllowsLedgerShare,
    brideCompletedServices,
    groomCompletedServices
  } = req.body;
  try {
    const wedding = await Wedding.findById(req.user.weddingId);
    if (!wedding) return res.status(404).json({ message: 'Wedding profile not found' });

    if (totalBudget !== undefined) wedding.totalBudget = totalBudget;
    if (budgetSplitRatio !== undefined) wedding.budgetSplitRatio = budgetSplitRatio;
    if (groomBudget !== undefined) wedding.groomBudget = groomBudget;
    if (brideBudget !== undefined) wedding.brideBudget = brideBudget;
    if (weddingDate !== undefined) wedding.weddingDate = weddingDate;
    if (brideAllowsMutual !== undefined) wedding.brideAllowsMutual = brideAllowsMutual;
    if (groomAllowsMutual !== undefined) wedding.groomAllowsMutual = groomAllowsMutual;
    if (brideAllowsLedgerShare !== undefined) wedding.brideAllowsLedgerShare = brideAllowsLedgerShare;
    if (groomAllowsLedgerShare !== undefined) wedding.groomAllowsLedgerShare = groomAllowsLedgerShare;
    if (brideCompletedServices !== undefined) wedding.brideCompletedServices = brideCompletedServices;
    if (groomCompletedServices !== undefined) wedding.groomCompletedServices = groomCompletedServices;

    await wedding.save();
    res.json(wedding);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Public read-only viewport endpoint for Coordinators
// Bypass auth. Target wedding is determined by the hash parameter (which is the weddingId)
router.get('/public-portal/:hash', async (req, res) => {
  try {
    const weddingId = req.params.hash;
    const wedding = await Wedding.findById(weddingId);
    if (!wedding) {
      return res.status(404).json({ message: 'Invalid token or wedding not found' });
    }

    // Fetch timeline events sorted by day and time
    const events = await TimelineEvent.find({ weddingId }).sort({ eventDay: 1 });
    
    // Fetch only shortlisted or booked vendors (vendors who have financial commitments/day-of tasks)
    const vendors = await Vendor.find({
      weddingId,
      status: { $in: ['Booked', 'Shortlisted'] }
    });

    res.json({
      wedding: {
        totalBudget: wedding.totalBudget,
        budgetSplitRatio: wedding.budgetSplitRatio
      },
      timeline: events,
      vendors: vendors.map(v => ({
        vendorName: v.vendorName,
        category: v.category,
        status: v.status,
        packages: v.packages,
        sideVisibility: v.sideVisibility
      }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Public portal load error: ' + err.message });
  }
});

module.exports = router;
