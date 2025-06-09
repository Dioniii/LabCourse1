import React, { useState } from "react";

const RecentOrdersForBookings = () => {
  const bookings = [
    { clientName: "Ardian Hoxha", roomNumber: 101, date: "2025-01-15", status: "Confirmed" },
    { clientName: "Maria Garcia", roomNumber: 205, date: "2025-01-16", status: "Confirmed" },
    { clientName: "John Smith", roomNumber: 312, date: "2025-01-17", status: "Pending" },
    { clientName: "Anna Kowalski", roomNumber: 108, date: "2025-01-18", status: "Confirmed" },
    { clientName: "Carlos Rodriguez", roomNumber: 401, date: "2025-01-19", status: "Cancelled" },
    { clientName: "Sarah Johnson", roomNumber: 203, date: "2025-01-20", status: "Confirmed" },
    { clientName: "Michael Brown", roomNumber: 507, date: "2025-01-21", status: "Pending" },
    { clientName: "Elena Petrova", roomNumber: 304, date: "2025-01-22", status: "Confirmed" },
    { clientName: "David Wilson", roomNumber: 601, date: "2025-01-23", status: "Confirmed" },
    { clientName: "Lisa Anderson", roomNumber: 409, date: "2025-01-24", status: "Pending" },
    { clientName: "Robert Taylor", roomNumber: 215, date: "2025-01-25", status: "Confirmed" },
    { clientName: "Sofia Martinez", roomNumber: 308, date: "2025-01-26", status: "Confirmed" },
    { clientName: "James Lee", roomNumber: 502, date: "2025-01-27", status: "Cancelled" },
    { clientName: "Emma Davis", roomNumber: 117, date: "2025-01-28", status: "Confirmed" },
    { clientName: "Thomas Miller", roomNumber: 406, date: "2025-01-29", status: "Pending" },
    { clientName: "Isabella White", roomNumber: 209, date: "2025-01-30", status: "Confirmed" },
    { clientName: "Daniel Clark", roomNumber: 513, date: "2025-01-31", status: "Confirmed" },
    { clientName: "Olivia Hall", roomNumber: 301, date: "2025-02-01", status: "Pending" },
    { clientName: "William Turner", roomNumber: 604, date: "2025-02-02", status: "Confirmed" },
    { clientName: "Ava Moore", roomNumber: 207, date: "2025-02-03", status: "Confirmed" }
  ];

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredBookings = bookings.filter(
    (booking) =>
      booking.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.roomNumber.toString().includes(searchTerm)
  );

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Bookings</h2>
        <p className="text-gray-600 dark:text-gray-400">Lista e rezervimeve të fundit</p>
      </div>

      {/* Booking Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Bookings</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{bookings.length}</h3>
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
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {bookings.filter(booking => booking.status === "Confirmed").length}
              </h3>
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
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {bookings.filter(booking => booking.status === "Pending").length}
              </h3>
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
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {bookings.filter(booking => booking.status === "Cancelled").length}
              </h3>
            </div>
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

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

        <div className="max-w-full overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                <th className="px-5 py-3 font-medium text-gray-500 text-start">ID</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-start">Client Name</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-start">Room</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-start">Date</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-start">Status</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-start">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {currentBookings.length > 0 ? (
                currentBookings.map((booking, idx) => (
                  <tr key={idx}>
                    <td className="px-5 py-4 text-start font-medium">{indexOfFirstItem + idx + 1}</td>
                    <td className="px-5 py-4 text-start">{booking.clientName}</td>
                    <td className="px-5 py-4 text-start">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        Room {booking.roomNumber}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-start">
                      {new Date(booking.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-5 py-4 text-start">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                        ${booking.status === "Confirmed" ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          booking.status === "Pending" ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-start">
                      <div className="flex space-x-2">
                        <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
                          Edit
                        </button>
                        <button className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Nuk u gjetën rezervime për kërkimin tuaj.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-white/[0.05]">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredBookings.length)} of {filteredBookings.length} entries
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 border rounded-md ${
                      currentPage === page
                        ? "bg-brand-500 text-white border-brand-500"
                        : "border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentOrdersForBookings;

  