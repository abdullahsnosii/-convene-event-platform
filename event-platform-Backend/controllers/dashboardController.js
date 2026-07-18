const Event = require('../models/Event');
const Registration = require('../models/Registration');

// GET /api/dashboard
exports.getDashboardStats = async (req, res, next) => {
    try {
        const totalEvents = await Event.countDocuments();

        const upcomingEvents = await Event.countDocuments({ date: { $gte: new Date() } });

        const totalRegistrations = await Registration.countDocuments();

        const mostPopular = await Registration.aggregate([
            {
                $group: {
                    _id: '$eventId',
                    registrationsCount: { $sum: 1 }
                }
            },
            { $sort: { registrationsCount: -1 } },
            { $limit: 1 },
            {
                $lookup: {
                    from: 'events',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'event'
                }
            },
            { $unwind: '$event' },
            {
                $project: {
                    _id: 0,
                    eventId: '$event._id',
                    title: '$event.title',
                    registrationsCount: 1
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                totalEvents,
                upcomingEvents,
                totalRegistrations,
                mostPopularEvent: mostPopular[0] || null
            }
        });
    } catch (err) {
        next(err);
    }
};