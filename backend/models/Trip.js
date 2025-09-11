// File: backend/models/Trip.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Trip = sequelize.define('Trip', {
  // NEW fields
  busName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  source: {
    type: DataTypes.STRING,
    allowNull: false
  },
  destination: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Keep the existing fields
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