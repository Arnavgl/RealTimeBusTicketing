// File: backend/models/Trip.js

const { DataTypes } = require('sequelize');
const sequelize = require('../db'); // We're importing the connection we already made

const Trip = sequelize.define('Trip', {
  // Define the columns for the 'Trips' table
  routeName: {
    type: DataTypes.STRING,
    allowNull: false // This column cannot be empty
  },
  departureTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  arrivalTime: {
    type: DataTypes.DATE,
    allowNull: false
  }
});

module.exports = Trip;