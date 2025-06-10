import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Room {
  id: number;
  room_number: string;
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setLoading(true);
    try {
      const token = localStorage.getItem('jwtToken');
      await axios.post(
        'http://localhost:8000/api/bookings',
        {
          room_id: Number(roomId),
          check_in_date: toIsoDate(checkIn),
          check_out_date: toIsoDate(checkOut),
          number_of_guests: Number(people),
          special_requests: specialRequests,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Booking created successfully!');
      setCheckIn('');
      setCheckOut('');
      setPeople(1);
      setSpecialRequests('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Guests Bookings Reservation</h2>
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">{success}</div>
      )}
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-theme-md dark:border-white/[0.05] dark:bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="space-y-6">
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
              {loading ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecentGuestsBookings;