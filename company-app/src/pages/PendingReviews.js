import React, { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import ReviewModal from '../components/ReviewModal';
import api from '../utils/api';
import './PendingReviews.css';

const PendingReviews = () => {
  const [loading, setLoading] = useState(true);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [activeReview, setActiveReview] = useState(null);

  const fetchPendingReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/reviews/pending/me');
      setPendingReviews(res.data.pendingReviews || []);
    } catch (error) {
      console.error('Fetch pending reviews error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingReviews();
  }, [fetchPendingReviews]);

  const parseDate = (d) => {
    if (!d) return 'N/A';
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? 'N/A' : dt.toLocaleDateString();
  };

  const handleSubmitReview = async ({ rating, comment }) => {
    if (!activeReview) return;
    await api.post('/reviews', {
      contractId: activeReview.contractId,
      rating,
      comment
    });
    setActiveReview(null);
    fetchPendingReviews();
  };

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="pending-reviews-container">
        <div className="pending-reviews-header">
          <h1>Leave Your Reviews Now</h1>
          <p>These completed contracts are waiting for your feedback.</p>
        </div>

        {loading ? (
          <div className="pending-reviews-empty">Loading pending reviews...</div>
        ) : pendingReviews.length === 0 ? (
          <div className="pending-reviews-empty">No pending reviews right now.</div>
        ) : (
          <div className="pending-reviews-list">
            {pendingReviews.map((item) => (
              <div key={item.contractId} className="pending-review-card">
                <div>
                  <h3>{item.projectTitle}</h3>
                  <p>Review for: <strong>{item.reviewee?.name || 'User'}</strong></p>
                  <p>Completed on: {parseDate(item.completedAt)}</p>
                </div>
                <button
                  className="pending-review-btn"
                  onClick={() => setActiveReview(item)}
                >
                  Leave Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ReviewModal
        isOpen={!!activeReview}
        onClose={() => setActiveReview(null)}
        onSubmit={handleSubmitReview}
        contractTitle={activeReview?.projectTitle}
        revieweeName={activeReview?.reviewee?.name}
      />
    </div>
  );
};

export default PendingReviews;
