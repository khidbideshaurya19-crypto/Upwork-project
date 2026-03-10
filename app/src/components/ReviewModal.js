import React, { useState } from 'react';
import './ReviewModal.css';

const StarRating = ({ rating, onRate, size = 28, interactive = true }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="star-rating" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          className={`star ${star <= (interactive ? (hover || rating) : rating) ? 'star-filled' : 'star-empty'}`}
          onClick={() => interactive && onRate && onRate(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          style={{ cursor: interactive ? 'pointer' : 'default' }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const ReviewModal = ({ isOpen, onClose, onSubmit, contractTitle, revieweeName }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ rating, comment });
      setRating(0);
      setComment('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal" onClick={e => e.stopPropagation()}>
        <div className="review-modal-header">
          <h2>Leave a Review</h2>
          <button className="review-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="review-modal-body">
          <p className="review-for">
            Review for <strong>{revieweeName}</strong>
          </p>
          {contractTitle && (
            <p className="review-project">Project: {contractTitle}</p>
          )}

          <div className="review-rating-section">
            <label>Your Rating</label>
            <StarRating rating={rating} onRate={setRating} size={36} />
            <span className="rating-label">
              {rating === 0 && 'Select a rating'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </span>
          </div>

          <div className="review-comment-section">
            <label>Your Review (optional)</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Share your experience working together..."
              rows={4}
              maxLength={1000}
            />
            <span className="char-count">{comment.length}/1000</span>
          </div>

          {error && <div className="review-error">{error}</div>}
        </div>

        <div className="review-modal-footer">
          <button className="review-btn-cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="review-btn-submit"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
};

export { StarRating };
export default ReviewModal;
