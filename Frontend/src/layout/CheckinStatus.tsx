import React, { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";

interface Booking {
  id: number;
  user_name: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string;
  status_name: string;
  special_requests: string;
  guest_email: string;
  room_id: number;
}

const CheckinStatus = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await axios.get("http://localhost:8000/api/bookings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter out completed and cancelled bookings
      const activeBookings = (response.data.data || []).filter(
        (booking: Booking) => booking.status_name === "Pending" || booking.status_name === "Confirmed"
      );
      setBookings(activeBookings);
      setError(null);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  // Handler for check-in/out button
  const handleAction = async (booking: Booking, action: 'check-in' | 'check-out') => {
    try {
      const token = localStorage.getItem("jwtToken");
      setError(null); // Clear any existing errors
      
      // Update booking status using the new endpoint
      const response = await axios.put(
        `http://localhost:8000/api/bookings/${booking.id}/status`,
        {
          status_id: action === 'check-in' ? 1 : 4, // 1 for Confirmed, 4 for Completed
          notes: action === 'check-in' 
            ? `Checked in at ${new Date().toISOString()}`
            : `Checked out at ${new Date().toISOString()}`
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        await fetchBookings(); // Refresh the bookings list only on success
      } else {
        setError(response.data.message || `Failed to ${action} guest`);
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || `Failed to ${action} guest`);
      await fetchBookings(); // Refresh the list even on error to ensure UI is in sync
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
          Check-in/out Status
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Lista e klientëve që hyjnë ose dalin sot
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b">
                #
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b">
                Klienti
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b">
                Dhoma
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b">
                Check-In
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b">
                Check-Out
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b">
                Statusi
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b">
                Special Requests
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {bookings.length > 0 ? (
              bookings.map((booking, idx) => (
                <tr key={booking.id} className="hover:bg-gray-100 dark:hover:bg-gray-600">
                  <td className="px-3 py-2 text-gray-900 dark:text-white font-medium">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                    {booking.user_name}
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                    {booking.room_number}
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                    {new Date(booking.check_in_date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                    {new Date(booking.check_out_date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-block rounded-full text-xs font-semibold
                        ${
                          booking.status_name === "Confirmed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }
                      `}
                    >
                      {booking.status_name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                    {booking.special_requests || "-"}
                  </td>
                  <td className="px-3 py-2">
                    {booking.status_name === "Pending" ? (
                      <button
                        onClick={() => handleAction(booking, 'check-in')}
                        className="rounded bg-green-600 text-white px-4 py-1 text-xs font-medium hover:bg-green-700 transition-colors min-w-[90px]"
                      >
                        Check-in
                      </button>
                    ) : booking.status_name === "Confirmed" ? (
                      <button
                        onClick={() => handleAction(booking, 'check-out')}
                        className="rounded bg-red-600 text-white px-4 py-1 text-xs font-medium hover:bg-red-700 transition-colors min-w-[90px]"
                      >
                        Check-out
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-4 text-gray-500 dark:text-gray-400">
                  Nuk ka të dhëna për check-in/out për kërkimin tuaj.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CheckinStatus;
