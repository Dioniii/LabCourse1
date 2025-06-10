import React, { useState } from "react";

const CheckinStatus = () => {
  const checkins = [
    {
      guestName: "Ardian",
      roomNumber: 101,
      checkInDate: "2025-05-28",
      checkOutDate: "2025-05-30",
      status: "Pending Check-in",
      specialRequests: "Late arrival"
    },
    {
      guestName: "Arta",
      roomNumber: 202,
      checkInDate: "2025-05-26",
      checkOutDate: "2025-05-28",
      status: "Checked-in",
      specialRequests: "Extra pillows"
    },
  ];

  const [searchTerm, setSearchTerm] = useState("");

  const filteredCheckins = checkins.filter(
    (item) =>
      item.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.roomNumber.toString().includes(searchTerm)
  );

  // Handler for check-in/out button (frontend only)
  const handleAction = (idx: number, status: string) => {
    if (status === "Pending Check-in") {
      alert(`Checked in guest at row ${idx + 1}`);
    } else if (status === "Checked-in") {
      alert(`Checked out guest at row ${idx + 1}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
          Check-in/out Status
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Lista e klientëve që hyjnë ose dalin sot
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Kërko me emër ose numër dhome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
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
            {filteredCheckins.length > 0 ? (
              filteredCheckins.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-100 dark:hover:bg-gray-600">
                  <td className="px-3 py-2 text-gray-900 dark:text-white font-medium">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                    {item.guestName}
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                    {item.roomNumber}
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                    {item.checkInDate}
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                    {item.checkOutDate}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-block rounded-full text-xs font-semibold
                        ${
                          item.status === "Checked-in"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : item.status === "Pending Check-in"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }
                      `}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                    {item.specialRequests || '-'}
                  </td>
                  <td className="px-3 py-2">
                    {item.status === "Pending Check-in" ? (
                      <button
                        onClick={() => handleAction(idx, item.status)}
                        className="rounded bg-green-600 text-white px-4 py-1 text-xs font-medium hover:bg-green-700 transition-colors min-w-[90px]"
                      >
                        Check-in
                      </button>
                    ) : item.status === "Checked-in" ? (
                      <button
                        onClick={() => handleAction(idx, item.status)}
                        className="rounded bg-red-600 text-white px-4 py-1 text-xs font-medium hover:bg-red-700 transition-colors min-w-[90px]"
                      >
                        Check-out
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
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
