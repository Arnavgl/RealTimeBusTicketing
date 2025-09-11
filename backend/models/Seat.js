// File: backend/models/Seat.js

const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Seat = sequelize.define('Seat', {
  seatNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('available', 'held', 'sold'),
    defaultValue: 'available',
    allowNull: false
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 500.00
  }
});

module.exports = Seat;