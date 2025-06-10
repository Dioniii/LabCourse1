import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from 'react-router-dom';

interface Room {
  id: number;
  room_number: string;
  price: number;
}

function toIsoDate(displayDate: string) {
  if (!displayDate) return '';
  // Accepts yyyy-mm-dd from input type="date"
  if (displayDate.includes('-')) return displayDate;
  // Accepts dd/mm/yyyy
  const [d, m, y] = displayDate.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const RecentGuestsBookings = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [people, setPeople] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem('jwtToken');
        const res = await axios.get('http://localhost:8000/rooms', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRooms(res.data.data || []);
        if (res.data.data && res.data.data.length > 0) {
          setRoomId(String(res.data.data[0].id));
        }
      } catch (err) {
        setError('Failed to fetch rooms');
      }
    };
    fetchRooms();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      setSuccess('Payment completed successfully!');
      // Remove the query param from the URL after showing the alert
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE || '');
        if (!stripe) {
        setError('Stripe failed to load');
        setLoading(false);
        return;
      }
      const selectedRoom = rooms.find(r => String(r.id) === String(roomId));
      const body = {
        room_id: Number(roomId),
        check_in_date: toIsoDate(checkIn),
        check_out_date: toIsoDate(checkOut),
        number_of_guests: Number(people),
        price: selectedRoom ? selectedRoom.price : undefined,
        special_requests: specialRequests,
      };
      const token = localStorage.getItem('jwtToken');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      const response = await fetch('http://localhost:8000/api/bookings', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!data.session_id) {
        setError(data.message || 'Failed to create booking or session');
        setLoading(false);
        return;
      }
      // Set a flag in localStorage to show the popup after redirect
      localStorage.setItem('showPaymentSuccess', 'true');
      const result = await stripe.redirectToCheckout({
        sessionId: data.session_id,
      });
      if (result && result.error) {
        setError(result.error.message || 'Unknown error');
      }
    } catch (err: any) {
      setError((err && err.message) ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show popup if payment was successful and user is redirected back
  useEffect(() => {
    if (localStorage.getItem('showPaymentSuccess') === 'true') {
      setShowSuccessModal(true);
      localStorage.removeItem('showPaymentSuccess');
    }
  }, []);

  return (
    <div className="max-w-xl mx-auto mt-10">
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-black/10">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
            <h3 className="text-xl font-bold mb-4 text-green-600">Payment Successful!</h3>
            <p className="mb-6">Your payment and booking have been made successfully.</p>
            <button
              className="px-6 py-2 bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors"
              onClick={() => setShowSuccessModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Guests Bookings Reservation</h2>
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">{success}</div>
      )}
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-theme-md dark:border-white/[0.05] dark:bg-white/[0.03]">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Room</label>
            <select
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              required
            >
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  Room {room.room_number}
                </option>
              ))}
            </select>
            {roomId && (
              <div className="mt-2 text-sm text-gray-600">
                Price: $
                {(() => {
                  const selected = rooms.find(r => String(r.id) === String(roomId));
                  return selected ? selected.price.toFixed(2) : '--';
                })()}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Check-in Date</label>
              <input
                type="date"
                value={checkIn}
                onChange={e => setCheckIn(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Check-out Date</label>
              <input
                type="date"
                value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount of People</label>
            <input
              type="number"
              min={1}
              value={people}
              onChange={e => setPeople(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Special Requests</label>
            <textarea
              value={specialRequests}
              onChange={e => setSpecialRequests(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              rows={2}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-brand-500 px-6 py-2 text-white font-medium hover:bg-brand-600 transition-colors"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Continue to Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecentGuestsBookings;