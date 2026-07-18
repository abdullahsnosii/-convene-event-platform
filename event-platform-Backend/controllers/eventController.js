const Event = require('../models/Event');
const Registration = require('../models/Registration');

// GET /api/events
exports.getAllEvents = async (req, res, next) => {
    try {
        const { search, category, location, date } = req.query;
        const filter = {};

        if (search) {
            filter.title = { $regex: search, $options: 'i' };
        }
        if (category) {
            filter.category = category;
        }
        if (location) {
            filter.location = location;
        }
        if (date) {
            const startOfDay = new Date(date);
            const endOfDay = new Date(date);
            endOfDay.setDate(endOfDay.getDate() + 1);
            filter.date = { $gte: startOfDay, $lt: endOfDay };
        }

        const events = await Event.find(filter).sort({ date: 1 });

        res.json({ success: true, data: events });
    } catch (err) {
        next(err);
    }
};

// POST /api/events
exports.createEvent = async (req, res, next) => {
    try {
        const { title, category, location, date, capacity, description } = req.body;

        const errors = [];
        if (!title) errors.push({ field: 'title', message: 'Title is required' });
        if (!category) errors.push({ field: 'category', message: 'Category is required' });
        if (!location) errors.push({ field: 'location', message: 'Location is required' });
        if (!date) errors.push({ field: 'date', message: 'Date is required' });
        if (!capacity || capacity <= 0) errors.push({ field: 'capacity', message: 'Capacity must be greater than 0' });

        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors });
        }

        const event = await Event.create({ title, category, location, date, capacity, description });

        res.status(201).json({ success: true, data: event });
    } catch (err) {
        next(err);
    }
};

// GET /api/events/:id
exports.getEventById = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const registrationsCount = await Registration.countDocuments({ eventId: event._id });

        res.json({ success: true, data: { ...event.toObject(), registrationsCount } });
    } catch (err) {
        next(err);
    }
};

// PUT /api/events/:id
exports.updateEvent = async (req, res, next) => {
    try {
        const { title, category, location, date, capacity, description } = req.body;

        const event = await Event.findByIdAndUpdate(
            req.params.id,
            { title, category, location, date, capacity, description },
            { new: true, runValidators: true }
        );

        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        res.json({ success: true, data: event });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/events/:id
exports.deleteEvent = async (req, res, next) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);

        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        await Registration.deleteMany({ eventId: req.params.id });

        res.json({ success: true, data: event });
    } catch (err) {
        next(err);
    }
};