const express = require('express');
const router = express.Router();

const eventController = require('../controllers/eventController');
const registrationController = require('../controllers/registrationController');

// Events
router.get('/', eventController.getAllEvents);
router.post('/', eventController.createEvent);
router.get('/:id', eventController.getEventById);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

// Registrations (nested under events)
router.post('/:id/register', registrationController.registerAttendee);
router.get('/:id/attendees', registrationController.getAttendees);
router.delete('/:id/registrations/:registrationId', registrationController.cancelRegistration);

module.exports = router;

