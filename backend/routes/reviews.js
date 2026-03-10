const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Contract = require('../models/Contract');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Helper: recalculate aggregate rating for a user
async function recalcRating(userId) {
  const reviews = await Review.find({ revieweeId: userId });
  if (reviews.length === 0) {
    await User.findByIdAndUpdate(userId, {
      $set: { rating: 0, reviewCount: 0, topRated: false }
    });
    return;
  }
  const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  const avg = Math.round((total / reviews.length) * 10) / 10; // 1 decimal
  const topRated = reviews.length >= 3 && avg >= 4.5;
  await User.findByIdAndUpdate(userId, {
    $set: { rating: avg, reviewCount: reviews.length, topRated }
  });
}

// ═══════════════════════════════════════
// POST /api/reviews — Submit a review after contract completion
// ═══════════════════════════════════════
router.post('/', auth, async (req, res) => {
  try {
    const { contractId, rating, comment } = req.body;

    if (!contractId || !rating) {
      return res.status(400).json({ message: 'contractId and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Find the contract
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    if (contract.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed contracts' });
    }

    // Determine reviewer / reviewee
    const reviewerId = req.userId;
    let revieweeId, reviewerRole;

    if (contract.clientId === reviewerId) {
      revieweeId = contract.companyId;
      reviewerRole = 'client';
    } else if (contract.companyId === reviewerId) {
      revieweeId = contract.clientId;
      reviewerRole = 'company';
    } else {
      return res.status(403).json({ message: 'You are not part of this contract' });
    }

    // Check for duplicate review
    const existing = await Review.findOne({ contractId, reviewerId });
    if (existing) {
      return res.status(400).json({ message: 'You have already reviewed this contract' });
    }

    // Fetch names for display
    const [reviewer, reviewee] = await Promise.all([
      User.findById(reviewerId),
      User.findById(revieweeId)
    ]);

    const review = new Review({
      contractId,
      projectId: contract.projectId,
      reviewerId,
      revieweeId,
      reviewerRole,
      reviewerName: reviewer ? (reviewer.companyName || reviewer.name) : 'Unknown',
      revieweeName: reviewee ? (reviewee.companyName || reviewee.name) : 'Unknown',
      rating: Number(rating),
      comment: (comment || '').trim(),
    });
    await review.save();

    // Recalculate aggregate rating
    await recalcRating(revieweeId);

    res.status(201).json({ message: 'Review submitted successfully', review: review.toJSON() });
  } catch (err) {
    console.error('Submit review error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════
// GET /api/reviews/user/:userId — Get all reviews for a user
// ═══════════════════════════════════════
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ revieweeId: req.params.userId });
    // Sort newest first
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ reviews: reviews.map(r => r.toJSON()) });
  } catch (err) {
    console.error('Get user reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════
// GET /api/reviews/contract/:contractId — Get reviews for a contract
// ═══════════════════════════════════════
router.get('/contract/:contractId', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ contractId: req.params.contractId });
    res.json({ reviews: reviews.map(r => r.toJSON()) });
  } catch (err) {
    console.error('Get contract reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════
// GET /api/reviews/check/:contractId — Check if current user already reviewed
// ═══════════════════════════════════════
router.get('/check/:contractId', auth, async (req, res) => {
  try {
    const existing = await Review.findOne({
      contractId: req.params.contractId,
      reviewerId: req.userId
    });
    res.json({ hasReviewed: !!existing, review: existing ? existing.toJSON() : null });
  } catch (err) {
    console.error('Check review error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════
// GET /api/reviews/summary/:userId — Get aggregate rating summary
// ═══════════════════════════════════════
router.get('/summary/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ revieweeId: req.params.userId });
    if (reviews.length === 0) {
      return res.json({
        averageRating: 0,
        totalReviews: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        topRated: false
      });
    }

    const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const avg = Math.round((total / reviews.length) * 10) / 10;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.round(r.rating);
      if (distribution[star] !== undefined) distribution[star]++;
    });
    const topRated = reviews.length >= 3 && avg >= 4.5;

    res.json({
      averageRating: avg,
      totalReviews: reviews.length,
      distribution,
      topRated
    });
  } catch (err) {
    console.error('Get review summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
