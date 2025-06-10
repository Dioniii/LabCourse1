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

  const [showModal, setShowModal] = useState(false);
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutIdx, setCheckoutIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [balance, setBalance] = useState("");
  const [confirmCheckout, setConfirmCheckout] = useState(false);

  const filteredCheckins = checkins;

  // Handler for check-in/out button (frontend only)
  const handleAction = (idx: number, status: string) => {
    if (status === "Pending Check-in") {
      setModalIdx(idx);
      setShowModal(true);
    } else if (status === "Checked-in") {
      setCheckoutIdx(idx);
      setShowCheckoutModal(true);
    }
  };

  const handleModalConfirm = () => {
    setShowModal(false);
    alert(
      `Check-in confirmed for: ${filteredCheckins[modalIdx!].guestName}\nID/Passport: ${idNumber}\nPhone: ${phone}\nEmail: ${email}`
    );
    setIdNumber("");
    setPhone("");
    setEmail("");
    setModalIdx(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setIdNumber("");
    setPhone("");
    setEmail("");
    setModalIdx(null);
  };

  // Checkout modal handlers
  const handleCheckoutConfirm = () => {
    setShowCheckoutModal(false);
    alert(
      `Check-out confirmed for: ${filteredCheckins[checkoutIdx!].guestName}\nFeedback: ${feedback}\nOutstanding Balance: ${balance}\nConfirmed: ${confirmCheckout ? 'Yes' : 'No'}`
    );
    setFeedback("");
    setBalance("");
    setConfirmCheckout(false);
    setCheckoutIdx(null);
  };

  const handleCheckoutClose = () => {
    setShowCheckoutModal(false);
    setFeedback("");
    setBalance("");
    setConfirmCheckout(false);
    setCheckoutIdx(null);
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

      {/* Modal for Check-in */}
      {showModal && modalIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-sm">
          <div className="relative bg-white rounded-xl shadow-lg p-8 max-w-sm w-full">
            <button
              onClick={handleModalClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Guest Check-in Details</h3>
            <form
              onSubmit={e => { e.preventDefault(); handleModalConfirm(); }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">ID/Passport Number</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={e => setIdNumber(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 transition-colors"
                >
                  Confirm Check-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Check-out */}
      {showCheckoutModal && checkoutIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-sm">
          <div className="relative bg-white rounded-xl shadow-lg p-8 max-w-sm w-full">
            <button
              onClick={handleCheckoutClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Guest Check-out Details</h3>
            <form
              onSubmit={e => { e.preventDefault(); handleCheckoutConfirm(); }}
              className="space-y-4"
            >
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleCheckoutClose}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 transition-colors"
                >
                  Confirm Check-out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckinStatus;
