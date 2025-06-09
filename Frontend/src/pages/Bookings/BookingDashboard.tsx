import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';
import ComponentCard from '../../components/common/ComponentCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import BookingForm from './BookingForm';

interface Booking {
  id: number;
  guestName: string;
  roomNumber: string;
  checkIn: Date;
  checkOut: Date;
  status: string;
  totalAmount: number;
}

const BookingDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bookings');
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (id: number) => {
    console.log('View details for booking:', id);
  };

  const handleEditBooking = (id: number) => {
    console.log('Edit booking:', id);
  };

  const handleExport = () => {
    console.log('Export bookings');
  };

  const handleNewBooking = () => {
    setIsFormOpen(true);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
  };

  const handleFormSave = async (bookingData: any) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      if (!response.ok) throw new Error('Failed to create booking');
      setIsFormOpen(false);
      fetchBookings();
    } catch (error) {
      console.error('Error creating booking:', error);
      // Optionally show error to user
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = booking.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <PageMeta
        title="Booking Management | Hotel Booking System"
        description="Manage hotel bookings, view booking details, and handle booking operations"
      />
      <PageBreadcrumb pageTitle="Booking Management" />
      
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Booking Management">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                  <option value="no-show">No-Show</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleNewBooking}
                  className="inline-flex items-center justify-center"
                >
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  New Booking
                </Button>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <Table className="min-w-full w-full">
                <TableHeader>
                  <TableRow>
                    <TableCell className="px-5 py-3 font-medium text-gray-500 text-start">Booking ID</TableCell>
                    <TableCell className="px-5 py-3 font-medium text-gray-500 text-start">Guest Name</TableCell>
                    <TableCell className="px-5 py-3 font-medium text-gray-500 text-start">Room</TableCell>
                    <TableCell className="px-5 py-3 font-medium text-gray-500 text-start">Check-in</TableCell>
                    <TableCell className="px-5 py-3 font-medium text-gray-500 text-start">Check-out</TableCell>
                    <TableCell className="px-5 py-3 font-medium text-gray-500 text-start">Status</TableCell>
                    <TableCell className="px-5 py-3 font-medium text-gray-500 text-start">Total Amount</TableCell>
                    <TableCell className="px-5 py-3 font-medium text-gray-500 text-start">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-start">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-start">
                        No bookings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="px-5 py-4 text-start font-medium">{booking.id}</TableCell>
                        <TableCell className="px-5 py-4 text-start">{booking.guestName}</TableCell>
                        <TableCell className="px-5 py-4 text-start">{booking.roomNumber}</TableCell>
                        <TableCell className="px-5 py-4 text-start">{format(new Date(booking.checkIn), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="px-5 py-4 text-start">{format(new Date(booking.checkOut), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="px-5 py-4 text-start">
                          <span
                            className={`px-3 py-1 inline-block rounded-full text-xs font-semibold
                              ${
                                booking.status === 'Confirmed'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : booking.status === 'Pending'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }
                            `}
                          >
                            {booking.status}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-start">${booking.totalAmount.toFixed(2)}</TableCell>
                        <TableCell className="px-5 py-4 text-start">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetails(booking.id)}
                              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEditBooking(booking.id)}
                              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </ComponentCard>
      </div>

      {/* Booking Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-2xl p-6">
            <BookingForm
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default BookingDashboard; 