import React, { useState } from 'react';

const RecentGuestsBookings = () => {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [people, setPeople] = useState(1);
  const [roomType, setRoomType] = useState('Single');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ checkIn: '', checkOut: '', people: 1, roomType: 'Single' });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormData({ checkIn, checkOut, people, roomType });
    setShowModal(true);
  };

  const handlePaymentChoice = (choice: string) => {
    setShowModal(false);
    alert(
      `Check-in: ${formData.checkIn}\nCheck-out: ${formData.checkOut}\nAmount of People: ${formData.people}\nType of Room: ${formData.roomType}\nPayment: ${choice}`
    );
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Guests Bookings Reservation</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-theme-md dark:border-white/[0.05] dark:bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Type of Room</label>
            <select
              value={roomType}
              onChange={e => setRoomType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="Single">Single</option>
              <option value="Double">Double</option>
              <option value="Suite">Suite</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-brand-500 px-6 py-2 text-white font-medium hover:bg-brand-600 transition-colors"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">How would you like to pay?</h3>
            <p className="mb-6 text-gray-700">Would you like to pay right now or pay when checking in the hotel?</p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => handlePaymentChoice('Pay Now')}
                className="rounded-lg bg-brand-500 px-4 py-2 text-white font-medium hover:bg-brand-600 transition-colors"
              >
                Pay Now
              </button>
              <button
                onClick={() => handlePaymentChoice('Pay at Check-in')}
                className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
              >
                Pay at Check-in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentGuestsBookings;