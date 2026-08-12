const BookingService = require('../services/bookingService.js');

class BookingController {
    static async adminGetAllBookings(req, res) {
        try {
            const bookings = await BookingService.adminGetAllBookings();
            res.status(200).json(bookings);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getBookingsForSeason(req, res) {
        try {
            const { seasonId } = req.params;
            const bookings = await BookingService.getBookingsForSeason(seasonId);
            res.status(200).json(bookings);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async adminCreateBooking(req, res) {
        try {
            const newBooking = await BookingService.adminCreateBooking(req.body, req.user); // Pass req.user
            res.status(201).json(newBooking);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async adminUpdateBooking(req, res) {
        try {
            const { id } = req.params;
            const updatedBooking = await BookingService.adminUpdateBooking(id, req.body);
            res.status(200).json(updatedBooking);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async adminDeleteBooking(req, res) {
        try {
            const { id } = req.params;
            const result = await BookingService.adminDeleteBooking(id);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async checkSingleSlot(req, res) {
        try {
            const result = await BookingService.checkSingleSlot(req.body);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async createBookingWithOverwrite(req, res) {
        try {
            // req.user wird von der Authentifizierungs-Middleware bereitgestellt
            const result = await BookingService.createBookingWithOverwrite(req.body, req.user);
            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = BookingController;