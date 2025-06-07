import React, { useState } from 'react';
import { Box, Grid, Dialog } from '@mui/material';
import BookingDashboard from './BookingDashboard';
import BookingForm from './BookingForm';

const BookingManagement: React.FC = () => {
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | undefined>();

  const handleNewBooking = () => {
    setSelectedBookingId(undefined);
    setIsBookingFormOpen(true);
  };

  const handleEditBooking = (bookingId: number) => {
    setSelectedBookingId(bookingId);
    setIsBookingFormOpen(true);
  };

  const handleCloseBookingForm = () => {
    setIsBookingFormOpen(false);
    setSelectedBookingId(undefined);
  };

  const handleSaveBooking = async (bookingData: any) => {
    try {
      const url = selectedBookingId
        ? `/api/bookings/${selectedBookingId}`
        : '/api/bookings';
      const method = selectedBookingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        throw new Error('Failed to save booking');
      }

      handleCloseBookingForm();
      // Refresh the booking list
      window.location.reload();
    } catch (error) {
      console.error('Error saving booking:', error);
      // Handle error (show error message to user)
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid>
          <BookingDashboard />
        </Grid>
      </Grid>

      <Dialog
        open={isBookingFormOpen}
        onClose={handleCloseBookingForm}
        maxWidth="md"
        fullWidth
      >
        <BookingForm
          bookingId={selectedBookingId}
          onSave={handleSaveBooking}
          onCancel={handleCloseBookingForm}
        />
      </Dialog>
    </Box>
  );
};

export default BookingManagement; 