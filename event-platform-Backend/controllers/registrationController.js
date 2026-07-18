const Event = require('../models/Event');
const Registration = require('../models/Registration');

// POST /api/events/:id/register
exports.registerAttendee = async (req, res, next) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required' });
        }

        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const registrationsCount = await Registration.countDocuments({ eventId: event._id });
        if (registrationsCount >= event.capacity) {
            return res.status(400).json({ success: false, message: 'Event is at full capacity' });
        }

        const existing = await Registration.findOne({ eventId: event._id, email });
        if (existing) {
            return res.status(400).json({ success: false, message: 'This email is already registered for this event' });
        }

        const registration = await Registration.create({ eventId: event._id, name, email });

        res.status(201).json({ success: true, data: registration });
    } catch (err) {
        next(err);
    }
};

// GET /api/events/:id/attendees
exports.getAttendees = async (req, res, next) => {
    try {
        const attendees = await Registration.find({ eventId: req.params.id }).select('name email');

        res.json({ success: true, data: attendees });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/events/:id/registrations/:registrationId
exports.cancelRegistration = async (req, res, next) => {
    try {
        const registration = await Registration.findOneAndDelete({
            _id: req.params.registrationId,
            eventId: req.params.id
        });

        if (!registration) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }

        res.json({ success: true, data: registration });
    } catch (err) {
        next(err);
    }
};
