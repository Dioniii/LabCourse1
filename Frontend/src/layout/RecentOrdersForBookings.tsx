import React, { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import { loadStripe } from '@stripe/stripe-js';

interface Booking {
  id: number;
  user_name: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string;
  status_name: string;
  total_amount: number;
  room_id: number;
  number_of_guests: number;
  special_requests: string;
}

interface Room {
  id: number;
  room_number: string;
  price: number;
}

// Utility functions for date conversion
function toDisplayDate(isoDate: string) {
  if (!isoDate) return '';
  // Handle ISO strings with time (e.g., 2024-07-20T00:00:00.000Z)
  const dateObj = new Date(isoDate);
  if (isNaN(dateObj.getTime())) return isoDate; // fallback if invalid
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}
function toIsoDate(displayDate: string) {
  if (!displayDate) return '';
  const [d, m, y] = displayDate.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const RecentOrdersForBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    room_id: "",
    check_in_date: "",
    check_out_date: "",
    number_of_guests: 1,
    special_requests: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete Booking State
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit Booking State
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    room_id: "",
    check_in_date: "",
    check_out_date: "",
    number_of_guests: 1,
    special_requests: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
    fetchRooms();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("jwtToken");
      const res = await axios.get("http://localhost:8000/api/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter out completed bookings
      const activeBookings = (res.data.data || []).filter(
        (booking: Booking) => booking.status_name !== "Completed"
      );
      setBookings(activeBookings);
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string }>;
      setError(axiosError.response?.data?.error || "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      const res = await axios.get("http://localhost:8000/rooms", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(res.data.data || []);
    } catch (err) {
      // ignore for now
    }
  };

  // Create Booking Handlers
  const openCreateModal = () => {
    setCreateForm({
      room_id: rooms.length > 0 ? String(rooms[0].id) : "",
      check_in_date: "",
      check_out_date: "",
      number_of_guests: 1,
      special_requests: "",
    });
    setCreateError(null);
    setShowCreateModal(true);
  };
  const closeCreateModal = () => setShowCreateModal(false);

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCreateForm((prev) => {
      if (name === 'check_in_date' || name === 'check_out_date') {
        // Accept dd/mm/yyyy and store as such in state
        return { ...prev, [name]: value.replace(/[^\d/]/g, '').slice(0, 10) };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE || '');
      if (!stripe) {
        setCreateError('Stripe failed to load');
        setCreateLoading(false);
        return;
      }
      const selectedRoom = rooms.find(r => String(r.id) === String(createForm.room_id));
      const body = {
        room_id: Number(createForm.room_id),
        check_in_date: toIsoDate(createForm.check_in_date),
        check_out_date: toIsoDate(createForm.check_out_date),
        number_of_guests: Number(createForm.number_of_guests),
        price: selectedRoom ? selectedRoom.price : undefined,
        special_requests: createForm.special_requests,
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
        setCreateError(data.message || 'Failed to create booking or session');
        setCreateLoading(false);
        return;
      }
      // Set a flag in localStorage to show the popup after redirect
      localStorage.setItem('showPaymentSuccess', 'true');
      const result = await stripe.redirectToCheckout({
        sessionId: data.session_id,
      });
      if (result && result.error) {
        setCreateError(result.error.message || 'Unknown error');
      }
    } catch (err: any) {
      setCreateError((err && err.message) ? err.message : 'An error occurred');
    } finally {
      setCreateLoading(false);
    }
  };

  // Delete Booking Handlers
  const openDeleteModal = (id: number) => {
    setDeleteId(id);
    setDeleteError(null);
  };
  const closeDeleteModal = () => {
    setDeleteId(null);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const token = localStorage.getItem("jwtToken");
      await axios.delete(`http://localhost:8000/api/bookings/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      closeDeleteModal();
      fetchBookings();
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setDeleteError(error.response?.data?.message || "Failed to delete booking");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Edit Booking Handlers
  const openEditModal = (booking: Booking) => {
    setEditId(booking.id);
    setEditForm({
      room_id: String(booking.room_id),
      check_in_date: toDisplayDate(booking.check_in_date),
      check_out_date: toDisplayDate(booking.check_out_date),
      number_of_guests: booking.number_of_guests,
      special_requests: booking.special_requests || "",
    });
    setEditError(null);
  };
  const closeEditModal = () => {
    setEditId(null);
    setEditError(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => {
      if (name === 'check_in_date' || name === 'check_out_date') {
        return { ...prev, [name]: value.replace(/[^\d/]/g, '').slice(0, 10) };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const token = localStorage.getItem("jwtToken");
      await axios.put(
        `http://localhost:8000/api/bookings/${editId}`,
        {
          room_id: Number(editForm.room_id),
          check_in_date: toIsoDate(editForm.check_in_date),
          check_out_date: toIsoDate(editForm.check_out_date),
          number_of_guests: Number(editForm.number_of_guests),
          special_requests: editForm.special_requests,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      closeEditModal();
      fetchBookings();
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setEditError(error.response?.data?.message || "Failed to update booking");
    } finally {
      setEditLoading(false);
    }
  };

  // Filtered bookings
  const filteredBookings = bookings.filter(
    (booking) =>
      booking.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.room_number?.toString().includes(searchTerm)
  );

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  // Statistics
  const total = bookings.length;
  const confirmed = bookings.filter((b) => b.status_name === "Confirmed").length;
  const pending = bookings.filter((b) => b.status_name === "Pending").length;
  const cancelled = bookings.filter((b) => b.status_name === "Cancelled").length;

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Bookings</h2>
          <p className="text-gray-600 dark:text-gray-400">Latest bookings in the system</p>
        </div>
        <button
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          onClick={openCreateModal}
        >
          + Create Booking
        </button>
      </div>

      {/* Create Booking Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm bg-white/30">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-md p-6 relative mt-20">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
              onClick={closeCreateModal}
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create Booking</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Room</label>
                <select
                  name="room_id"
                  value={createForm.room_id}
                  onChange={handleCreateChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:bg-gray-800 dark:text-white"
                  required
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.room_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Check-in Date</label>
                <input
                  type="text"
                  name="check_in_date"
                  value={createForm.check_in_date}
                  onChange={handleCreateChange}
                  placeholder="dd/mm/yyyy"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Check-out Date</label>
                <input
                  type="text"
                  name="check_out_date"
                  value={createForm.check_out_date}
                  onChange={handleCreateChange}
                  placeholder="dd/mm/yyyy"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Number of Guests</label>
                <input
                  type="number"
                  name="number_of_guests"
                  min={1}
                  value={createForm.number_of_guests}
                  onChange={handleCreateChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Special Requests</label>
                <textarea
                  name="special_requests"
                  value={createForm.special_requests}
                  onChange={handleCreateChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:bg-gray-800 dark:text-white"
                  rows={2}
                />
              </div>
              {createError && <div className="text-red-500 text-sm">{createError}</div>}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  {createLoading ? "Creating..." : "Create Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Bookings</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{total}</h3>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Confirmed</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{confirmed}</h3>
            </div>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{pending}</h3>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900">
              <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cancelled</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{cancelled}</h3>
            </div>
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Pagination Controls */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-1/3">
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
              <span className="text-sm text-gray-600 dark:text-gray-400">entries</span>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="max-w-full overflow-x-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading bookings...</div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : (
            <table className="min-w-full">
              <thead className="border-b border-gray-100 dark:border-white/[0.05]">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-500 text-start">ID</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-start">Guest Name</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-start">Room</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-start">Check-in</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-start">Check-out</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-start">Status</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-start">Total</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-start">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {currentBookings.length > 0 ? (
                  currentBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-5 py-4 text-start font-medium">{booking.id}</td>
                      <td className="px-5 py-4 text-start">{booking.user_name}</td>
                      <td className="px-5 py-4 text-start">Room {booking.room_number}</td>
                      <td className="px-5 py-4 text-start">{toDisplayDate(booking.check_in_date)}</td>
                      <td className="px-5 py-4 text-start">{toDisplayDate(booking.check_out_date)}</td>
                      <td className="px-5 py-4 text-start">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                          ${booking.status_name === "Confirmed" ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            booking.status_name === "Pending" ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                          {booking.status_name}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-start">${booking.total_amount.toFixed(2)}</td>
                      <td className="px-5 py-4 text-start">
                        <div className="flex space-x-2">
                          <button
                            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                            onClick={() => openEditModal(booking)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                            onClick={() => openDeleteModal(booking.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-4 text-center text-gray-500">No bookings found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-end items-center gap-2 p-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${currentPage === page ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}
            >
              {page}
            </button>
          ))}
        </div>
      </div>

      {/* Delete Booking Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm bg-white/30">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-sm p-6 relative mt-20">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
              onClick={closeDeleteModal}
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Delete Booking</h3>
            <p className="mb-4 text-gray-700 dark:text-gray-300">Are you sure you want to delete this booking?</p>
            {deleteError && <div className="text-red-500 text-sm mb-2">{deleteError}</div>}
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-800 font-medium hover:bg-gray-300"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-white font-medium hover:bg-red-600 disabled:opacity-60"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {editId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm bg-white/30">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-md p-6 relative mt-20">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
              onClick={closeEditModal}
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Edit Booking</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Room</label>
                <select
                  name="room_id"
                  value={editForm.room_id}
                  onChange={handleEditChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:bg-gray-800 dark:text-white"
                  required
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.room_number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Check-in</label>
                  <input
                    type="text"
                    name="check_in_date"
                    value={editForm.check_in_date}
                    onChange={handleEditChange}
                    placeholder="dd/mm/yyyy"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Check-out</label>
                  <input
                    type="text"
                    name="check_out_date"
                    value={editForm.check_out_date}
                    onChange={handleEditChange}
                    placeholder="dd/mm/yyyy"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Number of Guests</label>
                <input
                  type="number"
                  name="number_of_guests"
                  min={1}
                  value={editForm.number_of_guests}
                  onChange={handleEditChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Special Requests</label>
                <textarea
                  name="special_requests"
                  value={editForm.special_requests}
                  onChange={handleEditChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:bg-gray-800 dark:text-white"
                  rows={2}
                />
              </div>
              {editError && <div className="text-red-500 text-sm">{editError}</div>}
              <button
                type="submit"
                className="w-full rounded-lg bg-brand-500 px-4 py-2 text-white font-medium hover:bg-brand-600 disabled:opacity-60"
                disabled={editLoading}
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentOrdersForBookings;

  